import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Predictive News Calendar — Collection & Retention Jawa Barat",
  description:
    "Dashboard kalender prediktif berita relevan untuk tim Collection & Retention telekomunikasi wilayah Jawa Barat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

