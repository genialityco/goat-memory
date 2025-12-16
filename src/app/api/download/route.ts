import { NextRequest } from "next/server";

function isHttpUrl(url: URL) {
  return url.protocol === "https:" || url.protocol === "http:";
}

// Opcional: bloquear hosts locales
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new Response("Missing param 'u'", { status: 400 });

  let target: URL;
  try {
    const decoded = decodeURIComponent(u);
    const raw = Buffer.from(decoded, "base64").toString("utf8");
    target = new URL(raw);
  } catch {
    return new Response("Invalid URL encoding", { status: 400 });
  }

  if (!isHttpUrl(target)) {
    return new Response("Only http/https allowed", { status: 400 });
  }
  if (BLOCKED_HOSTS.has(target.hostname)) {
    return new Response("Forbidden host", { status: 400 });
  }

  // Descarga desde el origen
  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("Failed to fetch source", { status: 502 });
  }

  // Intenta determinar nombre
  let filename =
    target.pathname.split("/").pop() || `download-${Date.now()}`;
  if (!filename.endsWith(".mp4")) {
    filename += ".mp4";
  }
  const cd = upstream.headers.get("content-disposition");
  const match =
    cd && cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)\"?/i);
  if (match && match[1]) {
    filename = match[1];
  }

  const headers = new Headers();
  headers.set(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "application/octet-stream"
  );
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  // Reenvía el stream
  return new Response(upstream.body, { headers, status: 200 });
}
