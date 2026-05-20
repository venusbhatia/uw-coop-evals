const MAX_FILENAME_LENGTH = 120;

export function sanitizeFilename(name: string, fallback = "evaluation"): string {
  const base = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);

  return base || fallback;
}
