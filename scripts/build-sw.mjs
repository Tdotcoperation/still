import fs from "node:fs/promises";
import crypto from "node:crypto";
const files = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/fonts/wanted-sans.woff2",
];
for (const name of await fs.readdir("dist/assets"))
  if (/\.(js|css)$/.test(name)) files.push(`/assets/${name}`);
const version = crypto
  .createHash("sha256")
  .update(await fs.readFile("dist/index.html"))
  .digest("hex")
  .slice(0, 12);
await fs.writeFile(
  "dist/sw.js",
  `const SHELL='still-shell-${version}';const MEDIA='still-media-v1';const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('still-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
if(u.pathname.startsWith('/media/')||u.pathname.startsWith('/audio/')){e.respondWith(caches.open(MEDIA).then(async c=>{const hit=await c.match(r.url);return hit||fetch(r)}));return}
if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.open(SHELL).then(c=>c.match('/index.html'))));return}
e.respondWith(caches.open(SHELL).then(async c=>(await c.match(r,{ignoreVary:true}))||fetch(r)));
});`,
);
console.log(
  `Offline shell ${version}: ${files.length} files; media is opt-in only.`,
);
