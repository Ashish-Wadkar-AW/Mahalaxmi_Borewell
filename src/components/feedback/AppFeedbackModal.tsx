import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Icon, IconName } from '../common/Icon';
import { Button } from '../common/Button';
import { useAppSelector } from '../../redux/hooks';

export type FeedbackType = 'success' | 'error' | 'warning' | 'confirmation' | 'info';

export interface FeedbackConfig {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  dismissible?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AppFeedbackModalProps {
  config: FeedbackConfig;
  onClose: () => void;
}

export const AppFeedbackModal: React.FC<AppFeedbackModalProps> = ({
  config,
  onClose,
}) => {
  const currentLanguage = useAppSelector(state => state.language?.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  if (!config.visible) return null;

  const getIconDetails = (): { name: IconName; color: string; bg: string } => {
    switch (config.type) {
      case 'success':
        return { name: 'checkCircle', color: colors.success, bg: colors.successBg };
      case 'error':
        return { name: 'alert', color: colors.danger, bg: colors.dangerBg };
      case 'warning':
        return { name: 'alert', color: colors.warning, bg: colors.warningBg };
      case 'confirmation':
        return { name: 'alert', color: colors.primary, bg: colors.primaryMuted };
      case 'info':
      default:
        return { name: 'alert', color: colors.info, bg: colors.infoBg };
    }
  };

  const { name: iconName, color: iconColor, bg: iconBg } = getIconDetails();
  const isConfirmation = config.type === 'confirmation';
  const hasCancel = isConfirmation || Boolean(config.cancelText);

  const handleDismiss = () => {
    if (config.dismissible === false) return;
    onClose();
    if (config.onCancel) config.onCancel();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={() => {
        if (config.dismissible === false) return;
        handleDismiss();
      }}>
      <TouchableWithoutFeedback
        onPress={
          isConfirmation || config.dismissible === false ? undefined : handleDismiss
        }>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
                <Icon name={iconName} size={32} color={iconColor} strokeWidth={2.5} />
              </View>

              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.message}>{config.message}</Text>

              <View style={styles.buttonRow}>
                {hasCancel && (
                  <View style={styles.buttonHalf}>
                    <Button
                      title={config.cancelText || (isMarathi ? 'रद्द करा' : 'Cancel')}
                      variant="secondary"
                      onPress={handleDismiss}
                    />
                  </View>
                )}

                <View style={hasCancel ? styles.buttonHalf : styles.buttonFull}>
                  <Button
                    title={
                      config.confirmText ||
                      (config.type === 'confirmation'
                        ? (isMarathi ? 'खात्री करा' : 'Confirm')
                        : (isMarathi ? 'ठीक आहे' : 'OK'))
                    }
                    variant={
                      config.type === 'error' ||
                      (config.type === 'confirmation' &&
                        (config.confirmText === 'Logout' || config.confirmText === 'लॉगआउट'))
                        ? 'danger'
                        : 'primary'
                    }
                    onPress={() => {
                      onClose();
                      if (config.onConfirm) config.onConfirm();
                    }}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonFull: {
    width: '100%',
  },
});
