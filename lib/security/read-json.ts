/*
 * Reads a JSON request body with the same rules as app/api/contact/route.ts: JSON content type,
 * a byte limit enforced on what actually arrived (Content-Length is optional), and a parse that
 * never throws. PURE (Web Request only): unit-tested.
 */

export type JsonBody = { ok: true; body: unknown } | { ok: false; status: number; message: string };

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  const declared = request.headers.get("content-length");
  if (declared) {
    const bytes = Number(declared);
    if (!Number.isFinite(bytes) || bytes < 0) return { ok: false, status: 400, message: "Invalid request." };
    if (bytes > maxBytes) return { ok: false, status: 413, message: "Request is too large." };
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, message: "Unsupported content type." };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  if (new TextEncoder().encode(raw).byteLength > maxBytes) return { ok: false, status: 413, message: "Request is too large." };

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, message: "Invalid request." };
  }
}
