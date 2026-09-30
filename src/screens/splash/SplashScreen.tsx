import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { APP_VERSION } from '../../config/appConfig';

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth entrance animation for vehicle and title
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 4-second loading progress bar to match the 4-second opening duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3800,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim, scaleAnim, progressAnim]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sacred Top Verse */}
      <View style={styles.headerSection}>
        <Text style={styles.sacredVerse}>॥ श्री जोतिर्लिंग प्रसन्न ॥</Text>
      </View>

      {/* Main Centered Content */}
      <View style={styles.centerSection}>
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          {/* Vehicle Visual Card */}
          <View style={styles.vehicleCard}>
            <Image
              source={require('../../assets/images/logoquotation.png')}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
          </View>

          {/* Name of the APK / App below vehicle */}
          <View style={styles.titleSection}>
            <Text style={styles.marathiName}>महालक्ष्मी बोरवेल</Text>
            <View style={styles.badge}>
              <Text style={styles.tagline}>इलेक्ट्रिकल्स ॲन्ड मेकॅनिकल्स</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Section: 4-sec Loading indicator & App Version */}
      <View style={styles.footerSection}>
        {/* Sleek 4-second progress indicator */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { width: progressBarWidth }]}
          />
        </View>

        <Text style={styles.location}>
          मु. पो. हणबरवाडी, ता. करवीर, जि. कोल्हापूर
        </Text>
        <Text style={styles.versionText}>v{APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfacePaper,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  headerSection: {
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  sacredVerse: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  animatedWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  vehicleCard: {
    width: Math.min(width - 48, 300),
    height: 170,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.md,
    marginBottom: spacing.xl,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  titleSection: {
    alignItems: 'center',
  },
  apkName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  marathiName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  footerSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  progressTrack: {
    width: Math.min(width - 96, 220),
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
