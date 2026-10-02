"use client";

import {
  Activity,
  About,
  Achievements,
  Contact,
  Experience,
  Footer,
  Hero,
  Navbar,
  Projects,
  Skills,
} from "@/components";
import { useEffect, useSyncExternalStore } from "react";

const THEME_CHANGE_EVENT = "portfolio-theme-change";

function subscribeToTheme(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function getThemeSnapshot() {
  return localStorage.getItem("portfolio-theme") === "light" ? "light" : "dark";
}

function getServerThemeSnapshot() {
  return "dark";
}

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

export default function Home({ initialBlogOpen = false }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useScrollReveal();

  const toggleTheme = () => {
    localStorage.setItem(
      "portfolio-theme",
      theme === "dark" ? "light" : "dark"
    );
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div className="page">
      <main className="container">
        <Hero initialBlogOpen={initialBlogOpen} />
        <About />
        <Experience />
        <Projects />
        <Achievements />
        <Activity theme={theme} />
        <Skills />
        <Contact />
        <Footer />
      </main>
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
