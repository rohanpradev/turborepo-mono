"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  theme: Theme;
};

type ThemeProviderProps = {
  attribute?: "class";
  children: ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
};

const STORAGE_KEY = "flagship-admin-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(defaultTheme: Theme) {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return defaultTheme;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme, enableSystem: boolean): ResolvedTheme {
  if (theme === "system") {
    return enableSystem ? getSystemTheme() : "light";
  }

  return theme;
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*{transition:none!important;animation:none!important;}")
  );

  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableSystem = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const initialTheme = getStoredTheme(defaultTheme);
    setThemeState(initialTheme);
  }, [defaultTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const cleanupTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null;

      const nextResolvedTheme = resolveTheme(theme, enableSystem);
      const root = document.documentElement;

      root.classList.toggle("dark", nextResolvedTheme === "dark");
      root.style.colorScheme = nextResolvedTheme;
      setResolvedTheme(nextResolvedTheme);

      cleanupTransitions?.();
    };

    applyTheme();

    if (theme !== "system" || !enableSystem) {
      return;
    }

    mediaQuery.addEventListener("change", applyTheme);
    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [disableTransitionOnChange, enableSystem, theme]);

  const setTheme = (nextTheme: Theme) => {
    const normalizedTheme =
      nextTheme === "system" && !enableSystem ? "light" : nextTheme;

    window.localStorage.setItem(STORAGE_KEY, normalizedTheme);
    setThemeState(normalizedTheme);
  };

  return (
    <ThemeContext.Provider value={{ resolvedTheme, setTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
