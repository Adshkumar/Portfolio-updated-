"use client";

import {
  Activity,
  About,
  Achievements,
  Contact,
  Experience,
  Footer,
  Hero,
  Skills,
} from "@/components";
import { useEffect, useSyncExternalStore } from "react";
import ThemeNavbar from "@/components/ThemeNavbar";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
} from "@/lib/theme";

/**
 * Custom hook for scroll reveal animations
 */
function useScrollReveal() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      revealElements.forEach((element) => observer.unobserve(element));
    };
  }, []);
}

function ThemeActivity() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  return <Activity theme={theme} />;
}

export default function Home({ initialBlogOpen = false }) {
  useScrollReveal();

  return (
    <div className="page">
      <main className="container">
        <Hero initialBlogOpen={initialBlogOpen} />
        <About />
        <Experience />
        <Achievements />
        <ThemeActivity />
        <Skills />
        <Contact />
        <Footer />
      </main>
      <ThemeNavbar />
    </div>
  );
}
