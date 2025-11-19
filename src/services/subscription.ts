import { CONFIG } from "../config";
import { getDeviceId } from "../utils/id";

// 開発用：localStorage.setItem('forceActive','1') でサブスク有効扱い
function isForcedActive() {
  return (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("forceActive") === "1"
  );
}

export async function getSubscriptionStatus(): Promise<
  "active" | "inactive" | "past_due" | "canceled"
> {
  if (isForcedActive()) return "active";
  if (!CONFIG.getStatusUrl) return "inactive";
  const r = await fetch(CONFIG.getStatusUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: getDeviceId() }),
  });
  if (!r.ok) return "inactive";
  const { status } = await r.json();
  return status ?? "inactive";
}

export async function startCheckout(email?: string) {
  if (!CONFIG.createCheckoutUrl) {
    alert("Checkoutエンドポイント未設定です（審査後に差し替え）");
    return "#";
  }
  const r = await fetch(CONFIG.createCheckoutUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: getDeviceId(), email }),
  });
  if (!r.ok) throw new Error(await r.text());
  const { url } = await r.json();
  return url as string;
}
