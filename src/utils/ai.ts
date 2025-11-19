console.log("[ENV] has gemini key?", !!import.meta.env.VITE_GEMINI_API_KEY);
// src/utils/ai.ts
// 画像からAI判定（Gemini 1.5 Flash） or モックにフォールバック
type Candidate = { name: string; confidence: number; rationale?: string };

async function blobToBase64Webp(
  blob: Blob,
  maxSide = 1024,
  quality = 0.9
): Promise<string> {
  // 送信量を抑えるため一旦WebPに縮小してBase64へ
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    const r = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * r);
    const h = Math.round(img.height * r);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    ctx.drawImage(img, 0, 0, w, h);
    const b64 = await new Promise<string>((res, rej) =>
      canvas.toBlob(
        (b) => {
          if (!b) return rej(new Error("toBlob failed"));
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result).split(",")[1]!);
          fr.onerror = rej;
          fr.readAsDataURL(b);
        },
        "image/webp",
        quality
      )
    );
    return b64;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function identifyWithGemini(image: Blob): Promise<Candidate[]> {
  const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!KEY) throw new Error("NO_KEY");
  const b64 = await blobToBase64Webp(image);

  const body = {
    contents: [
      {
        parts: [
          {
            text: "You are a mushroom identification assistant. Given an image, output top 3 likely species (Japanese common name if known, else scientific), each with confidence 0-1 and one-sentence rationale in Japanese. Return JSON array with fields: name, confidence, rationale. Keep it concise.",
          },
          { inline_data: { mime_type: "image/webp", data: b64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  };

  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const data = await resp.json();

  // レスポンスからJSONを抽出（モデルはしばしばテキストで返す）
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ??
    "";
  // JSON 部分だけを頑張って取り出す
  const match = text.match(/\[[\s\S]*\]/);
  const json = match ? match[0] : text;
  const arr = JSON.parse(json) as Candidate[];
  // 安全のため整形
  return arr
    .filter((x) => x && typeof x.name === "string")
    .map((x) => ({
      name: x.name,
      confidence: Number(x.confidence) || 0,
      rationale: x.rationale?.slice(0, 120),
    }));
}

function mockIdentify(): Candidate[] {
  return [
    {
      name: "ベニタケ属（Russula sp.）",
      confidence: 0.62,
      rationale: "赤系の傘・脆い肉質に見えるため",
    },
    {
      name: "テングタケ（Amanita pantherina 近縁）",
      confidence: 0.21,
      rationale: "傘の斑点と環・つぼ痕が示唆",
    },
    {
      name: "キツネタケ（Laccaria laccata）",
      confidence: 0.17,
      rationale: "薄橙～褐色の小型傘の特徴",
    },
  ];
}

export async function identifyMushroom(image: Blob): Promise<Candidate[]> {
  try {
    return await identifyWithGemini(image);
  } catch (e) {
    console.warn("[AI] fallback to mock because:", e);
    return mockIdentify();
  }
}
