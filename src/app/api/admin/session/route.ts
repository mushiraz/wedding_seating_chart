import { ADMIN_COOKIE, adminToken, keyMatches } from "@/lib/photoStore";

const cookie = (value: string, maxAge: number) =>
  `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

/** Sign in with the admin key; the cookie holds a hash of it for two days. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const token = await adminToken();
  if (!token) return Response.json({ error: "No admin key is set on the server." }, { status: 503 });
  if (typeof body?.key !== "string" || !(await keyMatches(body.key))) {
    return Response.json({ error: "Wrong key." }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { "set-cookie": cookie(token, 60 * 60 * 48) } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "set-cookie": cookie("", 0) } });
}
