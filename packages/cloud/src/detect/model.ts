import type { Detection, FileInput } from "./types.js";

/** Bulwark detection model on a Render private service. Off until MODEL_URL is set. */
export async function modelDetect(files: FileInput[]): Promise<Detection[]> {
  const url = process.env.MODEL_URL;
  if (!url) return [];
  const res = await fetch(`${url}/v1/detect`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`model ${res.status}`);
  return (await res.json()) as Detection[];
}
