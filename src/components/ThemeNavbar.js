"use client";

import Navbar from "@/components/Navbar";
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

export default function ThemeNavbar() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    localStorage.setItem(
      "portfolio-theme",
      theme === "dark" ? "light" : "dark"
    );
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return <Navbar theme={theme} onToggleTheme={toggleTheme} />;
}
