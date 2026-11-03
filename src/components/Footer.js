import { siteConfig } from "@/config/portfolio";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>
        © {currentYear} {siteConfig.name}
      </p>
      <a className="footerRssLink" href="/rss.xml">
        <i className="fas fa-rss" aria-hidden="true"></i>
        RSS Feed
      </a>
    </footer>
  );
}
