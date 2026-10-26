import { siteConfig } from "@/config/portfolio";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: [
    "Adarsh Kumar",
    "Portfolio",
    "AI Engineer",
    "Full Stack Developer",
  ],
  authors: [{ name: siteConfig.name }],
  verification: {
    google: "Az9r7RxQ24dwiCIjqSUqfMJElwOx7H2m2lRCDXqiAKg",
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
