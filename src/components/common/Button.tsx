import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'paper';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const sizeContainerStyle: ViewStyle =
    size === 'sm'
      ? { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md }
      : size === 'lg'
      ? { paddingVertical: spacing.lg - 2, paddingHorizontal: spacing.xxl }
      : { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };

  const variantContainerStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary }
      : variant === 'secondary'
      ? { backgroundColor: colors.gray100 }
      : variant === 'outline'
      ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary }
      : variant === 'danger'
      ? { backgroundColor: colors.danger }
      : { backgroundColor: colors.surfacePaper, borderWidth: 1, borderColor: colors.borderMedium };

  const sizeTextStyle: TextStyle =
    size === 'sm' ? { fontSize: 12 } : size === 'lg' ? { fontSize: 16 } : { fontSize: 14 };

  const variantTextStyle: TextStyle =
    variant === 'primary' || variant === 'danger'
      ? { color: colors.textLight }
      : variant === 'secondary'
      ? { color: colors.textPrimary }
      : variant === 'outline'
      ? { color: colors.primary }
      : { color: colors.textMaroon };

  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textLight
      : variant === 'outline' || variant === 'paper'
      ? colors.primary
      : colors.textPrimary;

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizeContainerStyle,
        variantContainerStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.textLight : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>
              <Icon name={icon} size={iconSize} color={iconColor} />
            </View>
          )}
          <Text style={[styles.text, sizeTextStyle, variantTextStyle, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>
              <Icon name={icon} size={iconSize} color={iconColor} />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
