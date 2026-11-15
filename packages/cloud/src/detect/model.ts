import type { Detection, Detector, FileInput } from "./types.js";

/**
 * Placeholder for Bulwark detection models hosted on Render (private service
 * at MODEL_URL). Disabled until MODEL_URL is set.
 */
export const modelDetector: Detector = {
  name: "bulwark-model",
  version: "0.0.0",
  async detect(files: FileInput[]): Promise<Detection[]> {
    const url = process.env.MODEL_URL;
    if (!url) return [];
    const res = await fetch(`${url}/v1/detect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error(`model ${res.status}`);
    return (await res.json()) as Detection[];
  },
};
