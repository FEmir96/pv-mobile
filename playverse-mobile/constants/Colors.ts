const tintColorLight = '#d19310';
const tintColorDark = '#d19310';

export default {
  light: {
    text: '#d19310',
    background: '#0F172A',
    cardBackground: '#1E293B',
    accent: '#d19310',
    primary: '#0F172A',
    secondary: '#d19310',
    white: '#FFFFFF',
    gray: '#94A3B8',
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    premiumGradient: ['#fb923c4D', '#14b8a64D', '#9333ea4D'] as const,
    heroGradient: ['#1E293B', '#0F172A'] as const
  },
  dark: {
    text: '#d19310',
    background: '#0F172A',
    cardBackground: '#1E293B',
    accent: '#d19310',
    primary: '#0F172A',
    secondary: '#d19310',
    white: '#FFFFFF',
    gray: '#94A3B8',
    tint: tintColorDark,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
    premiumGradient: ['#fb923c4D', '#14b8a64D', '#9333ea4D'] as const,
    heroGradient: ['#1E293B', '#0F172A'] as const
  }
};
