import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreMenuScreen } from '../screens/more/MoreMenuScreen';
import { IncomeScreen } from '../screens/income/IncomeScreen';
import { ExpenseScreen } from '../screens/expense/ExpenseScreen';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { BackupScreen } from '../screens/backup/BackupScreen';
import { MoreStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <Stack.Screen name="Income" component={IncomeScreen} />
      <Stack.Screen name="Expense" component={ExpenseScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Backup" component={BackupScreen} />
    </Stack.Navigator>
  );
};
