import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeType = "dark" | "light";

export interface ThemeMeta {
  id: ThemeType;
  name: string;
  tagline: string;
  accentColor: string;
  bgPreview: string;
  isDark: boolean;
}

export const THEME_OPTIONS: ThemeMeta[] = [
  {
    id: "dark",
    name: "Liquid Obsidian",
    tagline: "Ultra-Clear Glass & Neon Emerald",
    accentColor: "#10b981",
    bgPreview: "bg-[#090d16]",
    isDark: true,
  },
  {
    id: "light",
    name: "Liquid Crystal",
    tagline: "Pure Frosted Glass & Emerald",
    accentColor: "#059669",
    bgPreview: "bg-[#f8fafc]",
    isDark: false,
  },
];

interface ThemeStyleContextType {
  themeStyle: ThemeType;
  isDark: boolean;
  setThemeStyle: (theme: ThemeType) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  currentMeta: ThemeMeta;
}

const ThemeStyleContext = createContext<ThemeStyleContextType>({
  themeStyle: "dark",
  isDark: true,
  setThemeStyle: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {},
  currentMeta: THEME_OPTIONS[0],
});

export const useThemeStyle = () => useContext(ThemeStyleContext);

export const ThemeStyleProvider = ({ children }: { children: ReactNode }) => {
  const [themeStyle, setThemeStyleState] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sightline_design_theme");
      if (saved === "light") return "light";
      if (saved === "dark" || saved === "emerald" || saved === "sapphire") return "dark";
    }
    return "dark";
  });

  const applyThemeToDOM = (t: ThemeType) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("theme-emerald", "theme-sapphire", "theme-light", "dark", "light");

    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  };

  useEffect(() => {
    applyThemeToDOM(themeStyle);
    if (typeof window !== "undefined") {
      localStorage.setItem("sightline_design_theme", themeStyle);
    }
  }, [themeStyle]);

  const setThemeStyle = (newTheme: ThemeType) => {
    setThemeStyleState(newTheme);
  };

  const toggleTheme = () => {
    setThemeStyleState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const cycleTheme = toggleTheme;

  const currentMeta = THEME_OPTIONS.find((t) => t.id === themeStyle) || THEME_OPTIONS[0];

  return (
    <ThemeStyleContext.Provider
      value={{
        themeStyle,
        isDark: themeStyle === "dark",
        setThemeStyle,
        toggleTheme,
        cycleTheme,
        currentMeta,
      }}
    >
      {children}
    </ThemeStyleContext.Provider>
  );
};

