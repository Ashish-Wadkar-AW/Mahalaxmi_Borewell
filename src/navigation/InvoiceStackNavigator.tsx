import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InvoiceListScreen } from '../screens/invoice/InvoiceListScreen';
import { InvoiceDetailScreen } from '../screens/invoice/InvoiceDetailScreen';
import { FinalInvoiceAdjustmentScreen } from '../screens/invoice/FinalInvoiceAdjustmentScreen';
import { InvoiceStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<InvoiceStackParamList>();

export const InvoiceStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen
        name="FinalInvoiceAdjustment"
        component={FinalInvoiceAdjustmentScreen}
      />
    </Stack.Navigator>
  );
};
