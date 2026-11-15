import { createHmac, timingSafeEqual } from "node:crypto";
import type { FileInput } from "./detect/types.js";

export function verifySignature(body: string, header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export const TEXT_FILE = /\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|kt|cs|c|h|cpp|hpp|rb|php|sh|ya?ml|json|toml|ini|cfg|conf|env|xml|st|scl|properties|tf)$|(^|\/)(Dockerfile|\.env[^/]*)$/i;
export const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|\.git|\.next|target)\//;
const MAX_FILES = 400;

async function gh(path: string, token?: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "bulwark",
      ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`github ${path} ${res.status}`);
  return res.json() as Promise<any>;
}

export async function ghUser(token: string) {
  return (await gh("/user", token)) as { login: string };
}

export async function ghRepos(token: string) {
  const rows = (await gh("/user/repos?per_page=100&sort=pushed", token)) as any[];
  return rows.map((r) => ({ full_name: r.full_name as string, private: !!r.private }));
}

/** Fetches scannable text files of a repo at a ref through the GitHub API. */
export async function fetchRepoFiles(repo: string, ref: string | undefined, token?: string) {
  const meta = await gh(`/repos/${repo}`, token);
  const commit = await gh(`/repos/${repo}/commits/${ref ?? meta.default_branch}`, token);
  const tree = await gh(`/repos/${repo}/git/trees/${commit.sha}?recursive=1`, token);
  const paths: string[] = tree.tree
    .filter((t: any) => t.type === "blob" && t.size < 200_000 && TEXT_FILE.test(t.path) && !SKIP_DIR.test(t.path))
    .slice(0, MAX_FILES).map((t: any) => t.path);
  const files: FileInput[] = [];
  for (let i = 0; i < paths.length; i += 16) {
    const batch = await Promise.all(paths.slice(i, i + 16).map(async (p) => {
      const url = meta.private
        ? `https://api.github.com/repos/${repo}/contents/${encodeURI(p)}?ref=${commit.sha}`
        : `https://raw.githubusercontent.com/${repo}/${commit.sha}/${encodeURI(p)}`;
      const res = await fetch(url, { headers: { "user-agent": "bulwark", accept: "application/vnd.github.raw",
        ...(token && meta.private ? { authorization: `Bearer ${token}` } : {}) } });
      return res.ok ? { path: p, content: await res.text() } : null;
    }));
    files.push(...(batch.filter(Boolean) as FileInput[]));
  }
  return { commit: commit.sha as string, files };
}
