import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://roses.mdle-jeanperrin.fr"
  ),
  title: "Vente de Roses Saint-Valentin 2027 • MDLE Lycée Jean Perrin",
  description:
    "Opération officielle Saint-Valentin de la Maison Des Lycéens du Lycée Jean Perrin. Commandez vos roses avec mot doux manuscrit, distribuées en classe le vendredi 12 février 2027.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MDLE Roses 2027",
  },
  icons: {
    icon: "/logo-mdle.png",
    apple: "/logo-mdle.png",
  },
  openGraph: {
    title: "Vente de Roses Saint-Valentin 2027 • MDLE Lycée Jean Perrin",
    description:
      "Commandez vos roses pour la Saint-Valentin 2027 au Lycée Jean Perrin. Distribution en classe le vendredi 12 février 2027.",
    url: "https://roses.mdle-jeanperrin.fr",
    siteName: "MDLE Lycée Jean Perrin",
    images: [
      {
        url: "/logo-mdle.png",
        width: 512,
        height: 512,
        alt: "Logo MDLE Lycée Jean Perrin",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#b7102a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-full flex flex-col bg-[#FFF8F7] text-[#231919] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
