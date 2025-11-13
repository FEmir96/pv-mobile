// Global PlayVerse theme: colors, spacing, radii and type sizes.
// Keeping these tokens in one place makes it easy to stay on brand.

export const colors = {
  // Deep petrol-like background from the mockups
  background: "#0F2D3A",
  // Slightly lighter surfaces for cards
  surface: "#103B49",
  // Subtle borders
  surfaceBorder: "#1C4D5E",
  // Primary light text
  textPrimary: "#E6F4F1",
  // Secondary/description text
  textSecondary: "#A4C9D3",
  // PlayVerse accent (golden yellow)
  accent: "#D19325",
  // Alternate accent (orange)
  accentAlt: "#F28C0F",
  // Info/cyan used in chips and buttons
  info: "#25C2D3",
  // Success/ok
  success: "#2ECC71",
  // Shadow base
  shadow: "rgba(0,0,0,0.35)",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 14,
  caption: 12,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const theme = { colors, spacing, radius, typography, shadows };
export type Theme = typeof theme;
