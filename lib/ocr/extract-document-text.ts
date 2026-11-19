export interface ExtractionResult {
  text: string;
  spatialText: string;
  pageCount: number;
}

export function formatSpatialLines(
  lines: { text: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }[]
): string {
  const clean = lines
    .map((l) => ({
      text: l.text.trim().replace(/[ \t]{2,}/g, " "),
      x: Math.round(l.bbox?.x0 ?? 0),
      y: Math.round(l.bbox?.y0 ?? 0),
    }))
    .filter((l) => l.text.length > 1 && /[a-z0-9]/i.test(l.text));

  clean.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 10) return yDiff;
    return a.x - b.x;
  });

  return clean.map((l) => `[y: ${l.y}, x: ${l.x}] ${l.text}`).join("\n");
}

export function tidyExtractedText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 1 && /[a-z0-9]/i.test(line))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
