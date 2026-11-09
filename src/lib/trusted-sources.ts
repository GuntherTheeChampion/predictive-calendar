/** Portal berita yang dianggap tepercaya. Sumber di luar daftar ini dibuang oleh Relevance Engine. */
export const TRUSTED_SOURCES = [
  "kompas",
  "detik",
  "detikjabar",
  "pikiran rakyat",
  "tribun jabar",
  "antara",
  "antara jabar",
  "cnn indonesia",
  "bisnis.com",
  "bisnis indonesia",
  "kontan",
  "tempo",
  "republika",
  "cnbc indonesia",
  "liputan6",
  "tirto",
  "katadata",
  "kumparan",
  "mediaindonesia",
  "media indonesia",
  "okezone",
  "suara.com",
  "jpnn",
];

export function isTrustedSource(source: string): boolean {
  const s = source.trim().toLowerCase();
  return TRUSTED_SOURCES.some((t) => s === t || s.includes(t));
}

