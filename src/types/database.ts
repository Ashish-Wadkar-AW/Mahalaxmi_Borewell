export interface UserEntity {
  id: string;
  mobileNumber: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface CustomerEntity {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  createdAt: string;
}

export interface BillItemEntity {
  id: string;
  billId: string;
  srNo: number;
  particularsMr: string;
  particularsEn: string;
  quantity: number;
  rate: number;
  total: number;
  itemSpecs?: string; // JSON string of structured specifications
  createdAt: string;
}

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'invoiced';

export interface BillItemEntity {
  id: string;
  billId: string;
  srNo: number;
  particularsMr: string;
  particularsEn: string;
  quantity: number;
  rate: number;
  total: number;
  itemSpecs?: string; // JSON string of structured specifications
  createdAt: string;
}

export type QuotationItemEntity = BillItemEntity;

export interface BillEntity {
  id: string;
  billNumber: string;
  quotationNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  date: string;
  borewellDepth: number; // in Feet
  waterBearing: number; // in Inch
  boreSize: number; // in Inch
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleDetails?: string;
  vehicle?: string;
  totalAmount: number;
  amountInWords: string;
  amountInWordsMarathi?: string;
  amountInWordsEnglish?: string;
  deliveryDays: number;
  status: QuotationStatus | 'saved';
  paymentStatus?: 'pending' | 'paid' | 'partial';
  paidAmount?: number;
  remainingAmount?: number;
  createdAt: string;
  updatedAt: string;
  items?: BillItemEntity[];
}

export type QuotationEntity = BillEntity;

export interface InvoiceItemEntity {
  id: string;
  invoiceId: string;
  srNo: number;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  itemSpecs?: string;
  particularsMr?: string;
  particularsEn?: string;
}

export interface InvoiceEntity {
  id: string;
  invoiceNumber: string;
  billId: string;
  sourceQuotationId?: string;
  sourceQuotationNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  date: string;
  borewellDepth?: number;
  waterBearing?: number;
  boreSize?: number;
  deliveryDays?: number;
  amountInWords?: string;
  amountInWordsMarathi?: string;
  amountInWordsEnglish?: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paidAmount?: number;
  remainingAmount?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItemEntity[];
  bill?: BillEntity;
}

export interface IncomeEntity {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  clientSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntity {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  vendorPerson: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEntity {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'client' | 'personal';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileEntity {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  businessName: string;
  businessAddress: string;
  gstNumber: string;
  updatedAt: string;
}

export interface SettingEntity {
  key: string;
  value: string;
  updatedAt: string;
}
