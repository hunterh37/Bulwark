import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|f[cd]|fe80:|::ffff:)/i;

/** Accepts https URLs that resolve to public addresses only, so an alert cannot reach internal services. */
export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let u: URL;
  try { u = new URL(raw); } catch { return "not a URL"; }
  if (u.protocol !== "https:") return "https required";
  if (u.username || u.password) return "credentials in URL not allowed";
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return "host name required";
  try {
    const addrs = await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => PRIVATE.test(a.address))) return "host resolves to a private address";
  } catch { return "host does not resolve"; }
  return null;
}

/** Posts {text} (Slack, Mattermost and Teams workflow webhooks accept it). */
export async function sendAlert(url: string, text: string): Promise<boolean> {
  if (await checkWebhookUrl(url)) return false;
  try {
    const res = await fetch(url, { method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    return res.ok;
  } catch { return false; }
}
