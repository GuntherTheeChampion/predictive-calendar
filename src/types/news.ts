export type RiskCategory =
  | "ECONOMIC_SHIFT"
  | "NATURAL_DISASTER"
  | "REGIONAL_POLICY"
  | "TELECOM_COMPETITOR";

export type ImpactScore = "High" | "Medium" | "Low";

/** Berita mentah dari Google News RSS / Portal Berita / GNews sebelum disaring. */
export interface RawNewsItem {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 */
  publishedAt: string;
  source: string;
  url: string;
}

/** Berita yang lolos Relevance Engine beserta analisis AI. */
export interface ProcessedNewsItem {
  id: string;
  title: string;
  summary: string;
  /** YYYY-MM-DD (zona waktu Asia/Jakarta) */
  publishedAt: string;
  source: string;
  sourceUrl: string;
  location: string;
  category: RiskCategory;
  impactScore: ImpactScore;
  aiReasoning: string;
  actionableInsight: string;
  /** true bila berupa proyeksi musiman (bulan depan), bukan berita nyata */
  isPredicted?: boolean;
}

export type DashboardMode = "live" | "archive" | "outlook";

export type DataSourceType =
  | "google-news-rss"
  | "gnews"
  | "supabase"
  | "local-file"
  | "seasonal-model"
  | "mock";

export interface NewsMeta {
  mode: DashboardMode;
  month: string;
  /** Asal data berita mentah / arsip */
  dataSource: DataSourceType;
  /** Mesin penyaring yang dipakai */
  engine: "gemini" | "rules" | "none";
  totalFetched: number;
  discarded: number;
  /** Status penyimpanan otomatis ke database */
  dbStatus?: {
    connected: boolean;
    provider: "supabase" | "local-file";
    autoSavedCount?: number;
    error?: string;
  };
  warning?: string;
}

export interface NewsResponse {
  items: ProcessedNewsItem[];
  meta: NewsMeta;
}

export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  ECONOMIC_SHIFT: "Ekonomi & PHK",
  NATURAL_DISASTER: "Bencana Alam",
  REGIONAL_POLICY: "Kebijakan Daerah",
  TELECOM_COMPETITOR: "Kompetitor & Jaringan",
};
