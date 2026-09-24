import { NavigatorScreenParams } from '@react-navigation/native';
import { InvoiceEntity, QuotationEntity } from './database';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type BillingStackParamList = {
  CustomerInformation: undefined;
  BorewellInformation: undefined;
  MaterialDetails: undefined;
  TotalDelivery: undefined;
  PaymentInformation: undefined;
};

export type QuotationStackParamList = {
  QuotationList: undefined;
  QuotationDetail: { quotation?: QuotationEntity; quotationId?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  BillingTab: NavigatorScreenParams<BillingStackParamList> | undefined;
  QuotationTab: NavigatorScreenParams<QuotationStackParamList> | undefined;
  InvoiceTab: NavigatorScreenParams<InvoiceStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type InvoiceStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { invoice: InvoiceEntity };
  FinalInvoiceAdjustment: { quotation: QuotationEntity };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Income: undefined;
  Expense: undefined;
  Reminders: undefined;
  Profile: undefined;
  Backup: undefined;
};
