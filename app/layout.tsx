import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LanguageProvider from "./providers/LanguageProvider";
import LanguageSelector from "./components/LanguageSelector";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Crea y cuenta historias con IA",
  description: "Describe algo y deja que la IA te ayude a crear una historia paso a paso.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
    shortcut: "/icon-192x192.png"
  },
  other: {
    'google-adsense-account': 'ca-pub-9368869720669033', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
       <meta name="google-adsense-account" content="ca-pub-9368869720669033" />
       <meta name="monetag" content="4643aa80204b58950281fa93f7e174b9"></meta>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
<<<<<<< HEAD
        
=======
        <LanguageProvider>
          <div className="p-4 flex justify-end">
            <LanguageSelector />
          </div>
          {children}
        </LanguageProvider>
>>>>>>> f573bd87d09192a21be05b10bcfbd25e06bcabec
      </body>
    </html>
  );
}
