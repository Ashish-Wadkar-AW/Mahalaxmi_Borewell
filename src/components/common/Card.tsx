import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'paper' | 'flat' | 'maroon';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  style,
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'paper' && styles.paper,
        variant === 'flat' && styles.flat,
        variant === 'maroon' && styles.maroon,
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  paper: {
    backgroundColor: colors.surfacePaper,
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    ...shadows.sm,
  },
  flat: {
    backgroundColor: colors.surfaceBeige,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  maroon: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    ...shadows.md,
  },
});
