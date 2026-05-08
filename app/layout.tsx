import "./globals.css";

export const metadata = {
  title: "Weather App",
  description: "Current weather and AI advice",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Weather Board",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
