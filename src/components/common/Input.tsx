import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Icon, IconName } from './Icon';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: IconName;
  unit?: string;
  prefix?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  icon,
  unit,
  prefix,
  required = false,
  containerStyle,
  inputStyle,
  hint,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredStar}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          !editable && styles.disabledWrapper,
          !!error && styles.errorWrapper,
          multiline && { height: numberOfLines * 24 + 20, alignItems: 'flex-start' },
        ]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Icon
              name={icon}
              size={18}
              color={error ? colors.danger : isFocused ? colors.primary : colors.gray500}
            />
          </View>
        )}

        {prefix && <Text style={styles.prefixText}>{prefix}</Text>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            !editable && styles.disabledInput,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
        />

        {unit && <Text style={styles.unitText}>{unit}</Text>}

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeBtn}>
            <Icon
              name={isPasswordVisible ? 'eyeOff' : 'eye'}
              size={18}
              color={colors.gray500}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  focusedWrapper: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  disabledWrapper: {
    backgroundColor: colors.gray100,
    borderColor: colors.borderLight,
  },
  errorWrapper: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  disabledInput: {
    color: colors.gray500,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
