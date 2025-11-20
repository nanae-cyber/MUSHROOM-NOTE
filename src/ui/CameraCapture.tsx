import React, { useEffect, useRef, useState } from "react";
import { add } from "../utils/db";
import { normalizeImageToJpeg, extractExifData } from "../utils/image";

type SourceType = "camera" | "library";

async function getPosition(timeoutMs = 4000) {
  // 位置は失敗しても保存は続行する
  if (!("geolocation" in navigator)) return {};
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) resolve({});
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        done = true;
        clearTimeout(timer);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      () => {
        done = true;
        clearTimeout(timer);
        resolve({});
      },
      { enableHighAccuracy: true, timeout: timeoutMs }
    );
  });
}
async function getHeading(timeoutMs = 1500) {
  // iOS等で許可が必要。失敗したら undefined を返す
  return new Promise<number | undefined>((resolve) => {
    let done = false;
    const handler = (ev: DeviceOrientationEvent) => {
      if (done) return;
      const h =
        typeof (ev as any).webkitCompassHeading === "number"
          ? 360 - (ev as any).webkitCompassHeading
          : typeof ev.alpha === "number"
          ? ev.alpha
          : undefined;
      done = true;
      window.removeEventListener("deviceorientation", handler as any);
      resolve(
        typeof h === "number" ? Math.round(((h % 360) + 360) % 360) : undefined
      );
    };
    window.addEventListener("deviceorientation", handler as any, {
      once: true,
    });
    setTimeout(() => {
      if (!done) {
        done = true;
        window.removeEventListener("deviceorientation", handler as any);
        resolve(undefined);
      }
    }, timeoutMs);
  });
}

export default function CameraCapture({ mode }: { mode?: "camera" | "album" | null }) {
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const open = () => libRef.current?.click();
    window.addEventListener("openLibraryPicker", open as any);
    return () => window.removeEventListener("openLibraryPicker", open as any);
  }, []);

  // モードに応じて自動的にカメラまたはアルバムを開く
  useEffect(() => {
    if (mode === "camera" && camRef.current) {
      console.log("[CameraCapture] カメラモード: input要素をクリックします");
      // レンダリング完了を待ってクリック
      const timer = setTimeout(() => {
        console.log("[CameraCapture] カメラinput要素:", camRef.current);
        if (camRef.current) {
          camRef.current.click();
          console.log("[CameraCapture] カメラinput.click() 実行完了");
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (mode === "album" && libRef.current) {
      console.log("[CameraCapture] アルバムモード: input要素をクリックします");
      // レンダリング完了を待ってクリック
      const timer = setTimeout(() => {
        console.log("[CameraCapture] アルバムinput要素:", libRef.current);
        if (libRef.current) {
          libRef.current.click();
          console.log("[CameraCapture] アルバムinput.click() 実行完了");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handlePick = async (file: File, source: SourceType) => {
    // input要素をすぐにリセット（2回目以降も動作するように）
    if (camRef.current) camRef.current.value = "";
    if (libRef.current) libRef.current.value = "";
    
    try {
      setBusy(true);

      // 入力情報をロギング（型/サイズ）
      console.log("📸 input:", file.type, Math.round(file.size / 1024), "KB");

      // ① JPEG変換＆リサイズ（HEIC等でもOKにする）
      let jpeg = await normalizeImageToJpeg(file, 1400, 0.85);
      console.log(
        "📸 after normalize:",
        (jpeg as any).type,
        Math.round(jpeg.size / 1024),
        "KB"
      );

      // 大きすぎる場合はもう一段圧縮（iOS Safari の IndexedDB 制限対策）
      if (jpeg.size > 4 * 1024 * 1024) {
        try {
          jpeg = await normalizeImageToJpeg(jpeg, 1280, 0.8);
          console.log(
            "📸 after downscale:",
            (jpeg as any).type,
            Math.round(jpeg.size / 1024),
            "KB"
          );
        } catch {}
      }

      // ② EXIF情報を抽出
      const exifData = await extractExifData(file);
      console.log("📸 EXIF data:", exifData);

      // ③ 位置・方位（取れなくても続行）
      const [pos, heading] = await Promise.all([
        getPosition(),
        getHeading(),
      ]);
      
      // EXIF GPSがあればそれを優先、なければ現在位置
      const gps = exifData.gps || (pos as any);
      
      // EXIF撮影日時があればそれを使用、なければ現在時刻
      const capturedAt = exifData.dateTime ? exifData.dateTime.getTime() : Date.now();

      // ④ 保存（★firstPhoto は jpeg を渡す）
      const id = await add({
        firstPhoto: jpeg,
        view: "cap",
        meta: { 
          gps: gps.lat && gps.lon ? { lat: gps.lat, lon: gps.lon } : undefined,
          heading, 
          capturedAt, 
          source 
        },
      });

      // ⑤ 成功モーダルを表示
      setSavedId(id);
      setShowSuccessModal(true);
      setBusy(false);
    } catch (e: any) {
      const name = e?.name ?? "Error";
      const msg = e?.message ?? String(e);
      console.error("❌ 保存エラー", { name, msg, e });
      alert(
        `保存に失敗: ${name} / ${msg}\n\n対処例: 1) 画像サイズを小さくする 2) プライベートブラウズをOFF 3) ストレージ空き容量を確保`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* カメラ（iPhoneはカメラ起動、PCはファイル選択になることあり） */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePick(f, "camera");
        }}
        style={{ 
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />

      {/* アルバム（複数選択可能） */}
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;
          
          // 複数ファイルを順番に処理
          for (const f of files) {
            await handlePick(f, "library");
          }
        }}
        style={{ 
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />
      
      {busy && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: 8,
          zIndex: 1000,
          fontSize: 16,
          fontWeight: 600,
        }}>
          保存中…
        </div>
      )}
      
      {/* 登録成功モーダル */}
      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1001,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 400,
              width: "100%",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              登録完了！
            </div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
              きのこの記録を保存しました
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  location.reload();
                }}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📖 図鑑に戻る
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // DetailFormを開く（App.tsxのイベントを発火）
                  const event = new CustomEvent('open-detail-form', { detail: { id: savedId } });
                  window.dispatchEvent(event);
                }}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#333",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⚙️ 詳細設定に行く
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
