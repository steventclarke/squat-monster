import { Pressable, Text, StyleSheet, PressableProps } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, variant = 'primary', style, ...props }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderAccent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...Typography.label,
    color: Colors.background,
  },
  labelGhost: {
    color: Colors.textPrimary,
  },
});
