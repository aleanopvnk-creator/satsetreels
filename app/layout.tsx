import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://satsetreels.app"),
  title: "SatsetReels - Download Reels & Foto Instagram HD Tanpa Watermark",
  description:
    "SatsetReels adalah situs download video Instagram Reels dan foto postingan kualitas Full HD (1080p) gratis tanpa watermark. Cepat, aman, tanpa aplikasi tambahan untuk Android, iPhone (iOS), dan PC.",
  keywords: [
    "SatsetReels",
    "Download Reels IG",
    "Download Foto Instagram HD",
    "Instagram Reels Downloader",
    "Download Postingan IG Tanpa Watermark",
    "Download Video Instagram",
    "Unduh Reels IG Tanpa Watermark",
    "Instagram Photo Downloader HD",
    "Cara Download Reels IG",
  ],
  authors: [{ name: "SatsetReels" }],
  creator: "SatsetReels",
  publisher: "SatsetReels",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "SatsetReels",
    title: "SatsetReels - Download Reels & Foto Instagram HD Tanpa Watermark",
    description:
      "Download video Instagram Reels & Foto postingan kualitas Full HD tanpa watermark secara instan dan gratis dengan SatsetReels.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SatsetReels - Download Reels & Foto Instagram HD Tanpa Watermark",
    description:
      "Download video Instagram Reels & Foto postingan kualitas Full HD tanpa watermark secara instan dan gratis dengan SatsetReels.",
  },
};

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "SatsetReels",
      url: "https://satsetreels.app",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All (Android, iOS, Windows, macOS, Linux)",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "SatsetReels adalah situs web pengunduh video Instagram Reels dan Foto postingan kualitas tinggi tanpa watermark secara cepat dan gratis.",
    },
    {
      "@type": "HowTo",
      name: "Cara Download Video Reels & Foto Instagram dengan SatsetReels",
      description: "Panduan 3 langkah mudah download video Instagram Reels dan foto postingan Full HD tanpa watermark menggunakan SatsetReels.",
      step: [
        {
          "@type": "HowToStep",
          name: "Langkah 1: Salin Tautan (Copy Link)",
          text: "Buka aplikasi Instagram, pilih video Reels atau foto postingan yang ingin diunduh, klik ikon Bagikan lalu pilih 'Salin Tautan'.",
          position: 1,
        },
        {
          "@type": "HowToStep",
          name: "Langkah 2: Tempelkan Tautan di SatsetReels",
          text: "Buka situs SatsetReels, tempelkan link Instagram ke dalam kolom input yang tersedia dengan menekan tombol 'Tempel'.",
          position: 2,
        },
        {
          "@type": "HowToStep",
          name: "Langkah 3: Download Media HD",
          text: "Klik tombol 'Download', pratinjau media akan muncul. Klik tombol 'Download Video HD' atau 'Download Foto HD' untuk menyimpan file ke perangkat Anda.",
          position: 3,
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png?v=4" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=4" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('satsetreels_theme') || localStorage.getItem('reelsnap_theme');
                  var isLight = saved === 'light';
                  var d = document.documentElement;
                  if (isLight) {
                    d.classList.remove('dark');
                    d.classList.add('light');
                    d.setAttribute('data-theme', 'light');
                    d.style.colorScheme = 'light';
                  } else {
                    d.classList.remove('light');
                    d.classList.add('dark');
                    d.setAttribute('data-theme', 'dark');
                    d.style.colorScheme = 'dark';
                  }
                  var meta = document.querySelector('meta[name="theme-color"]');
                  if (meta) {
                    meta.setAttribute('content', isLight ? '#f8fafc' : '#09090b');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
