import { siteConfig } from "@/config/portfolio";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = siteConfig.url;

export const metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Adarsh Kumar (@adshkumar) | Developer Portfolio",
    template: "%s | Adarsh Kumar",
  },

  description:
    "Official portfolio of Adarsh Kumar (@adshkumar), software developer and open-source contributor. Explore AI projects, full-stack applications, r0 IDE, and software engineering work.",

  applicationName: "Adarsh Kumar Portfolio",

  keywords: [
    "Adarsh Kumar",
    "adshkumar",
    "Adarsh Kumar developer",
    "Adarsh Kumar portfolio",
    "adshkumar portfolio",
    "Adarsh Kumar software engineer",
    "Adarsh Kumar AI engineer",
    "Adarsh Kumar full stack developer",
    "Adarsh Kumar open source",
    "r0 IDE",
    "software developer portfolio",
    "AI projects",
    "open source projects",
  ],

  authors: [
    {
      name: "Adarsh Kumar",
      url: siteUrl,
    },
  ],

  creator: "Adarsh Kumar",
  publisher: "Adarsh Kumar",

  alternates: {
    canonical: "/",
  },

  verification: {
    google: "Az9r7RxQ24dwiCIjqSUqfMJElwOx7H2m2lRCDXqiAKg",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Adarsh Kumar Portfolio",
    title: "Adarsh Kumar (@adshkumar) | Developer Portfolio",
    description:
      "Explore the official portfolio of Adarsh Kumar, featuring software development, AI projects, open-source contributions, and r0 IDE.",
    locale: "en_US",
  },

  twitter: {
    card: "summary",
    title: "Adarsh Kumar (@adshkumar) | Developer Portfolio",
    description:
      "Software development, AI projects, open-source contributions, and r0 IDE by Adarsh Kumar.",
  },
};

export default function RootLayout({ children }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Adarsh Kumar",
    alternateName: ["Adarsh", "Adshkumar", "Adarsh Kumar Developer"],
    url: siteUrl,
    mainEntityOfPage: siteUrl,
    description: metadata.description,
    jobTitle: "Software Developer",
    sameAs: [
      "https://github.com/Adshkumar",
    ],
  };

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>

      <body className={inter.className}>
        {children}

        <Script
          data-goatcounter="https://mr-raj12.goatcounter.com/count"
          src="https://gc.zgo.at/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
