export interface ColorPalette {
  name: string;
  theme: 'light' | 'dark';
  primary: string;
  secondary: string;
  background: string;
  card: string;
  block: string;
  foreground: string;
  mutedForeground: string;
  border: string;
}

export const DARK_PALETTES: ColorPalette[] = [
  {
    name: "Neon Night",
    theme: 'dark',
    primary: "#8B5CF6",
    secondary: "#7C3AED",
    background: "#09090b",
    card: "#18181b",
    block: "#27272a",
    foreground: "#ffffff",
    mutedForeground: "#a1a1aa",
    border: "#3f3f46"
  },
  {
    name: "Cyberpunk",
    theme: 'dark',
    primary: "#ff00ff",
    secondary: "#00ffff",
    background: "#050505",
    card: "#121212",
    block: "#1a1a1a",
    foreground: "#ffffff",
    mutedForeground: "#00ffff",
    border: "#ff00ff"
  },
  {
    name: "Deep Forest",
    theme: 'dark',
    primary: "#10b981",
    secondary: "#059669",
    background: "#022c22",
    card: "#064e3b",
    block: "#065f46",
    foreground: "#ecfdf5",
    mutedForeground: "#a7f3d0",
    border: "#047857"
  },
  {
    name: "Royal Gold",
    theme: 'dark',
    primary: "#fbbf24",
    secondary: "#d97706",
    background: "#1c1917",
    card: "#292524",
    block: "#44403c",
    foreground: "#fafaf9",
    mutedForeground: "#d6d3d1",
    border: "#78716c"
  },
  {
    name: "Midnight Ocean",
    theme: 'dark',
    primary: "#3b82f6",
    secondary: "#1d4ed8",
    background: "#0f172a",
    card: "#1e293b",
    block: "#334155",
    foreground: "#f8fafc",
    mutedForeground: "#94a3b8",
    border: "#475569"
  },
  {
    name: "Blood Moon",
    theme: 'dark',
    primary: "#ef4444",
    secondary: "#991b1b",
    background: "#1a0000",
    card: "#2d0000",
    block: "#4a0404",
    foreground: "#fee2e2",
    mutedForeground: "#fca5a5",
    border: "#7f1d1d"
  },
  {
    name: "Amethyst",
    theme: 'dark',
    primary: "#a855f7",
    secondary: "#7e22ce",
    background: "#1e1b4b",
    card: "#312e81",
    block: "#3730a3",
    foreground: "#f5f3ff",
    mutedForeground: "#c4b5fd",
    border: "#4338ca"
  },
  {
    name: "Industrial",
    theme: 'dark',
    primary: "#f97316",
    secondary: "#c2410c",
    background: "#18181b",
    card: "#27272a",
    block: "#3f3f46",
    foreground: "#fafafa",
    mutedForeground: "#d4d4d8",
    border: "#52525b"
  },
  {
    name: "Coffee",
    theme: 'dark',
    primary: "#b45309",
    secondary: "#78350f",
    background: "#1c1917",
    card: "#292524",
    block: "#44403c",
    foreground: "#fafaf9",
    mutedForeground: "#d6d3d1",
    border: "#57534e"
  },
  {
    name: "Obsidian",
    theme: 'dark',
    primary: "#e5e5e5",
    secondary: "#a3a3a3",
    background: "#000000",
    card: "#0a0a0a",
    block: "#171717",
    foreground: "#ffffff",
    mutedForeground: "#737373",
    border: "#262626"
  }
];

export const LIGHT_PALETTES: ColorPalette[] = [
  {
    name: "Clean Blue",
    theme: 'light',
    primary: "#2563eb",
    secondary: "#1d4ed8",
    background: "#f8fafc",
    card: "#ffffff",
    block: "#f1f5f9",
    foreground: "#0f172a",
    mutedForeground: "#475569",
    border: "#e2e8f0"
  },
  {
    name: "Soft Rose",
    theme: 'light',
    primary: "#db2777",
    secondary: "#be185d",
    background: "#fff1f2",
    card: "#ffffff",
    block: "#ffe4e6",
    foreground: "#831843",
    mutedForeground: "#9d174d",
    border: "#fecdd3"
  },
  {
    name: "Mint Fresh",
    theme: 'light',
    primary: "#059669",
    secondary: "#047857",
    background: "#f0fdf4",
    card: "#ffffff",
    block: "#dcfce7",
    foreground: "#064e3b",
    mutedForeground: "#065f46",
    border: "#bbf7d0"
  },
  {
    name: "Sunny Day",
    theme: 'light',
    primary: "#d97706",
    secondary: "#b45309",
    background: "#fffbeb",
    card: "#ffffff",
    block: "#fef3c7",
    foreground: "#78350f",
    mutedForeground: "#92400e",
    border: "#fde68a"
  },
  {
    name: "Professional",
    theme: 'light',
    primary: "#4f46e5",
    secondary: "#4338ca",
    background: "#f5f3ff",
    card: "#ffffff",
    block: "#ede9fe",
    foreground: "#1e1b4b",
    mutedForeground: "#3730a3",
    border: "#ddd6fe"
  },
  {
    name: "Nature Green",
    theme: 'light',
    primary: "#65a30d",
    secondary: "#4d7c0f",
    background: "#f7fee7",
    card: "#ffffff",
    block: "#ecfccb",
    foreground: "#365314",
    mutedForeground: "#3f6212",
    border: "#d9f99d"
  },
  {
    name: "Peach Garden",
    theme: 'light',
    primary: "#ea580c",
    secondary: "#c2410c",
    background: "#fff7ed",
    card: "#ffffff",
    block: "#ffedd5",
    foreground: "#7c2d12",
    mutedForeground: "#9a3412",
    border: "#fed7aa"
  },
  {
    name: "Cloudy Sky",
    theme: 'light',
    primary: "#0284c7",
    secondary: "#0369a1",
    background: "#f0f9ff",
    card: "#ffffff",
    block: "#e0f2fe",
    foreground: "#0c4a6e",
    mutedForeground: "#075985",
    border: "#bae6fd"
  },
  {
    name: "Lavender Mist",
    theme: 'light',
    primary: "#9333ea",
    secondary: "#7e22ce",
    background: "#faf5ff",
    card: "#ffffff",
    block: "#f3e8ff",
    foreground: "#581c87",
    mutedForeground: "#6b21a8",
    border: "#e9d5ff"
  },
  {
    name: "Desert Sand",
    theme: 'light',
    primary: "#b45309",
    secondary: "#92400e",
    background: "#fffaf0",
    card: "#ffffff",
    block: "#ffedd5",
    foreground: "#451a03",
    mutedForeground: "#78350f",
    border: "#fed7aa"
  }
];
