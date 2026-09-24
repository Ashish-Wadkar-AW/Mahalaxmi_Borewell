import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuotationListScreen } from '../screens/quotation/QuotationListScreen';
import { QuotationDetailScreen } from '../screens/quotation/QuotationDetailScreen';
import { QuotationStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<QuotationStackParamList>();

export const QuotationStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="QuotationList"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QuotationList" component={QuotationListScreen} />
      <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
    </Stack.Navigator>
  );
};
