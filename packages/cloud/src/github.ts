import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(body: string, header: string | undefined, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
