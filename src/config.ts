export const PAID_AI_LINK = "https://buy.stripe.com/your_payment_link"; // ← あとで差し替え

// Googleフォームのお問い合わせURL
// 実際のGoogleフォームURLに置き換えてください
export const CONTACT_FORM_URL = "https://forms.gle/YOUR_FORM_ID"; // ← Googleフォームを作成後、このURLを置き換えてください

export const CONFIG = {
  // 後で本番のURLに差し替え（今は空ならモック運用）
  createCheckoutUrl: "", // 例: https://<supabase>.functions.supabase.co/create_checkout
  getStatusUrl: "", // 例: https://<supabase>.functions.supabase.co/get_status
  inferUrl: "", // 例: https://<supabase>.functions.supabase.co/infer
};
