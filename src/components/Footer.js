import { siteConfig } from "@/config/portfolio";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>
        © {currentYear} {siteConfig.name}
      </p>
    </footer>
  );
}
