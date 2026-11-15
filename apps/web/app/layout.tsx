import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Bulwark", description: "Always-on security for grid software." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
