import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { BillingStackNavigator } from './BillingStackNavigator';
import { QuotationStackNavigator } from './QuotationStackNavigator';
import { InvoiceStackNavigator } from './InvoiceStackNavigator';
import { MoreStackNavigator } from './MoreStackNavigator';
import { MainTabParamList } from '../types/navigation';
import { Icon, IconName } from '../components/common/Icon';
import { colors, spacing, borderRadius, shadows } from '../theme';

import { useAppSelector } from '../redux/hooks';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName: IconName = 'home';

          switch (route.name) {
            case 'HomeTab':
              iconName = 'home';
              break;
            case 'BillingTab':
              iconName = 'billing';
              break;
            case 'QuotationTab':
              iconName = 'fileText';
              break;
            case 'InvoiceTab':
              iconName = 'invoice';
              break;
            case 'MoreTab':
              iconName = 'more';
              break;
          }

          return (
            <View style={[styles.iconContainer, focused && styles.iconActiveContainer]}>
              <Icon
                name={iconName}
                size={focused ? 22 : 20}
                color={focused ? colors.primary : colors.gray400}
                strokeWidth={focused ? 2.3 : 1.8}
              />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{ tabBarLabel: isMarathi ? 'होम' : 'Home' }}
      />
      <Tab.Screen
        name="BillingTab"
        component={BillingStackNavigator}
        options={{ tabBarLabel: isMarathi ? 'बिलिंग' : 'Billing' }}
      />
      <Tab.Screen
        name="QuotationTab"
        component={QuotationStackNavigator}
        options={{ tabBarLabel: isMarathi ? 'कोटेशन' : 'Quotation' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            console.log('[QUOTATION][TAB][PRESS]');
            console.log('[QUOTATION][LIST][OPEN]');
            navigation.navigate('QuotationTab', {
              screen: 'QuotationList',
            });
          },
        })}
      />
      <Tab.Screen
        name="InvoiceTab"
        component={InvoiceStackNavigator}
        options={{ tabBarLabel: isMarathi ? 'इनव्हॉइस' : 'Invoice' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{ tabBarLabel: isMarathi ? 'अधिक' : 'More' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    ...shadows.md,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
  },
  iconActiveContainer: {
    backgroundColor: colors.primaryMuted,
  },
});
