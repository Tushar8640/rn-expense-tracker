import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "theme_preference";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  danger: string;
  dangerLight: string;
  pillBg: string;
  pillActiveBg: string;
  pillActiveText: string;
  inputBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  statusBar: "dark" | "light";
}

const lightColors: ThemeColors = {
  bg: "#F5F7F6",
  card: "#FFFFFF",
  cardBorder: "#E8F0EB",
  text: "#1A2B23",
  textSecondary: "#7A8F84",
  textMuted: "#A8C5B5",
  primary: "#4B7A5B",
  primaryLight: "#E8F0EB",
  primaryDark: "#3A5F47",
  accent: "#A8C5B5",
  danger: "#E85D5D",
  dangerLight: "#FDEAEA",
  pillBg: "#FFFFFF",
  pillActiveBg: "#1A2B23",
  pillActiveText: "#FFFFFF",
  inputBg: "#FFFFFF",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#E8F0EB",
  statusBar: "dark",
};

const darkColors: ThemeColors = {
  bg: "#0D1B14",
  card: "#162420",
  cardBorder: "#243830",
  text: "#E8F0EB",
  textSecondary: "#7A8F84",
  textMuted: "#4A6055",
  primary: "#5B9A6B",
  primaryLight: "#1A3025",
  primaryDark: "#4B8A5B",
  accent: "#5B8A6B",
  danger: "#E85D5D",
  dangerLight: "#3A1A1A",
  pillBg: "#162420",
  pillActiveBg: "#5B9A6B",
  pillActiveText: "#FFFFFF",
  inputBg: "#162420",
  tabBarBg: "#111E18",
  tabBarBorder: "#243830",
  statusBar: "light",
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  colors: lightColors,
  toggleTheme: () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === "dark" || val === "light") setMode(val);
    });
  }, []);

  const toggleTheme = async () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, isDark: mode === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}
