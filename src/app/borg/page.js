import { siteConfig } from "@/config/portfolio";
import Home from "../page";

export const metadata = {
  title: "Borg Pack Files — GSoC 2026 | Adarsh Kumar",
  description:
    "GSoC 2026 writeup: pack file support for BorgBackup's borg2 storage backend",
  alternates: { canonical: `${siteConfig.url}/borg` },
};

export default function BorgPage() {
  return <Home initialBlogOpen />;
}
