export type UserRole = 'owner' | 'partner' | 'viewer';

export interface RolePermissions {
  canManageBusiness: boolean;
  canManageBooks: boolean;
  canRecordEntries: boolean;
  canExportReports: boolean;
  canAccessVaults: boolean;
  canManageVaults: boolean;
  canContributeGroupPool: boolean;
  canDisburseGroupPool: boolean;
  canInitiateMoneyRequests: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    canManageBusiness: true,
    canManageBooks: true,
    canRecordEntries: true,
    canExportReports: true,
    canAccessVaults: true,
    canManageVaults: true,
    canContributeGroupPool: true,
    canDisburseGroupPool: true,
    canInitiateMoneyRequests: true,
  },
  partner: {
    canManageBusiness: false,
    canManageBooks: true,
    canRecordEntries: true,
    canExportReports: true,
    canAccessVaults: true,
    canManageVaults: true,
    canContributeGroupPool: true,
    canDisburseGroupPool: false,
    canInitiateMoneyRequests: true,
  },
  viewer: {
    canManageBusiness: false,
    canManageBooks: false,
    canRecordEntries: false,
    canExportReports: true,
    canAccessVaults: true,
    canManageVaults: false,
    canContributeGroupPool: false,
    canDisburseGroupPool: false,
    canInitiateMoneyRequests: false,
  },
};

export interface Profile {
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  currency?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  isDeveloperAdmin?: boolean;
  provider?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEVELOPER_ADMIN_EMAILS: string[] = [
  'lucyosck21@gmail.com',
];

export const isDeveloperAdminUser = (
  user?: { email?: string | null; isDeveloperAdmin?: boolean } | null
): boolean => {
  if (!user) return false;
  if (user.isDeveloperAdmin === true) return true;
  if (user.email && DEVELOPER_ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) {
    return true;
  }
  return false;
};

export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  phoneNumber?: string;
  photoURL?: string;
  displayName?: string;
  disabled: boolean;
  isDeveloperAdmin?: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData: Array<{
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    providerId: string;
  }>;
  profile?: Profile; // Extended profile data
  role?: UserRole; // Default role for the user
  businesses?: string[]; // Array of business IDs the user has access to
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
    language?: string;
  };
  // Backward compatibility
  id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
}

export type BusinessType = 'standard' | 'savings_group';

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  type?: BusinessType;
  createdAt: string;
  members: BusinessMember[];
  memberIds?: string[];
  notes?: string;
  currency?: string;
  selectedFont?: string; // Font ID for display font customization
  icon?: string;
  color?: string;
  photoUrl?: string; // Optional uploaded photo replacing the icon
  groupPoolBalance?: number; // Total collective pool balance
  lastActiveAt?: string;
  // Per-business transfer limit controls (owner-configurable)
  transferLimits?: {
    singleTransferMax?: number; // Maximum amount for a single transfer
    dailyTransferMax?: number;  // Rolling 24-hour outbound cap per member
    depositMax?: number;        // Maximum amount for a single deposit
  };
}

export type RoundUpStep = 1 | 5 | 10;
export type RoundUpMultiplier = 1 | 2 | 3 | 5 | 10;

export interface RoundUpSettings {
  enabled: boolean;
  targetVaultId: string;
  targetVaultName?: string;
  step: RoundUpStep; // Next $1, $5, or $10
  multiplier: RoundUpMultiplier; // 1x, 2x, 3x, 5x, 10x
  safetyFloor: number; // Minimum main balance required to execute round-up (e.g. 20)
  paused?: boolean;
}

