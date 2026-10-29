export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/r2/")) {
      if (!["GET", "HEAD"].includes(request.method))
        return new Response("Method not allowed", { status: 405 });
      if (!env.MEDIA)
        return new Response("R2 is not configured", { status: 503 });
      const key = decodeURIComponent(url.pathname.slice(4));
      if (!/^(originals|media|audio)\/[a-zA-Z0-9_.-]+$/.test(key))
        return new Response("Not found", { status: 404 });
      const object = await env.MEDIA.get(key, { range: request.headers });
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public,max-age=86400");
      headers.set("x-content-type-options", "nosniff");
      headers.set("accept-ranges", "bytes");
      let status = 200;
      if (object.range) {
        const { offset = 0, length } = object.range;
        headers.set(
          "content-range",
          `bytes ${offset}-${offset + length - 1}/${object.size}`,
        );
        headers.set("content-length", String(length));
        status = 206;
      }
      return new Response(request.method === "HEAD" ? null : object.body, {
        status,
        headers,
      });
    }
    return env.ASSETS.fetch(request);
  },
};
