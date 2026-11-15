import { createHmac, timingSafeEqual } from "node:crypto";
import type { FileInput } from "./detect/types.js";

export function verifySignature(body: string, header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export const TEXT_FILE = /\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|kt|cs|c|h|cpp|hpp|rb|php|sh|ya?ml|json|toml|ini|cfg|conf|env|xml|st|scl|properties|tf)$|(^|\/)(Dockerfile|\.env[^/]*|requirements[^/]*\.txt|go\.mod)$/i;
export const LOCKFILE = /(^|\/)(package-lock\.json|requirements[^/]*\.txt|go\.mod)$/;
/** Size cap per file: lockfiles can be large, source files are capped lower. */
export const maxSize = (path: string) => (LOCKFILE.test(path) ? 5_000_000 : 200_000);
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
    .filter((t: any) => t.type === "blob" && t.size < maxSize(t.path) && TEXT_FILE.test(t.path) && !SKIP_DIR.test(t.path))
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

async function ghWrite(method: string, path: string, token: string, body: unknown) {
  const res = await fetch(`https://api.github.com${path}`, {
    method, body: JSON.stringify(body),
    headers: { accept: "application/vnd.github+json", "user-agent": "bulwark", authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`github ${method} ${path} ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

/** Reads one file at a ref with its blob sha. */
export async function getFile(repo: string, path: string, ref: string | undefined, token?: string) {
  const f = await gh(`/repos/${repo}/contents/${encodeURI(path)}${ref ? `?ref=${ref}` : ""}`, token);
  return { content: Buffer.from(f.content, "base64").toString("utf8"), sha: f.sha as string };
}

/** Creates a branch from the default branch head, commits one file and opens a pull request. */
export async function openFixPr(repo: string, token: string, p: { path: string; content: string; branch: string; title: string; body: string }) {
  const meta = await gh(`/repos/${repo}`, token);
  const base = meta.default_branch as string;
  const head = await gh(`/repos/${repo}/git/ref/heads/${base}`, token);
  await ghWrite("POST", `/repos/${repo}/git/refs`, token, { ref: `refs/heads/${p.branch}`, sha: head.object.sha });
  const current = await getFile(repo, p.path, p.branch, token);
  await ghWrite("PUT", `/repos/${repo}/contents/${encodeURI(p.path)}`, token, {
    message: p.title, branch: p.branch, sha: current.sha, content: Buffer.from(p.content, "utf8").toString("base64"),
  });
  const pr = await ghWrite("POST", `/repos/${repo}/pulls`, token, { title: p.title, head: p.branch, base, body: p.body });
  return { url: pr.html_url as string, number: pr.number as number, base };
}
