import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Icon, IconName } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logoutThunk } from '../../redux/slices/authSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { useNavigation } from '@react-navigation/native';
import { APP_VERSION } from '../../config/appConfig';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  iconColor: string;
  bgColor: string;
  onPress: () => void;
}

export const MoreMenuScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const { user } = useAppSelector(state => state.auth);
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const menuItems: MenuItem[] = [
    {
      id: 'income',
      title: isMarathi ? 'जमा रक्कम (Income)' : 'Income Records',
      subtitle: isMarathi
        ? 'ग्राहकांकडून मिळालेली देयके व सेवा महसूल'
        : 'Track received client payments & service revenue',
      icon: 'trendingUp',
      iconColor: colors.success,
      bgColor: colors.successBg,
      onPress: () => navigation.navigate('Income'),
    },
    {
      id: 'expense',
      title: isMarathi ? 'खर्च / जावक (Expense)' : 'Expense / Outcome',
      subtitle: isMarathi
        ? 'साहित्य खर्च, वाहतूक, डिझेल व मजुरी'
        : 'Manage material costs, transport, fuel & labor',
      icon: 'trendingDown',
      iconColor: colors.danger,
      bgColor: colors.dangerBg,
      onPress: () => navigation.navigate('Expense'),
    },
    {
      id: 'reminders',
      title: isMarathi ? 'स्मरणपत्रे व कामे (Reminders)' : 'Reminders & Tasks',
      subtitle: isMarathi
        ? 'ग्राहक पाठपुरावा, पाईप डिलिव्हरी, साईट तपासणी'
        : 'Client follow-ups, pipe deliveries, site checks',
      icon: 'clock',
      iconColor: colors.warning,
      bgColor: colors.warningBg,
      onPress: () => navigation.navigate('Reminders'),
    },
    {
      id: 'profile',
      title: isMarathi ? 'व्यवसाय प्रोफाइल (Profile)' : 'Business Profile',
      subtitle: isMarathi
        ? 'महालक्ष्मी बोरवेल कंपनी तपशील व GST माहिती'
        : 'Mahalaxmi Borewell company details & GST info',
      icon: 'building',
      iconColor: colors.primary,
      bgColor: colors.primaryMuted,
      onPress: () => navigation.navigate('Profile'),
    },
    {
      id: 'backup',
      title: isMarathi ? 'बॅकअप / डेटा सुरक्षितता (Backup)' : 'Export / Import Backup',
      subtitle: isMarathi
        ? 'स्थानिक डेटा बॅकअप तयार करा व पुनर्प्राप्त करा'
        : 'Create and restore local data backup',
      icon: 'download',
      iconColor: colors.info,
      bgColor: colors.infoBg,
      onPress: () => navigation.navigate('Backup'),
    },
  ];

  const handleLogout = () => {
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'लॉगआउट खात्री' : 'Confirm Logout',
        message: isMarathi
          ? 'तुम्हाला नक्की लॉगआउट करायचे आहे का?'
          : 'Are you sure you want to logout?',
        confirmText: isMarathi ? 'लॉगआउट' : 'Logout',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: () => {
          dispatch(logoutThunk());
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'अधिक पर्याय' : 'More Options'}
        subtitle={
          user
            ? isMarathi
              ? `लॉगिन: ${user.name}`
              : `Logged in: ${user.name}`
            : isMarathi
            ? 'व्यवसाय व्यवस्थापन'
            : 'Business Management'
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={item.onPress}
              style={styles.menuCard}>
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                <Icon name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Separated Destructive Action: Logout */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionHeader}>
            {isMarathi ? 'खाते' : 'Account'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            style={styles.logoutCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
              <Icon name="logout" size={20} color={colors.danger} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.logoutTitle}>
                {isMarathi ? 'लॉगआउट' : 'Logout'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {isMarathi ? `आवृत्ती ${APP_VERSION}` : `Version ${APP_VERSION}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  menuSection: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  securitySection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBg,
    ...shadows.sm,
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 2,
  },
});
