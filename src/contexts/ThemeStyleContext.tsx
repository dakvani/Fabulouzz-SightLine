import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeType = "emerald" | "sapphire" | "light";

interface ThemeMeta {
  id: ThemeType;
  name: string;
  tagline: string;
  accentColor: string;
  bgPreview: string;
  isDark: boolean;
}

export const THEME_OPTIONS: ThemeMeta[] = [
  {
    id: "emerald",
    name: "Stealth Emerald",
    tagline: "Cyber Obsidian & Neon Mint",
    accentColor: "#10b981",
    bgPreview: "bg-[#0a0f18]",
    isDark: true,
  },
  {
    id: "sapphire",
    name: "Midnight Sapphire",
    tagline: "Aerospace Navy & Electric Cyan",
    accentColor: "#0ea5e9",
    bgPreview: "bg-[#070e1e]",
    isDark: true,
  },
  {
    id: "light",
    name: "Titanium White",
    tagline: "Crisp Architectural Daylight",
    accentColor: "#059669",
    bgPreview: "bg-[#f8fafc]",
    isDark: false,
  },
];

interface ThemeStyleContextType {
  themeStyle: ThemeType;
  setThemeStyle: (theme: ThemeType) => void;
  cycleTheme: () => void;
  currentMeta: ThemeMeta;
}

const ThemeStyleContext = createContext<ThemeStyleContextType>({
  themeStyle: "emerald",
  setThemeStyle: () => {},
  cycleTheme: () => {},
  currentMeta: THEME_OPTIONS[0],
});

export const useThemeStyle = () => useContext(ThemeStyleContext);

export const ThemeStyleProvider = ({ children }: { children: ReactNode }) => {
  const [themeStyle, setThemeStyleState] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sightline_design_theme") as ThemeType;
      if (saved && (saved === "emerald" || saved === "sapphire" || saved === "light")) {
        return saved;
      }
    }
    return "emerald";
  });

  const applyThemeToDOM = (t: ThemeType) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("theme-emerald", "theme-sapphire", "theme-light", "dark", "light");

    if (t === "emerald") {
      root.classList.add("dark", "theme-emerald");
    } else if (t === "sapphire") {
      root.classList.add("dark", "theme-sapphire");
    } else {
      root.classList.add("light", "theme-light");
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

  const cycleTheme = () => {
    setThemeStyleState((prev) => {
      if (prev === "emerald") return "sapphire";
      if (prev === "sapphire") return "light";
      return "emerald";
    });
  };

  const currentMeta = THEME_OPTIONS.find((t) => t.id === themeStyle) || THEME_OPTIONS[0];

  return (
    <ThemeStyleContext.Provider
      value={{
        themeStyle,
        setThemeStyle,
        cycleTheme,
        currentMeta,
      }}
    >
      {children}
    </ThemeStyleContext.Provider>
  );
};
