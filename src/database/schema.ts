export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    mobileNumber TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    createdAt TEXT NOT NULL
  );`,

  // Customers table
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    mobileNumber TEXT,
    address TEXT,
    createdAt TEXT NOT NULL
  );`,

  // Bills / Quotations table
  `CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY NOT NULL,
    billNumber TEXT UNIQUE NOT NULL,
    quotationNumber TEXT,
    customerId TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT,
    customerAddress TEXT,
    date TEXT NOT NULL,
    borewellDepth REAL NOT NULL DEFAULT 0,
    waterBearing REAL NOT NULL DEFAULT 0,
    boreSize REAL NOT NULL DEFAULT 0,
    totalAmount REAL NOT NULL DEFAULT 0,
    amountInWords TEXT,
    amountInWordsMarathi TEXT,
    amountInWordsEnglish TEXT,
    deliveryDays INTEGER NOT NULL DEFAULT 7,
    status TEXT NOT NULL DEFAULT 'saved',
    paymentStatus TEXT NOT NULL DEFAULT 'pending',
    paidAmount REAL NOT NULL DEFAULT 0,
    remainingAmount REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  // Bill Items table
  `CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY NOT NULL,
    billId TEXT NOT NULL,
    srNo INTEGER NOT NULL,
    particularsMr TEXT NOT NULL,
    particularsEn TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    rate REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    itemSpecs TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(billId) REFERENCES bills(id) ON DELETE CASCADE
  );`,

  // Invoices table (Independent records with copied snapshot data)
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY NOT NULL,
    invoiceNumber TEXT UNIQUE NOT NULL,
    billId TEXT,
    sourceQuotationId TEXT,
    sourceQuotationNumber TEXT,
    customerId TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT,
    customerAddress TEXT,
    date TEXT NOT NULL,
    borewellDepth REAL NOT NULL DEFAULT 0,
    waterBearing REAL NOT NULL DEFAULT 0,
    boreSize REAL NOT NULL DEFAULT 0,
    deliveryDays INTEGER NOT NULL DEFAULT 7,
    amountInWords TEXT,
    amountInWordsMarathi TEXT,
    amountInWordsEnglish TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    taxAmount REAL NOT NULL DEFAULT 0,
    grandTotal REAL NOT NULL DEFAULT 0,
    paymentStatus TEXT NOT NULL DEFAULT 'pending',
    paidAmount REAL NOT NULL DEFAULT 0,
    remainingAmount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(billId) REFERENCES bills(id)
  );`,

  // Invoice Items table (Independent snapshot items)
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoiceId TEXT NOT NULL,
    srNo INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    rate REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    itemSpecs TEXT,
    particularsMr TEXT,
    particularsEn TEXT,
    FOREIGN KEY(invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
  );`,

  // Income table
  `CREATE TABLE IF NOT EXISTS income (
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    paymentMethod TEXT NOT NULL DEFAULT 'cash',
    clientSource TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  // Expense table
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    paymentMethod TEXT NOT NULL DEFAULT 'cash',
    vendorPerson TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  // Reminders table
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT,
    type TEXT NOT NULL DEFAULT 'client',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  // Profile table
  `CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    mobileNumber TEXT NOT NULL,
    email TEXT,
    businessName TEXT NOT NULL,
    businessAddress TEXT NOT NULL,
    gstNumber TEXT,
    updatedAt TEXT NOT NULL
  );`,

  // App Settings table
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  // Helpful Indexes for dashboard queries
  `CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);`,
  `CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_status_date ON reminders(status, date);`,
  `CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);`,
];