export interface MemberAccount {
  id: string;
  businessId: string;
  userId: string;
  mainBalance: number; // Spendable balance
  lockedSavingsBalance: number; // In vaults
  currency: string;
  roundUpSettings?: RoundUpSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsVault {
  id: string;
  businessId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  isLocked: boolean;
  lockUntilDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduledStashFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'payday' // 1st and 15th
  | 'monthly';

export interface ScheduledStashRule {
  id: string;
  businessId: string;
  userId: string;
  targetVaultId: string;
  targetVaultName?: string;
  amount: number;
  frequency: ScheduledStashFrequency;
  nextDueDate: string; // YYYY-MM-DD
  status: 'active' | 'paused' | 'completed';
  occurrencesCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_sent'
  | 'transfer_recv'
  | 'vault_deposit'
  | 'vault_withdraw'
  | 'pool_contribution'
  | 'round_up_deposit'
  | 'scheduled_stash_deposit'
  | 'book_expense_payment'
  | 'book_income_deposit';

export interface WalletTransaction {
  id: string;
  businessId: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  counterpartyId?: string;
  counterpartyName?: string;
  vaultId?: string;
  vaultName?: string;
  status: 'pending' | 'completed' | 'failed';
  paymentIntentId?: string;
  note?: string;
  createdAt: string;
}

// Money request: member A asks member B to send them funds
export type MoneyRequestStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'cancelled';

export interface MoneyRequest {
  id: string;
  businessId: string;
  requesterId: string;     // The user who wants money
  requesterName: string;
  payerId: string;         // The user who is asked to pay
  payerName: string;
  amount: number;
  currency: string;
  note?: string;
  status: MoneyRequestStatus;
  createdAt: string;
  expiresAt: string;       // Requests auto-expire after 48h
  respondedAt?: string;
}

// Pending transfer: two-phase hold-and-confirm transfer between members
export type PendingTransferStatus =
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'declined'
  | 'expired';

export interface PendingTransfer {
  id: string;
  businessId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  amount: number;
  currency: string;
  note?: string;
  status: PendingTransferStatus;
  createdAt: string;
  expiresAt: string;       // Auto-expires after 24h if no response
  respondedAt?: string;
}

export interface BusinessMember {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  user: User;
  joinedAt: string;
}

export interface Party {
  id: string;
  businessId: string;
  name: string;
  type: 'customer' | 'vendor';
  email?: string;
  phone?: string;
  createdAt: string;
  totalCashIn?: number;
  totalCashOut?: number;
  balance?: number;
}

export interface Book {
  id: string;
  businessId: string;
  name: string;
  currency?: string;
  createdAt: string;
  createdBy: string;
  totalCashIn: number;
  totalCashOut: number;
  netBalance: number;
  settings: BookSettings;
  lastActiveAt?: string;
}

export interface BookSettings {
  showPaymentMode: boolean;
  showCategory: boolean;
  showAttachments: boolean;
  currency?: string;
  enableMultiCurrency?: boolean;
  customCurrencyValuations?: Record<string, number>;
  trackedCurrencies?: string[];
  secondaryCurrency?: string;
  secondaryCurrencyValuation?: number;
  preferredQuotationDirection?: 'base_to_quote' | 'quote_to_base';
}

export interface BookEntry {
  id: string;
  bookId: string;
  businessId: string;
  userId: string;
  type: 'cash_in' | 'cash_out';
  amount: number; // Converted amount in Business Base Currency
  date: string;
  description: string;
  paymentMode?: string;
  category?: string;
  attachmentUrl?: string; // Deprecated, use attachments instead
  attachments?: string[]; // Array of Cloudinary image URLs for entry attachments
  partyId?: string;
  memberIds?: string[];
  createdAt: string;
  // Multi-Currency fields
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  isCustomRate?: boolean;
  displayRate?: number;
  rateQuotationDirection?: 'base_to_quote' | 'quote_to_base';
  // Recurring rule linkage
  recurringRuleId?: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringRule {
  id: string;
  businessId: string;
  bookId: string;
  userId: string;
  type: 'cash_in' | 'cash_out';
  amount: number; // In Business Base Currency
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  isCustomRate?: boolean;
  description: string;
  category?: string;
  paymentMode?: string;
  partyId?: string;
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 1 month, every 2 weeks
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  lastRunDate?: string | null;
  endDate?: string | null;
  endAfterOccurrences?: number | null;
  occurrencesCount: number;
  status: 'active' | 'paused' | 'completed';
  autoPost: boolean; // true = auto create BookEntry on due; false = notify user
  notifyBeforeDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  businessId?: string;
  entityType: 'business' | 'book' | 'entry' | 'recurring_rule';
  entityId: string;
  userId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  user: User;
}

export type NotificationType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'entry_added'
  | 'book_created'
  | 'vault_deposit'
  | 'vault_withdraw'
  | 'vault_milestone'
  | 'vault_unlocked'
  | 'round_up_stashed'
  | 'scheduled_stash'
  | 'wallet_deposit'
  | 'wallet_cashout'
  | 'transfer_sent'
  | 'transfer_recv'
  | 'money_request'
  | 'pending_transfer';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  type?: NotificationType;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  color?: string;
  deleted?: boolean;
}