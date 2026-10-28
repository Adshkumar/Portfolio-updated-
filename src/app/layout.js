
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
    default: "Adarsh Kumar | Software Developer & Founder of r0 IDE",
    template: "%s | Adarsh Kumar",
  },

  description:
    "Adarsh Kumar (@adshkumar) is a software developer, founder of r0 IDE, and open-source contributor.",

  applicationName: "Adarsh Kumar Portfolio",

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
    title: "Adarsh Kumar | Software Developer & Founder of r0 IDE",
    description:
      "Official portfolio of Adarsh Kumar, software developer and founder of r0 IDE. Discover his software projects, AI applications, developer tools, and open-source work.",
    locale: "en_IN",
  },

  twitter: {
    card: "summary",
    title: "Adarsh Kumar | Software Developer & Founder of r0 IDE",
    description:
      "Adarsh Kumar (@adshkumar62) builds software, AI applications, and developer tools. Founder of r0 IDE.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${siteUrl.replace(/\/$/, "")}/#person`,

  name: "Adarsh Kumar",
  alternateName: [
    "Adshkumar",
    "Adarsh Kumar Developer",
  ],

  url: siteUrl,

  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": siteUrl,
  },

  description: metadata.description,

  jobTitle: [
    "Software Developer",
    "Founder of r0 IDE",
  ],

  sameAs: [
    "https://github.com/Adshkumar",
    "https://www.linkedin.com/in/adarsh-kumar62041/",
    "https://x.com/Adshkumar62",
  ],

  founder: {
    "@type": "SoftwareApplication",
    name: "r0 IDE",
    url: "https://r0-ide.vercel.app/",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows",
    creator: {
      "@id": `${siteUrl.replace(/\/$/, "")}/#person`,
    },
  },
};

export default function RootLayout({ children }) {
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
            __html: JSON.stringify(structuredData).replace(
              /</g,
              "\\u003c"
            ),
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
