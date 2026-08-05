import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tic Attack Toe",
  description: "Battle with anything you can imagine",
  other: {
    'viewport': 'width=device-width, initial-scale=1, viewport-fit=cover',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
