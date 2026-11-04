export const THEME_CHANGE_EVENT = "portfolio-theme-change";

export function subscribeToTheme(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

export function getThemeSnapshot() {
  return localStorage.getItem("portfolio-theme") === "light" ? "light" : "dark";
}

export function getServerThemeSnapshot() {
  return "dark";
}

export function setTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem("portfolio-theme", theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
