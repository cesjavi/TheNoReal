/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Pastel narrative palette converted from app/globals.css
const accentLight = '#c3f0ca';
const accentDark = '#5dbb63';

const linkColor = '#0a7ea4';
const primaryBlue = '#2563eb';
const borderGray = '#ccc';
const mutedGray = '#808080';
const surfaceGray = '#e5e5e5';
const homeHeaderLight = '#A1CEDC';
const homeHeaderDark = '#1D3D47';
const exploreHeaderLight = '#D0D0D0';
const exploreHeaderDark = '#353636';

export const Colors = {
  light: {
    text: '#3a2d4f',
    background: '#f5e9ff',
    tint: accentDark,
    icon: '#3a2d4f',
    tabIconDefault: '#3a2d4f',
    tabIconSelected: accentDark,
    accent: accentLight,
    accentDark,
    link: linkColor,
    primary: primaryBlue,
    border: borderGray,
    muted: mutedGray,
    surface: surfaceGray,
    homeHeader: homeHeaderLight,
    exploreHeader: exploreHeaderLight,
  },
  dark: {
    text: '#f1e9f9',
    background: '#1a1622',
    tint: accentDark,
    icon: '#f1e9f9',
    tabIconDefault: '#f1e9f9',
    tabIconSelected: '#2f855a',
    accent: accentDark,
    accentDark: '#2f855a',
    link: linkColor,
    primary: primaryBlue,
    border: borderGray,
    muted: mutedGray,
    surface: surfaceGray,
    homeHeader: homeHeaderDark,
    exploreHeader: exploreHeaderDark,
  },
};
