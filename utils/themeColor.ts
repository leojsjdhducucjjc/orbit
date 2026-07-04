export const DEFAULT_THEME_RGB = "236 72 153";

function hexToRgb(hex: string): string | null {
  const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

const PRESET_HEX: Record<string, string> = {
  "bg-pink-100": "#fce7f3",
  "bg-rose-100": "#ffe4e6",
  "bg-orange-100": "#ffedd5",
  "bg-amber-100": "#fef3c7",
  "bg-lime-100": "#ecfccb",
  "bg-emerald-100": "#d1fae5",
  "bg-cyan-100": "#cffafe",
  "bg-sky-100": "#e0f2fe",
  "bg-indigo-100": "#e0e7ff",
  "bg-purple-100": "#f3e8ff",
  "bg-pink-400": "#f472b6",
  "bg-rose-400": "#fb7185",
  "bg-orange-400": "#fb923c",
  "bg-amber-400": "#fbbf24",
  "bg-lime-400": "#a3e635",
  "bg-emerald-400": "#34d399",
  "bg-cyan-400": "#22d3ee",
  "bg-sky-400": "#38bdf8",
  "bg-indigo-400": "#818cf8",
  "bg-violet-400": "#a78bfa",
  "bg-orbit": "#FF0099",
  "bg-rose-600": "#e11d48",
  "bg-orange-600": "#ea580c",
  "bg-amber-600": "#d97706",
  "bg-lime-600": "#65a30d",
  "bg-emerald-600": "#059669",
  "bg-cyan-600": "#0891b2",
  "bg-sky-600": "#0284c7",
  "bg-indigo-600": "#4f46e5",
  "bg-violet-600": "#7c3aed",
  "bg-blue-500": "#3b82f6",
  "bg-red-500": "#ef4444",
  "bg-red-700": "#b91c1c",
  "bg-green-500": "#22c55e",
  "bg-green-600": "#16a34a",
  "bg-yellow-500": "#eab308",
  "bg-orange-500": "#f97316",
  "bg-purple-500": "#a855f7",
  "bg-pink-500": "#ec4899",
  "bg-black": "#000000",
  "bg-zinc-500": "#71717a",
};

export function getHexFromTheme(tw: unknown): string {
  if (tw === null || tw === undefined || typeof tw !== "string") return "#ec4899";
  const value = (tw as string).trim();
  if (!value) return "#ec4899";
  if (value.startsWith("#")) return value;
  return PRESET_HEX[value] ?? "#ec4899";
}

export function getRGBFromTailwindColor(tw: unknown): string {
  if (tw === null || tw === undefined || typeof tw !== "string") {
    return DEFAULT_THEME_RGB;
  }

  const value = tw.trim();
  if (!value) return DEFAULT_THEME_RGB;

  if (value.startsWith("#")) {
    const rgb = hexToRgb(value);
    return rgb ?? DEFAULT_THEME_RGB;
  }

  const hex = PRESET_HEX[value];
  if (hex) {
    return hexToRgb(hex) ?? DEFAULT_THEME_RGB;
  }

  return DEFAULT_THEME_RGB;
}
