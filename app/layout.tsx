import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FlowProof — Follow the evidence",
  description:
    "From a suspicious water reading to the next useful check. An evidence-first investigation workspace.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
