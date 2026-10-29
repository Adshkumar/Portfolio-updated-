
import { siteConfig, socialLinks } from "@/config/portfolio";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = siteConfig.url;
const siteDescription =
  "Adarsh Kumar is a Delhi-based full-stack developer and founder of r0 IDE. Explore his web and AI projects, open-source work, and software engineering articles.";

export const metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Adarsh Kumar — Software Developer & Founder of r0 IDE",
    template: "%s | Adarsh Kumar",
  },

  description: siteDescription,

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
    title: "Adarsh Kumar — Full-Stack Developer & Founder of r0 IDE",
    description: siteDescription,
    locale: "en_IN",
  },

  twitter: {
    card: "summary",
    title: "Adarsh Kumar — Full-Stack Developer & Founder of r0 IDE",
    description: siteDescription,
  },
};

const personId = `${siteUrl.replace(/\/$/, "")}/#person`;
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": personId,
      name: siteConfig.name,
      alternateName: "Adshkumar",
      url: siteUrl,
      image: `${siteUrl}/adarsh-profile.png`,
      description: metadata.description,
      jobTitle: "Full-Stack Software Developer",
      sameAs: socialLinks
        .filter(({ platform }) => platform !== "email")
        .map(({ url }) => url),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl.replace(/\/$/, "")}/#website`,
      url: siteUrl,
      name: "Adarsh Kumar",
      alternateName: ["Adshkumar", "adshkumar.is-a.dev"],
      publisher: { "@id": personId },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: "r0 IDE",
      url: "https://r0-ide.vercel.app/",
      applicationCategory: "DeveloperApplication",
      creator: { "@id": personId },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="Az9r7RxQ24dwiCIjqSUqfMJElwOx7H2m2lRCDXqiAKg"
        />

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
