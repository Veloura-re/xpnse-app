export type UserRole = 'owner' | 'partner' | 'viewer';

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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  phoneNumber?: string;
  photoURL?: string;
  displayName?: string;
  disabled: boolean;
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

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: BusinessMember[];
  memberIds?: string[];
  notes?: string;
  currency?: string;
  selectedFont?: string; // Font ID for display font customization
  icon?: string;
  color?: string;
  lastActiveAt?: string;
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
}

export interface BookEntry {
  id: string;
  bookId: string;
  businessId: string;
  userId: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  date: string;
  description: string;
  paymentMode?: string;
  category?: string;
  attachmentUrl?: string; // Deprecated, use attachments instead
  attachments?: string[]; // Array of Firebase Storage URLs for images
  partyId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  entityType: 'business' | 'book' | 'entry';
  entityId: string;
  userId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  user: User;
}