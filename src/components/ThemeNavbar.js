"use client";

import Navbar from "@/components/Navbar";
import { useEffect, useSyncExternalStore } from "react";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeToTheme,
} from "@/lib/theme";

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
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return <Navbar theme={theme} onToggleTheme={toggleTheme} />;
}
