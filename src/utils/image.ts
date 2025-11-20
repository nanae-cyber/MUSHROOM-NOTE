// src/utils/image.ts
// HEIC/HEIF を heic2any で JPEG 化し、長辺 maxSize へリサイズして返す
import heic2any from "heic2any";
import exifr from "exifr";

export interface ExifData {
  dateTime?: Date;
  gps?: {
    lat: number;
    lon: number;
  };
}

/** 入力画像を JPEG Blob に統一して返す（HEIC/PNG等にも対応） */
export async function normalizeImageToJpeg(
  input: Blob,
  maxSize = 1600,
  quality = 0.9
): Promise<Blob> {
  let jpegBlob = input;

  // 1) HEIC/HEIF は heic2any で JPEG に変換
  const mt = (input.type || "").toLowerCase();
  if (mt.includes("heic") || mt.includes("heif")) {
    try {
      const out = await heic2any({
        blob: input as any,
        toType: "image/jpeg",
        quality,
      });
      // heic2any は Blob or Blob[] を返す可能性
      jpegBlob = Array.isArray(out) ? (out[0] as Blob) : (out as Blob);
    } catch (e) {
      console.warn("[normalize] HEIC変換に失敗 → 元のまま続行", e);
      // 続行（後段の <img> 読み込みで失敗したら input を返す）
      jpegBlob = input;
    }
  }

  // 2) <img> → canvas でリサイズ（iOSでも安定）
  const url = URL.createObjectURL(jpegBlob);
  try {
    const img = await loadImage(url);
    const { w, h } = fit(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxSize
    );

    // サイズが十分小さければそのまま返す
    if (
      Math.max(w, h) === Math.max(img.width, img.height) &&
      mt.includes("jpeg")
    ) {
      return jpegBlob;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D context not available");
    ctx.drawImage(img, 0, 0, w, h);

    const out: Blob = await new Promise((res, rej) =>
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      )
    );
    return out;
  } catch (e) {
    console.warn("[normalize] リサイズ失敗 → 変換後そのまま返す", e);
    return jpegBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function fit(w: number, h: number, max: number) {
  if (!w || !h) return { w: max, h: max };
  if (Math.max(w, h) <= max) return { w, h };
  const r = w > h ? max / w : max / h;
  return { w: Math.round(w * r), h: Math.round(h * r) };
}


/**
 * 画像からEXIF情報を抽出
 */
export async function extractExifData(blob: Blob): Promise<ExifData> {
  try {
    const exif = await exifr.parse(blob, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'latitude', 'longitude'],
    });
    
    if (!exif) {
      return {};
    }
    
    const result: ExifData = {};
    
    // 撮影日時を取得（優先順位: DateTimeOriginal > CreateDate > ModifyDate）
    const dateTime = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
    if (dateTime instanceof Date) {
      result.dateTime = dateTime;
    }
    
    // GPS座標を取得
    if (exif.latitude && exif.longitude) {
      result.gps = {
        lat: exif.latitude,
        lon: exif.longitude,
      };
    }
    
    return result;
  } catch (err) {
    console.warn('[EXIF] Failed to extract EXIF data:', err);
    return {};
  }
}
