import { siteConfig } from "@/config/portfolio";

export const dynamic = "force-static";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}
