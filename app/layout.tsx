import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podcast RAG Studio",
  description: "Upload transcripts and query them with RAG"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
