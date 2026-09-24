import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerInformationScreen } from '../screens/billing/CustomerInformationScreen';
import { BorewellInformationScreen } from '../screens/billing/BorewellInformationScreen';
import { MaterialDetailsScreen } from '../screens/billing/MaterialDetailsScreen';
import { TotalDeliveryScreen } from '../screens/billing/TotalDeliveryScreen';
import { PaymentInformationScreen } from '../screens/billing/PaymentInformationScreen';
import { BillingStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<BillingStackParamList>();

export const BillingStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="CustomerInformation"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="CustomerInformation"
        component={CustomerInformationScreen}
      />
      <Stack.Screen
        name="BorewellInformation"
        component={BorewellInformationScreen}
      />
      <Stack.Screen
        name="MaterialDetails"
        component={MaterialDetailsScreen}
      />
      <Stack.Screen
        name="TotalDelivery"
        component={TotalDeliveryScreen}
      />
      <Stack.Screen
        name="PaymentInformation"
        component={PaymentInformationScreen}
      />
    </Stack.Navigator>
  );
};
