interface Env {
  ASSETS: Fetcher;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname !== "/") {
      return env.ASSETS.fetch(request);
    }

    const indexRequest = new Request(new URL("/index.html", request.url), request);
    const response = await env.ASSETS.fetch(indexRequest);
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "cache-control": "no-store, max-age=0",
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
};

export default worker;
