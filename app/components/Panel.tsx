import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

export function Panel({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.panel, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.panel,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
