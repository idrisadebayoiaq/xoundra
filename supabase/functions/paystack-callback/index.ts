import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

Deno.serve((req) => {
  const url = new URL(req.url);
  const reference = escapeHtml(url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "");
  const html = `<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Xoundra</title></head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#101725;color:#F3F6F8;font-family:sans-serif">
    <main style="max-width:28rem;padding:2rem">
      <h1 style="font-weight:500">Payment received</h1>
      <p>Xoundra is confirming this payment. You can return to the app.</p>
      <p style="color:#8BE1CF">${reference}</p>
    </main>
  </body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
});
