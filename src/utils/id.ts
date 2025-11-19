const KEY = "device_id";
export function getDeviceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      "dev_" + (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    localStorage.setItem(KEY, id);
  }
  return id;
}
