console.log("[ENV] has gemini key?", !!import.meta.env.VITE_GEMINI_API_KEY);
// src/utils/ai.ts
// 画像からAI判定（Gemini 2.0 Flash / 1.5 Flash） or モックにフォールバック
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

  console.log("[AI] Converting image to base64...");
  const b64 = await blobToBase64Webp(image);
  console.log("[AI] Image converted, base64 length:", b64.length);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `あなたは日本のきのこ識別の専門家です。画像を分析して、最も可能性の高いきのこの種類を3つ挙げてください。

以下の形式でJSON配列として回答してください：
[
  {
    "name": "日本語の一般名（学名）",
    "confidence": 0.0〜1.0の信頼度,
    "rationale": "判定理由（傘の色、形状、ひだの特徴など）"
  }
]

重要な観察ポイント：
- 傘の色、形状、大きさ
- ひだ（管孔）の色と配置
- 柄の特徴（中空/中実、つば、つぼの有無）
- 生育環境（地面、木、倒木など）
- 季節や地域の特徴

必ずJSON配列のみを返してください。説明文は不要です。`,
          },
          { inline_data: { mime_type: "image/webp", data: b64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
    },
  };

  console.log("[AI] Sending request to Gemini API...");
  console.log("[AI] API Key (first 10 chars):", KEY.substring(0, 10) + "...");
  console.log("[AI] API Key length:", KEY.length);

  // 利用可能なモデルのリストから動的に取得
  let modelConfigs: Array<{ version: string; model: string }> = [];
  
  // まず利用可能なモデルを取得
  try {
    const listResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`
    );
    
    if (listResp.ok) {
      const listData = await listResp.json();
      const availableModels = listData.models || [];
      
      console.log("[AI] Available models from API:", availableModels.map((m: any) => m.name));
      
      // generateContent をサポートするモデルのみフィルタ
      const supportedModels = availableModels.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      console.log("[AI] Models supporting generateContent:", supportedModels.map((m: any) => m.name));
      
      // モデル名から設定を作成（models/プレフィックスを除去）
      modelConfigs = supportedModels
        .map((m: any) => {
          const fullName = m.name; // "models/gemini-1.5-flash" 形式
          const modelName = fullName.replace('models/', '');
          return { version: "v1beta", model: modelName };
        })
        .filter((c: any) => c.model.includes('flash') || c.model.includes('pro')); // flashまたはproモデルのみ
      
      console.log("[AI] Will try these models:", modelConfigs);
    }
  } catch (e) {
    console.warn("[AI] Could not fetch model list, using fallback models:", e);
  }
  
  // フォールバック: モデルリストが取得できなかった場合
  if (modelConfigs.length === 0) {
    console.log("[AI] Using fallback model list");
    modelConfigs = [
      { version: "v1beta", model: "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-1.5-pro" },
      { version: "v1", model: "gemini-1.5-flash" },
    ];
  }

  let lastError: Error | null = null;

  for (const config of modelConfigs) {
    try {
      console.log(`[AI] Trying ${config.version}/models/${config.model}`);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      console.log("[AI] Response status:", resp.status);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(
          `[AI] ${config.version}/models/${config.model} failed:`,
          errorText
        );
        lastError = new Error(`HTTP ${resp.status}: ${errorText}`);
        continue; // 次のモデルを試す
      }

      const data = await resp.json();
      console.log("[AI] API response data:", data);

      // レスポンスからJSONを抽出（モデルはしばしばテキストで返す）
      const text: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .join("\n") ?? "";

      console.log("[AI] Extracted text:", text);

      // JSON 部分だけを頑張って取り出す
      const match = text.match(/\[[\s\S]*\]/);
      const json = match ? match[0] : text;

      console.log("[AI] Parsed JSON string:", json);

      const arr = JSON.parse(json) as Candidate[];

      // 安全のため整形
      const result = arr
        .filter((x) => x && typeof x.name === "string")
        .map((x) => ({
          name: x.name,
          confidence: Number(x.confidence) || 0,
          rationale: x.rationale?.slice(0, 120),
        }));

      console.log(
        `[AI] Success with ${config.version}/models/${config.model}:`,
        result
      );
      return result;
    } catch (e) {
      console.error(
        `[AI] Error with ${config.version}/models/${config.model}:`,
        e
      );
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // すべてのモデルで失敗した場合
  throw lastError || new Error("All models failed");
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
    console.log("[AI] Attempting Gemini API call...");
    console.log("[AI] Image size:", image.size, "bytes, type:", image.type);

    // APIキーの確認
    const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!KEY) {
      throw new Error(
        "Gemini APIキーが設定されていません。.envファイルにVITE_GEMINI_API_KEYを設定してください。"
      );
    }
    console.log("[AI] API key found, length:", KEY.length);

    const result = await identifyWithGemini(image);
    console.log("[AI] Gemini API success:", result);
    return result;
  } catch (e) {
    console.error("[AI] Gemini API failed, fallback to mock:", e);
    if (e instanceof Error) {
      console.error("[AI] Error name:", e.name);
      console.error("[AI] Error message:", e.message);
      console.error("[AI] Error stack:", e.stack);
    }

    // エラーメッセージを分かりやすく
    let errorMsg = "AI判定に失敗しました。";
    if (e instanceof Error) {
      if (
        e.message.includes("NO_KEY") ||
        e.message.includes("APIキーが設定されていません")
      ) {
        errorMsg +=
          "\n\nGemini APIキーが設定されていません。\n設定方法: docs/GEMINI_API_SETUP.md を参照してください。";
      } else if (e.message.includes("HTTP 404")) {
        errorMsg +=
          "\n\nモデルが見つかりません。\n\n詳細: " + e.message + "\n\nブラウザのコンソール（F12キー）で詳細なログを確認してください。";
      } else if (e.message.includes("HTTP 403")) {
        errorMsg += "\n\nAPIキーが無効です。正しいキーを設定してください。";
      } else if (e.message.includes("HTTP 429")) {
        errorMsg +=
          "\n\nAPIの利用制限に達しました。しばらく待ってから再試行してください。";
      } else {
        errorMsg += `\n\nエラー詳細: ${e.message}\n\nブラウザのコンソール（F12キー）で「[AI]」で始まるログを確認してください。`;
      }
    }
    errorMsg += "\n\nモック応答を表示します。";

    alert(errorMsg);
    return mockIdentify();
  }
}
