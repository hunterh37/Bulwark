/** Language-aware snippets used by rule autofixes. */
export const lang = (path: string) =>
  /\.py$/.test(path) ? "py" : /\.(js|mjs|cjs|ts|tsx|jsx)$/.test(path) ? "js" : /\.go$/.test(path) ? "go" : "other";

export function envExpr(path: string, name: string): string | null {
  switch (lang(path)) {
    case "py": return `os.environ["${name}"]`;
    case "js": return `process.env.${name}`;
    case "go": return `os.Getenv("${name}")`;
    default: return null;
  }
}

/** Import line the env expression needs, when the file lacks it. */
export function envImport(path: string, content: string): string | null {
  if (lang(path) === "py" && !/^\s*import os\b|^\s*from os import/m.test(content)) return "import os";
  return null;
}

/** Replaces the first string literal on the line that matches `inner` with an env lookup. */
export function literalToEnv(line: string, path: string, inner: RegExp, name: string): string | null {
  const expr = envExpr(path, name);
  if (!expr) return null;
  const re = new RegExp(`(["'\`])(${inner.source})\\1`);
  return re.test(line) ? line.replace(re, expr) : null;
}

/** Replaces the value literal of a `password = "..."` style assignment with an env lookup. */
export function credentialToEnv(line: string, path: string, values: RegExp, name: string): string | null {
  const expr = envExpr(path, name);
  if (!expr) return null;
  const re = new RegExp(`((?:password|passwd|pwd)["']?\\s*(?::=|[:=])\\s*)(["'\`])(?:${values.source})\\2`, "i");
  return re.test(line) ? line.replace(re, `$1${expr}`) : null;
}
