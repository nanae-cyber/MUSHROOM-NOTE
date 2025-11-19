/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string; // ← 使う環境変数をここに列挙
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
