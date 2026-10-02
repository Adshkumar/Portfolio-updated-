import Experience from "@/components/Experience";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import ThemeNavbar from "@/components/ThemeNavbar";
import Link from "next/link";

export default function ExperiencePage() {
  return (
    <div className="page">
      <main className="container">
        <Hero />
        <Link href="/" className="experienceBack">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Back to portfolio
        </Link>
        <Experience showAll />
        <Footer />
      </main>
      <ThemeNavbar />
    </div>
  );
}
