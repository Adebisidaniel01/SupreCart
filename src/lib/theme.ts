import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "suprecart-theme";
const listeners = new Set<() => void>();
let currentTheme: Theme | null = null;

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    void 0;
  }
  return document.documentElement.dataset["theme"] === "light" ? "light" : "dark";
}

export function getTheme(): Theme {
  if (!currentTheme) currentTheme = readTheme();
  return currentTheme;
}

export function applyTheme(theme: Theme) {
  currentTheme = theme;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset["theme"] = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    void 0;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0f1513" : "#f7f6f1");
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getTheme());
    const listener = () => setThemeState(getTheme());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback(() => {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  }, []);

  return { theme, setTheme: applyTheme, toggle };
}

export const THEME_INIT_SCRIPT = `(function(){try{var key="suprecart-theme";var stored=localStorage.getItem(key);var theme=stored==="light"||stored==="dark"?stored:"dark";var root=document.documentElement;root.dataset.theme=theme;root.classList.toggle("dark",theme==="dark");root.style.colorScheme=theme;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",theme==="dark"?"#0f1513":"#f7f6f1");}catch(error){var root=document.documentElement;root.dataset.theme="dark";root.classList.add("dark");root.style.colorScheme="dark";}})();`;
