import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors } from '../constants/Colors';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  /**
   * Override the text color using a key from {@link Colors}.
   */
  color?: keyof typeof Colors.light & keyof typeof Colors.dark;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  color: colorName,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    colorName ?? (type === 'link' ? 'accentDark' : 'text')
  );

  return (
    <Text
      style={[
        { color, fontFamily: 'Geist' },
        type === 'default' || type === 'code' ? styles.default : undefined,
        type === 'code' ? styles.code : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});
