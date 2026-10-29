const CACHE = "still-media-v1";
const LIMIT = 100 * 1024 * 1024;
export type Saved = { url: string; bytes: number; name: string; at: number };
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("still-offline", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("media", { keyPath: "url" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saved(): Promise<Saved[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("media");
    const r = t.objectStore("media").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => d.close();
  });
}
async function record(value: Saved | string) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const t = d.transaction("media", "readwrite");
    if (typeof value === "string") t.objectStore("media").delete(value);
    else t.objectStore("media").put(value);
    t.oncomplete = () => {
      d.close();
      resolve();
    };
    t.onerror = () => {
      d.close();
      reject(t.error);
    };
  });
}
export async function saveMedia(url: string, name: string) {
  if (!("caches" in window))
    throw new Error("이 브라우저에서는 오프라인 저장을 지원하지 않습니다.");
  if (!/^\/(media|audio)\/[\w.-]+$/.test(url))
    throw new Error("지원하지 않는 파일입니다.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("파일을 저장하지 못했습니다.");
  const bytes = (await response.clone().blob()).size;
  const entries = await saved();
  const used = entries
    .filter((x) => x.url !== url)
    .reduce((s, x) => s + x.bytes, 0);
  if (used + bytes > LIMIT)
    throw new Error(
      "저장 한도 100 MB를 초과합니다. 저장한 파일을 지워 주세요.",
    );
  const cache = await caches.open(CACHE);
  await cache.put(url, response);
  try {
    await record({ url, name, bytes, at: Date.now() });
  } catch (e) {
    await cache.delete(url);
    throw e;
  }
}
export async function removeMedia(url: string) {
  await (await caches.open(CACHE)).delete(url);
  await record(url);
}
export async function clearMedia() {
  await caches.delete(CACHE);
  const entries = await saved();
  for (const e of entries) await record(e.url);
}
