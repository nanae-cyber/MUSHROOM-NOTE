import { db } from "../utils/db";
import { runLocalAIForSpecimen } from "../utils/ai";

function safeUUID(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(
      ""
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function saveSpecimenDraft({
  photoBlob,
  meta,
  mode,
}: {
  photoBlob: Blob;
  meta: any;
  mode: "quick" | "detail";
}) {
  const id = safeUUID();
  const specimen = {
    id,
    createdAt: Date.now(),
    quickMode: mode === "quick",
    ...meta,
  };
  await db.specimens.add(specimen as any);
  const photoId = safeUUID();
  const blobRef = await db.saveBlob(photoBlob);
  await db.photos.add({
    id: photoId,
    specimenId: id,
    view: meta.view ?? "cap",
    blobRef,
    createdAt: Date.now(),
  } as any);

  try {
    await runLocalAIForSpecimen(id);
  } catch {}
  return id;
}
