import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Predictive News Calendar",
  description: "Dashboard kalender analisis dan pemantauan berita wilayah.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
