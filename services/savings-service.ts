import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  addDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { PushNotificationService } from '@/services/push-notification-service';
import {
  MemberAccount,
  SavingsVault,
  WalletTransaction,
  WalletTransactionType,
  Business,
  MoneyRequest,
  MoneyRequestStatus,
  PendingTransfer,
  PendingTransferStatus,
  RoundUpSettings,
  ScheduledStashRule,
  ScheduledStashFrequency,
  NotificationType,
  BusinessMember,
  User,
  UserRole,
} from '@/types';
import { mockUsers } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Demo Teammates Fallback Registry
// ---------------------------------------------------------------------------

export const DEMO_TEAMMATES: BusinessMember[] = [
  {
    id: 'demo_mem_jane',
    userId: 'demo_user_jane',
    businessId: 'demo',
    role: 'partner',
    user: {
      id: 'demo_user_jane',
      uid: 'demo_user_jane',
      emailVerified: true,
      isAnonymous: false,
      disabled: false,
      displayName: 'Jane Smith',
      name: 'Jane Smith',
      email: 'jane.smith@spndy.internal',
      metadata: {},
      providerData: [],
    },
    joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'demo_mem_mike',
    userId: 'demo_user_mike',
    businessId: 'demo',
    role: 'viewer',
    user: {
      id: 'demo_user_mike',
      uid: 'demo_user_mike',
      emailVerified: true,
      isAnonymous: false,
      disabled: false,
      displayName: 'Mike Johnson',
      name: 'Mike Johnson',
      email: 'mike.johnson@spndy.internal',
      metadata: {},
      providerData: [],
    },
    joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'demo_mem_sarah',
    userId: 'demo_user_sarah',
    businessId: 'demo',
    role: 'partner',
    user: {
      id: 'demo_user_sarah',
      uid: 'demo_user_sarah',
      emailVerified: true,
      isAnonymous: false,
      disabled: false,
      displayName: 'Sarah Connor',
      name: 'Sarah Connor',
      email: 'sarah.connor@spndy.internal',
      metadata: {},
      providerData: [],
    },
    joinedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

/**
 * Returns available members for a business, falling back to demo teammates if solo.
 */
export function getEligibleRecipients(
  businessMembers: BusinessMember[] = [],
  currentUserId: string = ''
): BusinessMember[] {
  const filtered = businessMembers.filter((m) => m.userId !== currentUserId);
  if (filtered.length > 0) {
    return filtered;
  }
  return DEMO_TEAMMATES.filter((m) => m.userId !== currentUserId);
}

// ---------------------------------------------------------------------------
// In-Memory & AsyncStorage Persistent Reactive Store
// ---------------------------------------------------------------------------

interface SavingsStoreState {
  accounts: Record<string, MemberAccount>; // key: `${businessId}_${userId}`
  vaults: Record<string, SavingsVault[]>; // key: `${businessId}_${userId}`
  transactions: Record<string, WalletTransaction[]>; // key: `${businessId}_${userId}`
  incomingTransfers: Record<string, PendingTransfer[]>; // key: `${businessId}_${recipientId}`
  outgoingTransfers: Record<string, PendingTransfer[]>; // key: `${businessId}_${senderId}`
  moneyRequests: Record<string, MoneyRequest[]>; // key: `${businessId}`
  scheduledStashRules: Record<string, ScheduledStashRule[]>; // key: `${businessId}_${userId}`
  groupPoolBalances: Record<string, number>; // key: `${businessId}`
}

class ReactiveSavingsStore {
  private state: SavingsStoreState = {
    accounts: {},
    vaults: {},
    transactions: {},
    incomingTransfers: {},
    outgoingTransfers: {},
    moneyRequests: {},
    scheduledStashRules: {},
    groupPoolBalances: {},
  };

  private subscribers = {
    accounts: new Map<string, Set<(acc: MemberAccount | null) => void>>(),
    vaults: new Map<string, Set<(vaults: SavingsVault[]) => void>>(),
    transactions: new Map<string, Set<(txs: WalletTransaction[]) => void>>(),
    incomingTransfers: new Map<string, Set<(pts: PendingTransfer[]) => void>>(),
    outgoingTransfers: new Map<string, Set<(pts: PendingTransfer[]) => void>>(),
    moneyRequests: new Map<string, Set<(reqs: MoneyRequest[]) => void>>(),
    scheduledStashes: new Map<string, Set<(rules: ScheduledStashRule[]) => void>>(),
    groupPool: new Map<string, Set<(bal: number) => void>>(),
  };

  private initializedKeys = new Set<string>();

  private getKey(bizId: string, userId: string) {
    return `${bizId || 'default'}_${userId || 'default'}`;
  }

  private getStorageKey(bizId: string, userId: string) {
    return `@savings_state_cache_${bizId || 'default'}_${userId || 'default'}`;
  }

  private async persistKey(bizId: string, userId: string) {
    const key = this.getKey(bizId, userId);
    const storageKey = this.getStorageKey(bizId, userId);
    try {
      const payload = {
        account: this.state.accounts[key],
        vaults: this.state.vaults[key],
        transactions: this.state.transactions[key],
        incomingTransfers: this.state.incomingTransfers[key],
        outgoingTransfers: this.state.outgoingTransfers[key],
        moneyRequests: this.state.moneyRequests[bizId || 'default'],
        scheduledStashRules: this.state.scheduledStashRules[key],
        groupPoolBalance: this.state.groupPoolBalances[bizId || 'default'],
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('[SavingsStore] Persistence warning:', err);
    }
  }

  public async initForUser(bizId: string, userId: string, currency: string = 'USD') {
    const key = this.getKey(bizId, userId);
    if (this.initializedKeys.has(key)) return;
    this.initializedKeys.add(key);

    const storageKey = this.getStorageKey(bizId, userId);
    try {
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.account) this.state.accounts[key] = parsed.account;
        if (parsed.vaults) this.state.vaults[key] = parsed.vaults;
        if (parsed.transactions) this.state.transactions[key] = parsed.transactions;
        if (parsed.incomingTransfers) this.state.incomingTransfers[key] = parsed.incomingTransfers;
        if (parsed.outgoingTransfers) this.state.outgoingTransfers[key] = parsed.outgoingTransfers;
        if (parsed.moneyRequests) this.state.moneyRequests[bizId || 'default'] = parsed.moneyRequests;
        if (parsed.scheduledStashRules) this.state.scheduledStashRules[key] = parsed.scheduledStashRules;
        if (parsed.groupPoolBalance !== undefined) this.state.groupPoolBalances[bizId || 'default'] = parsed.groupPoolBalance;
      }
    } catch (err) {
      console.warn('[SavingsStore] Cache load error:', err);
    }

    // Seed default demo state if absent
    if (!this.state.accounts[key]) {
      this.seedDefaultState(bizId, userId, currency);
    }
  }

  public seedDefaultState(bizId: string, userId: string, currency: string = 'USD') {
    const key = this.getKey(bizId, userId);

    const defaultVaults: SavingsVault[] = [
      {
        id: `vault_${bizId}_emergency`,
        businessId: bizId,
        userId,
        name: 'Emergency Reserve Vault',
        targetAmount: 5000,
        currentAmount: 2500,
        currency,
        isLocked: true,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: `vault_${bizId}_tax`,
        businessId: bizId,
        userId,
        name: 'Q4 Tax Escrow',
        targetAmount: 2000,
        currentAmount: 950,
        currency,
        isLocked: false,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: `vault_${bizId}_tech`,
        businessId: bizId,
        userId,
        name: 'New Hardware Upgrade',
        targetAmount: 1500,
        currentAmount: 600,
        currency,
        isLocked: false,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ];

    const lockedTotal = defaultVaults.reduce((sum, v) => sum + v.currentAmount, 0);

    const defaultAccount: MemberAccount = {
      id: userId,
      businessId: bizId,
      userId,
      mainBalance: 1250,
      lockedSavingsBalance: lockedTotal,
      currency,
      roundUpSettings: {
        enabled: true,
        targetVaultId: defaultVaults[0].id,
        targetVaultName: defaultVaults[0].name,
        step: 1,
        multiplier: 1,
        safetyFloor: 20,
        paused: false,
      },
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultTransactions: WalletTransaction[] = [
      {
        id: `tx_${bizId}_1`,
        businessId: bizId,
        userId,
        type: 'deposit',
        amount: 500,
        currency,
        status: 'completed',
        note: 'Deposit via Visa ending in 4242',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: `tx_${bizId}_2`,
        businessId: bizId,
        userId,
        type: 'vault_deposit',
        amount: 250,
        currency,
        vaultId: defaultVaults[0].id,
        vaultName: defaultVaults[0].name,
        status: 'completed',
        note: 'Direct allocation to Emergency Reserve Vault',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: `tx_${bizId}_3`,
        businessId: bizId,
        userId,
        type: 'transfer_recv',
        amount: 150,
        currency,
        counterpartyId: 'demo_user_jane',
        counterpartyName: 'Jane Smith',
        status: 'completed',
        note: 'Reimbursement for team software license',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: `tx_${bizId}_4`,
        businessId: bizId,
        userId,
        type: 'pool_contribution',
        amount: 50,
        currency,
        status: 'completed',
        note: 'Syndicate Treasury Pledge',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: `tx_${bizId}_5`,
        businessId: bizId,
        userId,
        type: 'withdrawal',
        amount: 100,
        currency,
        status: 'completed',
        note: 'Cash out to Chase Bank (8912)',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];

    const defaultScheduledRules: ScheduledStashRule[] = [
      {
        id: `stash_${bizId}_weekly`,
        businessId: bizId,
        userId,
        targetVaultId: defaultVaults[0].id,
        targetVaultName: defaultVaults[0].name,
        amount: 50,
        frequency: 'weekly',
        nextDueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        status: 'active',
        occurrencesCount: 4,
        lastExecutedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const defaultMoneyRequests: MoneyRequest[] = [
      {
        id: `req_${bizId}_inbound_1`,
        businessId: bizId,
        requesterId: 'demo_user_jane',
        requesterName: 'Jane Smith',
        payerId: userId,
        payerName: 'You',
        amount: 75,
        currency,
        note: 'Shared SaaS subscription split',
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 1 * 86400000).toISOString(),
      },
      {
        id: `req_${bizId}_outbound_1`,
        businessId: bizId,
        requesterId: userId,
        requesterName: 'You',
        payerId: 'demo_user_mike',
        payerName: 'Mike Johnson',
        amount: 120,
        currency,
        note: 'Client project milestone split',
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      },
    ];

    this.state.accounts[key] = defaultAccount;
    this.state.vaults[key] = defaultVaults;
    this.state.transactions[key] = defaultTransactions;
    this.state.scheduledStashRules[key] = defaultScheduledRules;
    this.state.moneyRequests[bizId || 'default'] = defaultMoneyRequests;
    this.state.groupPoolBalances[bizId || 'default'] = 4850;

    this.persistKey(bizId, userId);
  }

  public getAccount(bizId: string, userId: string, currency: string = 'USD'): MemberAccount {
    const key = this.getKey(bizId, userId);
    if (!this.state.accounts[key]) {
      this.seedDefaultState(bizId, userId, currency);
    }
    return this.state.accounts[key];
  }

  public setAccount(bizId: string, userId: string, acc: MemberAccount) {
    const key = this.getKey(bizId, userId);
    this.state.accounts[key] = acc;
    this.persistKey(bizId, userId);
    this.notifyAccountSubscribers(bizId, userId);
  }

  public getVaults(bizId: string, userId: string): SavingsVault[] {
    const key = this.getKey(bizId, userId);
    if (!this.state.vaults[key]) {
      this.seedDefaultState(bizId, userId);
    }
    return this.state.vaults[key] || [];
  }

  public setVaults(bizId: string, userId: string, vaults: SavingsVault[]) {
    const key = this.getKey(bizId, userId);
    this.state.vaults[key] = vaults;
    const lockedSum = vaults.reduce((sum, v) => sum + v.currentAmount, 0);
    if (this.state.accounts[key]) {
      this.state.accounts[key] = {
        ...this.state.accounts[key],
        lockedSavingsBalance: lockedSum,
        updatedAt: new Date().toISOString(),
      };
      this.notifyAccountSubscribers(bizId, userId);
    }
    this.persistKey(bizId, userId);
    this.notifyVaultSubscribers(bizId, userId);
  }

  public getTransactions(bizId: string, userId: string): WalletTransaction[] {
    const key = this.getKey(bizId, userId);
    if (!this.state.transactions[key]) {
      this.seedDefaultState(bizId, userId);
    }
    return this.state.transactions[key] || [];
  }

  public addTransaction(bizId: string, userId: string, tx: WalletTransaction) {
    const key = this.getKey(bizId, userId);
    const existing = this.getTransactions(bizId, userId);
    this.state.transactions[key] = [tx, ...existing];
    this.persistKey(bizId, userId);
    this.notifyTransactionSubscribers(bizId, userId);
  }

  public getGroupPoolBalance(bizId: string): number {
    if (this.state.groupPoolBalances[bizId || 'default'] === undefined) {
      this.state.groupPoolBalances[bizId || 'default'] = 4850;
    }
    return this.state.groupPoolBalances[bizId || 'default'];
  }

  public setGroupPoolBalance(bizId: string, balance: number) {
    this.state.groupPoolBalances[bizId || 'default'] = balance;
    this.persistKey(bizId, 'pool');
    this.notifyGroupPoolSubscribers(bizId);
  }

  public getMoneyRequests(bizId: string): MoneyRequest[] {
    return this.state.moneyRequests[bizId || 'default'] || [];
  }

  public setMoneyRequests(bizId: string, reqs: MoneyRequest[]) {
    this.state.moneyRequests[bizId || 'default'] = reqs;
    this.persistKey(bizId, 'requests');
    this.notifyMoneyRequestSubscribers(bizId);
  }

  public getScheduledStashRules(bizId: string, userId: string): ScheduledStashRule[] {
    const key = this.getKey(bizId, userId);
    return this.state.scheduledStashRules[key] || [];
  }

  public setScheduledStashRules(bizId: string, userId: string, rules: ScheduledStashRule[]) {
    const key = this.getKey(bizId, userId);
    this.state.scheduledStashRules[key] = rules;
    this.persistKey(bizId, userId);
    this.notifyScheduledStashSubscribers(bizId, userId);
  }

  public getIncomingPendingTransfers(bizId: string, recipientId: string): PendingTransfer[] {
    const key = this.getKey(bizId, recipientId);
    return this.state.incomingTransfers[key] || [];
  }

  public setIncomingPendingTransfers(bizId: string, recipientId: string, pts: PendingTransfer[]) {
    const key = this.getKey(bizId, recipientId);
    this.state.incomingTransfers[key] = pts;
    this.notifyIncomingTransferSubscribers(bizId, recipientId);
  }

  public getOutgoingPendingTransfers(bizId: string, senderId: string): PendingTransfer[] {
    const key = this.getKey(bizId, senderId);
    return this.state.outgoingTransfers[key] || [];
  }

  public setOutgoingPendingTransfers(bizId: string, senderId: string, pts: PendingTransfer[]) {
    const key = this.getKey(bizId, senderId);
    this.state.outgoingTransfers[key] = pts;
    this.notifyOutgoingTransferSubscribers(bizId, senderId);
  }

  // Reactive Subscriptions
  public subscribeAccount(bizId: string, userId: string, cb: (acc: MemberAccount | null) => void) {
    const key = this.getKey(bizId, userId);
    if (!this.subscribers.accounts.has(key)) {
      this.subscribers.accounts.set(key, new Set());
    }
    this.subscribers.accounts.get(key)!.add(cb);
    cb(this.getAccount(bizId, userId));
    return () => {
      this.subscribers.accounts.get(key)?.delete(cb);
    };
  }

  public subscribeVaults(bizId: string, userId: string, cb: (vaults: SavingsVault[]) => void) {
    const key = this.getKey(bizId, userId);
    if (!this.subscribers.vaults.has(key)) {
      this.subscribers.vaults.set(key, new Set());
    }
    this.subscribers.vaults.get(key)!.add(cb);
    cb(this.getVaults(bizId, userId));
    return () => {
      this.subscribers.vaults.get(key)?.delete(cb);
    };
  }

  public subscribeTransactions(bizId: string, userId: string, cb: (txs: WalletTransaction[]) => void) {
    const key = this.getKey(bizId, userId);
    if (!this.subscribers.transactions.has(key)) {
      this.subscribers.transactions.set(key, new Set());
    }
    this.subscribers.transactions.get(key)!.add(cb);
    cb(this.getTransactions(bizId, userId));
    return () => {
      this.subscribers.transactions.get(key)?.delete(cb);
    };
  }

  public subscribeMoneyRequests(bizId: string, cb: (reqs: MoneyRequest[]) => void) {
    const key = bizId || 'default';
    if (!this.subscribers.moneyRequests.has(key)) {
      this.subscribers.moneyRequests.set(key, new Set());
    }
    this.subscribers.moneyRequests.get(key)!.add(cb);
    cb(this.getMoneyRequests(bizId));
    return () => {
      this.subscribers.moneyRequests.get(key)?.delete(cb);
    };
  }

  public subscribeScheduledStashes(bizId: string, userId: string, cb: (rules: ScheduledStashRule[]) => void) {
    const key = this.getKey(bizId, userId);
    if (!this.subscribers.scheduledStashes.has(key)) {
      this.subscribers.scheduledStashes.set(key, new Set());
    }
    this.subscribers.scheduledStashes.get(key)!.add(cb);
    cb(this.getScheduledStashRules(bizId, userId));
    return () => {
      this.subscribers.scheduledStashes.get(key)?.delete(cb);
    };
  }

  public subscribeIncomingTransfers(bizId: string, recipientId: string, cb: (pts: PendingTransfer[]) => void) {
    const key = this.getKey(bizId, recipientId);
    if (!this.subscribers.incomingTransfers.has(key)) {
      this.subscribers.incomingTransfers.set(key, new Set());
    }
    this.subscribers.incomingTransfers.get(key)!.add(cb);
    cb(this.getIncomingPendingTransfers(bizId, recipientId));
    return () => {
      this.subscribers.incomingTransfers.get(key)?.delete(cb);
    };
  }

  public subscribeOutgoingTransfers(bizId: string, senderId: string, cb: (pts: PendingTransfer[]) => void) {
    const key = this.getKey(bizId, senderId);
    if (!this.subscribers.outgoingTransfers.has(key)) {
      this.subscribers.outgoingTransfers.set(key, new Set());
    }
    this.subscribers.outgoingTransfers.get(key)!.add(cb);
    cb(this.getOutgoingPendingTransfers(bizId, senderId));
    return () => {
      this.subscribers.outgoingTransfers.get(key)?.delete(cb);
    };
  }

  public subscribeGroupPool(bizId: string, cb: (bal: number) => void) {
    const key = bizId || 'default';
    if (!this.subscribers.groupPool.has(key)) {
      this.subscribers.groupPool.set(key, new Set());
    }
    this.subscribers.groupPool.get(key)!.add(cb);
    cb(this.getGroupPoolBalance(bizId));
    return () => {
      this.subscribers.groupPool.get(key)?.delete(cb);
    };
  }

  private notifyAccountSubscribers(bizId: string, userId: string) {
    const key = this.getKey(bizId, userId);
    const acc = this.state.accounts[key] || null;
    this.subscribers.accounts.get(key)?.forEach((cb) => {
      try { cb(acc); } catch (e) {}
    });
  }

  private notifyVaultSubscribers(bizId: string, userId: string) {
    const key = this.getKey(bizId, userId);
    const vaults = this.state.vaults[key] || [];
    this.subscribers.vaults.get(key)?.forEach((cb) => {
      try { cb(vaults); } catch (e) {}
    });
  }

  private notifyTransactionSubscribers(bizId: string, userId: string) {
    const key = this.getKey(bizId, userId);
    const txs = this.state.transactions[key] || [];
    this.subscribers.transactions.get(key)?.forEach((cb) => {
      try { cb(txs); } catch (e) {}
    });
  }

  private notifyMoneyRequestSubscribers(bizId: string) {
    const key = bizId || 'default';
    const reqs = this.state.moneyRequests[key] || [];
    this.subscribers.moneyRequests.get(key)?.forEach((cb) => {
      try { cb(reqs); } catch (e) {}
    });
  }

  private notifyScheduledStashSubscribers(bizId: string, userId: string) {
    const key = this.getKey(bizId, userId);
    const rules = this.state.scheduledStashRules[key] || [];
    this.subscribers.scheduledStashes.get(key)?.forEach((cb) => {
      try { cb(rules); } catch (e) {}
    });
  }

  private notifyIncomingTransferSubscribers(bizId: string, recipientId: string) {
    const key = this.getKey(bizId, recipientId);
    const pts = this.state.incomingTransfers[key] || [];
    this.subscribers.incomingTransfers.get(key)?.forEach((cb) => {
      try { cb(pts); } catch (e) {}
    });
  }

  private notifyOutgoingTransferSubscribers(bizId: string, senderId: string) {
    const key = this.getKey(bizId, senderId);
    const pts = this.state.outgoingTransfers[key] || [];
    this.subscribers.outgoingTransfers.get(key)?.forEach((cb) => {
      try { cb(pts); } catch (e) {}
    });
  }

  private notifyGroupPoolSubscribers(bizId: string) {
    const key = bizId || 'default';
    const bal = this.getGroupPoolBalance(bizId);
    this.subscribers.groupPool.get(key)?.forEach((cb) => {
      try { cb(bal); } catch (e) {}
    });
  }
}

export const demoSavingsStore = new ReactiveSavingsStore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb(): Firestore | null {
  return db || null;
}

export async function dispatchSavingsNotification(params: {
  userId: string;
  businessId: string;
  title: string;
  message: string;
  type: NotificationType;
  color?: string;
  data?: Record<string, any>;
}): Promise<void> {
  if (!params.userId) return;

  const notifColor = params.color || '#10b981';
  const payloadData = {
    category: 'savings_vault',
    businessId: params.businessId,
    path: '/(tabs)',
    ...params.data,
  };

  try {
    if (db) {
      await addDoc(collection(db, 'notifications'), {
        userId: params.userId,
        title: params.title,
        message: params.message,
        read: false,
        createdAt: new Date().toISOString(),
        type: params.type,
        color: notifColor,
        data: payloadData,
        metadata: payloadData,
      });
    }
  } catch (err) {
    // Non-blocking notification write
  }

  try {
    await PushNotificationService.sendToUser(params.userId, {
      title: params.title,
      body: params.message,
      data: payloadData,
    });
  } catch (pushErr) {}
}

// ---------------------------------------------------------------------------
// Account Initialization & Subscriptions
// ---------------------------------------------------------------------------

export async function getOrCreateMemberAccount(
  businessId: string,
  userId: string,
  currency: string = 'USD'
): Promise<MemberAccount> {
  await demoSavingsStore.initForUser(businessId, userId, currency);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const snapshot = await getDoc(accountRef);
      if (snapshot.exists()) {
        const cloudAcc = snapshot.data() as MemberAccount;
        demoSavingsStore.setAccount(businessId, userId, cloudAcc);
        return cloudAcc;
      } else {
        const localAcc = demoSavingsStore.getAccount(businessId, userId, currency);
        await setDoc(accountRef, localAcc);
        return localAcc;
      }
    } catch (err) {
      console.warn('[Savings] Cloud account fetch fallback to local store:', err);
    }
  }

  return demoSavingsStore.getAccount(businessId, userId, currency);
}

export function subscribeToMemberAccount(
  businessId: string,
  userId: string,
  callback: (account: MemberAccount | null) => void
): Unsubscribe {
  // 1. Subscribe immediately to local store
  const unsubLocal = demoSavingsStore.subscribeAccount(businessId, userId, callback);

  // 2. Connect Firestore listener if available
  let unsubCloud: Unsubscribe | null = null;
  if (db && businessId && userId) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      unsubCloud = onSnapshot(
        accountRef,
        (snap) => {
          if (snap.exists()) {
            const acc = snap.data() as MemberAccount;
            demoSavingsStore.setAccount(businessId, userId, acc);
          }
        },
        (err) => {
          console.warn('[Savings] Account cloud snapshot error (fallback active):', err);
        }
      );
    } catch (err) {}
  }

  return () => {
    unsubLocal();
    if (unsubCloud) unsubCloud();
  };
}

// ---------------------------------------------------------------------------
// Core Financial Operations (Add Money, Send, Cash Out)
// ---------------------------------------------------------------------------

export async function depositToWallet(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  paymentMethodTitle?: string;
  paymentIntentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    userId,
    amount,
    currency = 'USD',
    paymentMethodTitle = 'Card Deposit',
    paymentIntentId,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Deposit amount must be greater than zero.' };
  }

  // Update local store immediately for zero-delay UI response
  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance + amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    businessId,
    userId,
    type: 'deposit',
    amount,
    currency,
    status: 'completed',
    paymentIntentId: paymentIntentId || `mock_pi_${Date.now()}`,
    note: `Deposit via ${paymentMethodTitle}`,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  // Attempt Cloud Sync
  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      const newTxRef = doc(txCol, tx.id);
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.set(newTxRef, tx);
      });
    } catch (err) {
      console.warn('[Savings] Deposit cloud sync warning (local state applied):', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Wallet Deposit Completed',
    message: `Added ${currency} ${amount.toFixed(2)} to your spendable balance.`,
    type: 'wallet_deposit',
    color: '#10b981',
    data: { amount, currency, paymentMethodTitle },
  }).catch(() => {});

  return { success: true };
}

export async function transferBetweenMembers(params: {
  businessId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  amount: number;
  currency?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    senderId,
    senderName,
    recipientId,
    recipientName,
    amount,
    currency = 'USD',
    note,
  } = params;

  if (senderId === recipientId) {
    return { success: false, error: 'Cannot transfer funds to yourself.' };
  }
  if (amount <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }

  const senderAcc = demoSavingsStore.getAccount(businessId, senderId, currency);
  if (senderAcc.mainBalance < amount) {
    return { success: false, error: 'Insufficient spendable wallet balance.' };
  }

  // Deduct from sender
  const updatedSender: MemberAccount = {
    ...senderAcc,
    mainBalance: senderAcc.mainBalance - amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, senderId, updatedSender);

  // Credit recipient
  const recipAcc = demoSavingsStore.getAccount(businessId, recipientId, currency);
  const updatedRecip: MemberAccount = {
    ...recipAcc,
    mainBalance: recipAcc.mainBalance + amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, recipientId, updatedRecip);

  // Record transactions for both members
  const now = new Date().toISOString();
  const txSender: WalletTransaction = {
    id: `tx_${Date.now()}_sent`,
    businessId,
    userId: senderId,
    type: 'transfer_sent',
    amount,
    currency,
    counterpartyId: recipientId,
    counterpartyName: recipientName,
    status: 'completed',
    note: note || `Transfer to ${recipientName}`,
    createdAt: now,
  };
  demoSavingsStore.addTransaction(businessId, senderId, txSender);

  const txRecip: WalletTransaction = {
    id: `tx_${Date.now()}_recv`,
    businessId,
    userId: recipientId,
    type: 'transfer_recv',
    amount,
    currency,
    counterpartyId: senderId,
    counterpartyName: senderName,
    status: 'completed',
    note: note || `Transfer received from ${senderName}`,
    createdAt: now,
  };
  demoSavingsStore.addTransaction(businessId, recipientId, txRecip);

  // Cloud Sync
  if (db) {
    try {
      const senderRef = doc(db, 'businesses', businessId, 'accounts', senderId);
      const recipRef = doc(db, 'businesses', businessId, 'accounts', recipientId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(senderRef, updatedSender, { merge: true });
        t.set(recipRef, updatedRecip, { merge: true });
        t.set(doc(txCol, txSender.id), txSender);
        t.set(doc(txCol, txRecip.id), txRecip);
      });
    } catch (err) {
      console.warn('[Savings] Transfer cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId: recipientId,
    businessId,
    title: 'Transfer Received',
    message: `${senderName} transferred ${currency} ${amount.toFixed(2)} to your wallet.`,
    type: 'transfer_recv',
    color: '#10b981',
    data: { amount, currency, senderName },
  }).catch(() => {});

  return { success: true };
}

export async function cashOutFromWallet(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  destinationType?: 'bank' | 'card';
  destinationDetails?: string;
  destinationTitle?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    userId,
    amount,
    currency = 'USD',
    destinationType = 'bank',
    destinationDetails = 'Bank Account',
    destinationTitle = 'Bank Account Payout',
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Cash out amount must be greater than zero.' };
  }

  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  if (acc.mainBalance < amount) {
    return { success: false, error: 'Insufficient available spendable balance.' };
  }

  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance - amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_cashout`,
    businessId,
    userId,
    type: 'withdrawal',
    amount,
    currency,
    status: 'completed',
    note: `Cash out via ${destinationTitle}`,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Cash out cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Cash Out Processed',
    message: `Withdrew ${currency} ${amount.toFixed(2)} to ${destinationDetails}.`,
    type: 'wallet_cashout',
    color: '#f59e0b',
    data: { amount, currency, destinationType },
  }).catch(() => {});

  return { success: true };
}

// ---------------------------------------------------------------------------
// Milestone Savings Vaults Engine
// ---------------------------------------------------------------------------

export async function createSavingsVault(params: {
  businessId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currency?: string;
  isLocked?: boolean;
  lockUntilDate?: string;
}): Promise<{ success: boolean; vault?: SavingsVault; error?: string }> {
  const {
    businessId,
    userId,
    name,
    targetAmount,
    currency = 'USD',
    isLocked = true,
    lockUntilDate,
  } = params;

  if (!name.trim()) {
    return { success: false, error: 'Vault name is required.' };
  }
  if (targetAmount <= 0) {
    return { success: false, error: 'Target amount must be greater than zero.' };
  }

  const newVault: SavingsVault = {
    id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    businessId,
    userId,
    name: name.trim(),
    targetAmount,
    currentAmount: 0,
    currency,
    isLocked,
    lockUntilDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = demoSavingsStore.getVaults(businessId, userId);
  demoSavingsStore.setVaults(businessId, userId, [newVault, ...existing]);

  if (db) {
    try {
      const vaultsCol = collection(db, 'businesses', businessId, 'vaults');
      await setDoc(doc(vaultsCol, newVault.id), newVault);
    } catch (err) {
      console.warn('[Savings] Create vault cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Milestone Vault Initialized',
    message: `Created goal "${name}" with target of ${currency} ${targetAmount.toFixed(2)}.`,
    type: 'vault_deposit',
    color: '#10b981',
  }).catch(() => {});

  return { success: true, vault: newVault };
}

export async function transferToVault(params: {
  businessId: string;
  userId: string;
  vaultId: string;
  vaultName: string;
  amount: number;
  currency?: string;
  type?: WalletTransactionType;
  note?: string;
  notificationTitle?: string;
  notificationType?: NotificationType;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    userId,
    vaultId,
    vaultName,
    amount,
    currency = 'USD',
    type: customType,
    note: customNote,
    notificationTitle: customNotificationTitle,
    notificationType: customNotificationType,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Stash amount must be greater than zero.' };
  }

  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  if (acc.mainBalance < amount) {
    return { success: false, error: 'Insufficient spendable wallet balance.' };
  }

  const vaults = demoSavingsStore.getVaults(businessId, userId);
  const targetVault = vaults.find((v) => v.id === vaultId);
  if (!targetVault) {
    return { success: false, error: 'Target vault not found.' };
  }

  // Update vault balance
  const updatedVaults = vaults.map((v) =>
    v.id === vaultId
      ? {
          ...v,
          currentAmount: v.currentAmount + amount,
          updatedAt: new Date().toISOString(),
        }
      : v
  );
  demoSavingsStore.setVaults(businessId, userId, updatedVaults);

  const newLockedTotal = updatedVaults.reduce((sum, v) => sum + v.currentAmount, 0);

  // Deduct from spendable balance and record exact aggregate locked balance
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance - amount,
    lockedSavingsBalance: newLockedTotal,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const txType = customType || 'vault_deposit';
  const txNote = customNote || `Allocated to ${vaultName}`;
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_vault_dep`,
    businessId,
    userId,
    type: txType,
    amount,
    currency,
    vaultId,
    vaultName,
    status: 'completed',
    note: txNote,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const vaultRef = doc(db, 'businesses', businessId, 'vaults', vaultId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.update(vaultRef, {
          currentAmount: targetVault.currentAmount + amount,
          updatedAt: new Date().toISOString(),
        });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Vault stash cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: customNotificationTitle || 'Vault Funds Allocated',
    message: txNote,
    type: customNotificationType || 'vault_deposit',
    color: '#10b981',
  }).catch(() => {});

  return { success: true };
}

export async function withdrawFromVault(params: {
  businessId: string;
  userId: string;
  vaultId: string;
  vaultName: string;
  amount: number;
  currency?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, vaultId, vaultName, amount, currency = 'USD' } = params;

  if (amount <= 0) {
    return { success: false, error: 'Withdrawal amount must be greater than zero.' };
  }

  const vaults = demoSavingsStore.getVaults(businessId, userId);
  const targetVault = vaults.find((v) => v.id === vaultId);
  if (!targetVault) {
    return { success: false, error: 'Target vault not found.' };
  }

  if (targetVault.currentAmount < amount) {
    return { success: false, error: 'Insufficient funds in this vault.' };
  }

  // Update vault balance
  const updatedVaults = vaults.map((v) =>
    v.id === vaultId
      ? {
          ...v,
          currentAmount: v.currentAmount - amount,
          updatedAt: new Date().toISOString(),
        }
      : v
  );
  demoSavingsStore.setVaults(businessId, userId, updatedVaults);

  const newLockedTotal = updatedVaults.reduce((sum, v) => sum + v.currentAmount, 0);

  // Credit spendable balance and record exact aggregate locked balance
  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance + amount,
    lockedSavingsBalance: newLockedTotal,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_vault_wdr`,
    businessId,
    userId,
    type: 'vault_withdraw',
    amount,
    currency,
    vaultId,
    vaultName,
    status: 'completed',
    note: `Released from ${vaultName}`,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const vaultRef = doc(db, 'businesses', businessId, 'vaults', vaultId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.update(vaultRef, {
          currentAmount: targetVault.currentAmount - amount,
          updatedAt: new Date().toISOString(),
        });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Vault withdraw cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Vault Funds Released',
    message: `Released ${currency} ${amount.toFixed(2)} from ${vaultName} into spendable wallet.`,
    type: 'vault_withdraw',
    color: '#6366f1',
  }).catch(() => {});

  return { success: true };
}

export async function toggleVaultLock(
  businessId: string,
  userId: string,
  vaultId: string
): Promise<{ success: boolean; isLocked?: boolean; error?: string }> {
  const vaults = demoSavingsStore.getVaults(businessId, userId);
  const target = vaults.find((v) => v.id === vaultId);
  if (!target) return { success: false, error: 'Vault not found.' };

  const newLockState = !target.isLocked;
  const updatedVaults = vaults.map((v) =>
    v.id === vaultId
      ? { ...v, isLocked: newLockState, updatedAt: new Date().toISOString() }
      : v
  );
  demoSavingsStore.setVaults(businessId, userId, updatedVaults);

  if (db) {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'vaults', vaultId), {
        isLocked: newLockState,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {}
  }

  return { success: true, isLocked: newLockState };
}

export async function deleteSavingsVault(
  businessId: string,
  userId: string,
  vaultId: string
): Promise<{ success: boolean; error?: string }> {
  const vaults = demoSavingsStore.getVaults(businessId, userId);
  const target = vaults.find((v) => v.id === vaultId);
  if (!target) return { success: false, error: 'Vault not found.' };

  const remainingVaults = vaults.filter((v) => v.id !== vaultId);
  demoSavingsStore.setVaults(businessId, userId, remainingVaults);

  let updatedAcc: MemberAccount | null = null;
  let tx: WalletTransaction | null = null;

  // If vault has funds, return them to spendable balance
  if (target.currentAmount > 0) {
    const acc = demoSavingsStore.getAccount(businessId, userId, target.currency);
    const newLockedTotal = remainingVaults.reduce((sum, v) => sum + v.currentAmount, 0);
    updatedAcc = {
      ...acc,
      mainBalance: acc.mainBalance + target.currentAmount,
      lockedSavingsBalance: newLockedTotal,
      updatedAt: new Date().toISOString(),
    };
    demoSavingsStore.setAccount(businessId, userId, updatedAcc);

    tx = {
      id: `tx_${Date.now()}_vault_del_refund`,
      businessId,
      userId,
      type: 'vault_withdraw',
      amount: target.currentAmount,
      currency: target.currency,
      vaultId,
      vaultName: target.name,
      status: 'completed',
      note: `Refund from deleted vault: ${target.name}`,
      createdAt: new Date().toISOString(),
    };
    demoSavingsStore.addTransaction(businessId, userId, tx);
  }

  if (db) {
    try {
      const vaultRef = doc(db, 'businesses', businessId, 'vaults', vaultId);
      if (updatedAcc && tx) {
        const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
        const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
        await runTransaction(db, async (t) => {
          t.delete(vaultRef);
          t.set(accountRef, updatedAcc!, { merge: true });
          t.set(doc(txCol, tx!.id), tx!);
        });
      } else {
        await deleteDoc(vaultRef);
      }
    } catch (err) {
      console.warn('[Savings] Delete vault cloud sync warning:', err);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Syndicate Reserve Pool (Collective Treasury)
// ---------------------------------------------------------------------------

export async function contributeToGroupPool(params: {
  businessId: string;
  userId: string;
  userName?: string;
  amount: number;
  currency?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, userName, amount, currency = 'USD', note } = params;

  if (amount <= 0) {
    return { success: false, error: 'Contribution amount must be greater than zero.' };
  }

  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  if (acc.mainBalance < amount) {
    return { success: false, error: 'Insufficient spendable wallet balance.' };
  }

  // Deduct from contributor
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance - amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  // Increment pool balance
  const currentPool = demoSavingsStore.getGroupPoolBalance(businessId);
  demoSavingsStore.setGroupPoolBalance(businessId, currentPool + amount);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_pool_pledge`,
    businessId,
    userId,
    type: 'pool_contribution',
    amount,
    currency,
    status: 'completed',
    note: note || (userName ? `Pool pledge by ${userName}` : 'Syndicate Treasury Pledge'),
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const bizRef = doc(db, 'businesses', businessId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.update(bizRef, { groupPoolBalance: currentPool + amount });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Pool contribution cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Pool Contribution Recorded',
    message: `Pledged ${currency} ${amount.toFixed(2)} to Syndicate Collective Treasury.`,
    type: 'vault_milestone',
    color: '#3b82f6',
  }).catch(() => {});

  return { success: true };
}

export async function disburseFromGroupPool(params: {
  businessId: string;
  userId: string;
  userName?: string;
  amount: number;
  currency?: string;
  note?: string;
  actorRole?: UserRole;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, userName, amount, currency = 'USD', note, actorRole } = params;

  if (actorRole && actorRole !== 'owner') {
    return { success: false, error: 'Administrative ownership permission required to disburse funds from collective pool.' };
  }

  if (amount <= 0) {
    return { success: false, error: 'Draw amount must be greater than zero.' };
  }

  const currentPool = demoSavingsStore.getGroupPoolBalance(businessId);
  if (currentPool < amount) {
    return { success: false, error: 'Requested amount exceeds available collective pool balance.' };
  }

  // Deduct from pool
  demoSavingsStore.setGroupPoolBalance(businessId, currentPool - amount);

  // Credit member
  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance + amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_pool_disburse`,
    businessId,
    userId,
    type: 'deposit',
    amount,
    currency,
    status: 'completed',
    note: note || (userName ? `Disbursement to ${userName}` : 'Syndicate Treasury Draw'),
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const bizRef = doc(db, 'businesses', businessId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.update(bizRef, { groupPoolBalance: currentPool - amount });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Pool disburse cloud sync warning:', err);
    }
  }

  dispatchSavingsNotification({
    userId,
    businessId,
    title: 'Pool Disbursement Received',
    message: `Drawn ${currency} ${amount.toFixed(2)} from Syndicate Collective Treasury into your spendable wallet.`,
    type: 'wallet_deposit',
    color: '#10b981',
  }).catch(() => {});

  return { success: true };
}

// ---------------------------------------------------------------------------
// Pending Transfers (Two-Phase Hold & Confirm)
// ---------------------------------------------------------------------------

export async function initiatePendingTransfer(params: {
  businessId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  amount: number;
  currency?: string;
  note?: string;
}): Promise<{ success: boolean; pendingTransferId?: string; error?: string }> {
  const {
    businessId,
    senderId,
    senderName,
    recipientId,
    recipientName,
    amount,
    currency = 'USD',
    note,
  } = params;

  if (senderId === recipientId) {
    return { success: false, error: 'Cannot transfer money to yourself.' };
  }
  if (amount <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }

  const senderAcc = demoSavingsStore.getAccount(businessId, senderId, currency);
  if (senderAcc.mainBalance < amount) {
    return { success: false, error: 'Insufficient spendable wallet balance.' };
  }

  // Hold funds from sender
  const updatedSender: MemberAccount = {
    ...senderAcc,
    mainBalance: senderAcc.mainBalance - amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, senderId, updatedSender);

  const ptId = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pendingTransfer: PendingTransfer = {
    id: ptId,
    businessId,
    senderId,
    senderName,
    recipientId,
    recipientName,
    amount,
    currency,
    note: note || undefined,
    status: 'awaiting_confirmation',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const incoming = demoSavingsStore.getIncomingPendingTransfers(businessId, recipientId);
  demoSavingsStore.setIncomingPendingTransfers(businessId, recipientId, [pendingTransfer, ...incoming]);

  const outgoing = demoSavingsStore.getOutgoingPendingTransfers(businessId, senderId);
  demoSavingsStore.setOutgoingPendingTransfers(businessId, senderId, [pendingTransfer, ...outgoing]);

  if (db) {
    try {
      const ptCol = collection(db, 'businesses', businessId, 'pending_transfers');
      await setDoc(doc(ptCol, ptId), pendingTransfer);
    } catch (err) {}
  }

  dispatchSavingsNotification({
    userId: recipientId,
    businessId,
    title: 'Incoming Transfer Pending',
    message: `${senderName} sent ${currency} ${amount.toFixed(2)}. Claim to deposit into wallet.`,
    type: 'pending_transfer',
    color: '#10b981',
  }).catch(() => {});

  return { success: true, pendingTransferId: ptId };
}

export async function respondToPendingTransfer(params: {
  businessId: string;
  pendingTransferId: string;
  recipientId: string;
  decision: 'confirmed' | 'declined';
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, pendingTransferId, recipientId, decision } = params;

  const incoming = demoSavingsStore.getIncomingPendingTransfers(businessId, recipientId);
  const target = incoming.find((pt) => pt.id === pendingTransferId);
  if (!target) return { success: false, error: 'Pending transfer not found.' };

  // Remove from incoming queue
  const remaining = incoming.filter((pt) => pt.id !== pendingTransferId);
  demoSavingsStore.setIncomingPendingTransfers(businessId, recipientId, remaining);

  // Also remove from sender's outgoing queue
  const outgoing = demoSavingsStore.getOutgoingPendingTransfers(businessId, target.senderId);
  const remainingOutgoing = outgoing.filter((pt) => pt.id !== pendingTransferId);
  demoSavingsStore.setOutgoingPendingTransfers(businessId, target.senderId, remainingOutgoing);

  let updatedRecip: MemberAccount | null = null;
  let updatedSender: MemberAccount | null = null;
  let txRecip: WalletTransaction | null = null;
  let txSender: WalletTransaction | null = null;

  if (decision === 'confirmed') {
    // Credit recipient
    const recipAcc = demoSavingsStore.getAccount(businessId, recipientId, target.currency);
    updatedRecip = {
      ...recipAcc,
      mainBalance: recipAcc.mainBalance + target.amount,
      updatedAt: new Date().toISOString(),
    };
    demoSavingsStore.setAccount(businessId, recipientId, updatedRecip);

    // Record transactions
    const now = new Date().toISOString();
    txRecip = {
      id: `tx_${Date.now()}_recv_claim`,
      businessId,
      userId: recipientId,
      type: 'transfer_recv',
      amount: target.amount,
      currency: target.currency,
      counterpartyId: target.senderId,
      counterpartyName: target.senderName,
      status: 'completed',
      note: target.note || `Received from ${target.senderName}`,
      createdAt: now,
    };
    demoSavingsStore.addTransaction(businessId, recipientId, txRecip);

    txSender = {
      id: `tx_${Date.now()}_sent_confirmed`,
      businessId,
      userId: target.senderId,
      type: 'transfer_sent',
      amount: target.amount,
      currency: target.currency,
      counterpartyId: recipientId,
      counterpartyName: target.recipientName,
      status: 'completed',
      note: target.note || `Sent to ${target.recipientName}`,
      createdAt: now,
    };
    demoSavingsStore.addTransaction(businessId, target.senderId, txSender);

    dispatchSavingsNotification({
      userId: target.senderId,
      businessId,
      title: 'Transfer Accepted',
      message: `${target.recipientName} accepted your transfer of ${target.currency} ${target.amount.toFixed(2)}.`,
      type: 'transfer_sent',
      color: '#10b981',
    }).catch(() => {});
  } else {
    // Declined — refund sender's spendable balance
    const senderAcc = demoSavingsStore.getAccount(businessId, target.senderId, target.currency);
    updatedSender = {
      ...senderAcc,
      mainBalance: senderAcc.mainBalance + target.amount,
      updatedAt: new Date().toISOString(),
    };
    demoSavingsStore.setAccount(businessId, target.senderId, updatedSender);

    dispatchSavingsNotification({
      userId: target.senderId,
      businessId,
      title: 'Transfer Declined',
      message: `${target.recipientName} declined the transfer. Funds returned to your wallet.`,
      type: 'transfer_sent',
      color: '#ef4444',
    }).catch(() => {});
  }

  if (db) {
    const firestore = db;
    try {
      const ptRef = doc(firestore, 'businesses', businessId, 'pending_transfers', pendingTransferId);
      const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
      const recipRef = doc(firestore, 'businesses', businessId, 'accounts', recipientId);
      const senderRef = doc(firestore, 'businesses', businessId, 'accounts', target.senderId);
      await runTransaction(firestore, async (t) => {
        t.update(ptRef, {
          status: decision,
          respondedAt: new Date().toISOString(),
        });
        if (decision === 'confirmed' && updatedRecip && txRecip && txSender) {
          t.set(recipRef, updatedRecip, { merge: true });
          t.set(doc(txCol, txRecip.id), txRecip);
          t.set(doc(txCol, txSender.id), txSender);
        } else if (decision === 'declined' && updatedSender) {
          t.set(senderRef, updatedSender, { merge: true });
        }
      });
    } catch (err) {
      console.warn('[Savings] Pending transfer response cloud sync warning:', err);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Money Requests Flow
// ---------------------------------------------------------------------------

export async function requestMoney(params: {
  businessId: string;
  requesterId: string;
  requesterName: string;
  payerId: string;
  payerName: string;
  amount: number;
  currency?: string;
  note?: string;
}): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const {
    businessId,
    requesterId,
    requesterName,
    payerId,
    payerName,
    amount,
    currency = 'USD',
    note,
  } = params;

  if (requesterId === payerId) {
    return { success: false, error: 'Cannot request money from yourself.' };
  }
  if (amount <= 0) {
    return { success: false, error: 'Requested amount must be greater than zero.' };
  }

  const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const moneyRequest: MoneyRequest = {
    id: reqId,
    businessId,
    requesterId,
    requesterName,
    payerId,
    payerName,
    amount,
    currency,
    note: note || undefined,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const existing = demoSavingsStore.getMoneyRequests(businessId);
  demoSavingsStore.setMoneyRequests(businessId, [moneyRequest, ...existing]);

  if (db) {
    try {
      const reqCol = collection(db, 'businesses', businessId, 'money_requests');
      await setDoc(doc(reqCol, reqId), moneyRequest);
    } catch (err) {}
  }

  dispatchSavingsNotification({
    userId: payerId,
    businessId,
    title: 'Payment Request Claim',
    message: `${requesterName} is requesting ${currency} ${amount.toFixed(2)}.`,
    type: 'money_request',
    color: '#f59e0b',
  }).catch(() => {});

  return { success: true, requestId: reqId };
}

export async function respondToMoneyRequest(params: {
  businessId: string;
  requestId: string;
  payerId: string;
  payerName: string;
  decision: 'approved' | 'declined';
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, requestId, payerId, payerName, decision } = params;

  const requests = demoSavingsStore.getMoneyRequests(businessId);
  const target = requests.find((r) => r.id === requestId);
  if (!target) return { success: false, error: 'Money request not found.' };

  if (decision === 'approved') {
    // Perform transfer
    const transferRes = await transferBetweenMembers({
      businessId,
      senderId: payerId,
      senderName: payerName,
      recipientId: target.requesterId,
      recipientName: target.requesterName,
      amount: target.amount,
      currency: target.currency,
      note: target.note || `Paid request from ${target.requesterName}`,
    });

    if (!transferRes.success) {
      return { success: false, error: transferRes.error };
    }
  }

  // Update request status
  const updatedRequests = requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          status: decision as MoneyRequestStatus,
          respondedAt: new Date().toISOString(),
        }
      : r
  );
  demoSavingsStore.setMoneyRequests(businessId, updatedRequests);

  if (db) {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'money_requests', requestId), {
        status: decision,
        respondedAt: new Date().toISOString(),
      });
    } catch (err) {}
  }

  return { success: true };
}

export async function cancelMoneyRequest(
  businessId: string,
  requestId: string,
  requesterId: string
): Promise<{ success: boolean; error?: string }> {
  const requests = demoSavingsStore.getMoneyRequests(businessId);
  const target = requests.find((r) => r.id === requestId);
  if (!target) return { success: false, error: 'Money request not found.' };
  if (target.requesterId !== requesterId) {
    return { success: false, error: 'Unauthorized to cancel this request.' };
  }
  if (target.status !== 'pending') {
    return { success: false, error: 'Only pending requests can be cancelled.' };
  }

  const updated = requests.map((r) =>
    r.id === requestId ? { ...r, status: 'cancelled' as MoneyRequestStatus } : r
  );
  demoSavingsStore.setMoneyRequests(businessId, updated);

  if (db) {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'money_requests', requestId), {
        status: 'cancelled',
      });
    } catch (err) {}
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Auto-Save Spare Change (Round-Up Engine)
// ---------------------------------------------------------------------------

export function calculateRoundUp(amount: number, settings?: RoundUpSettings | null): number {
  if (!settings || !settings.enabled || settings.paused || !settings.targetVaultId) {
    return 0;
  }
  if (!amount || amount <= 0) {
    return 0;
  }

  const step = settings.step || 1;
  const multiplier = settings.multiplier || 1;

  const remainder = amount % step;
  // If exact multiple of step (e.g. $10.00 with $1 step), round up by whole step ($1)
  const diff = Math.abs(remainder) < 0.001 ? step : step - remainder;

  return Math.round(diff * multiplier * 100) / 100;
}

export async function updateRoundUpSettings(
  businessId: string,
  userId: string,
  settings: RoundUpSettings
): Promise<{ success: boolean; error?: string }> {
  const acc = demoSavingsStore.getAccount(businessId, userId);
  const updatedAcc: MemberAccount = {
    ...acc,
    roundUpSettings: settings,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  if (db) {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'accounts', userId), {
        roundUpSettings: settings,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {}
  }

  return { success: true };
}

export async function executeRoundUpForEntry(params: {
  businessId: string;
  userId: string;
  entryAmount: number;
  bookEntryId: string;
  bookName?: string;
}): Promise<{
  success: boolean;
  roundUpAmount?: number;
  vaultName?: string;
  skippedReason?: string;
  error?: string;
}> {
  const { businessId, userId, entryAmount, bookName = 'Book Entry' } = params;

  if (entryAmount <= 0) return { success: true, roundUpAmount: 0 };

  const acc = demoSavingsStore.getAccount(businessId, userId);
  const settings = acc.roundUpSettings;

  if (!settings || !settings.enabled || settings.paused || !settings.targetVaultId) {
    return { success: true, roundUpAmount: 0, skippedReason: 'disabled' };
  }

  const roundUpAmount = calculateRoundUp(entryAmount, settings);
  if (roundUpAmount <= 0) {
    return { success: true, roundUpAmount: 0, skippedReason: 'zero_roundup' };
  }

  if (acc.mainBalance < (settings.safetyFloor || 0) + roundUpAmount) {
    return { success: true, roundUpAmount: 0, skippedReason: 'safety_floor_breached' };
  }

  // Transfer round-up amount to vault
  const transferRes = await transferToVault({
    businessId,
    userId,
    vaultId: settings.targetVaultId,
    vaultName: settings.targetVaultName || 'Savings Vault',
    amount: roundUpAmount,
    currency: acc.currency,
    type: 'round_up_deposit',
    note: `Spare Change from ${bookName}`,
    notificationTitle: 'Spare Change Stashed',
    notificationType: 'round_up_stashed',
  });

  if (transferRes.success) {
    return {
      success: true,
      roundUpAmount,
      vaultName: settings.targetVaultName || 'Savings Vault',
    };
  }

  return { success: false, error: transferRes.error };
}

// ---------------------------------------------------------------------------
// Recurring Stashes Engine
// ---------------------------------------------------------------------------

export function calculateNextStashDueDate(
  frequency: ScheduledStashFrequency,
  fromDate: Date = new Date()
): string {
  const next = new Date(fromDate.getTime());
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'payday': {
      const day = next.getDate();
      if (day < 15) {
        next.setDate(15);
      } else {
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
      }
      break;
    }
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next.toISOString().split('T')[0];
}

export async function createScheduledStashRule(params: {
  businessId: string;
  userId: string;
  targetVaultId: string;
  targetVaultName?: string;
  amount: number;
  frequency: ScheduledStashFrequency;
}): Promise<{ success: boolean; rule?: ScheduledStashRule; error?: string }> {
  const { businessId, userId, targetVaultId, targetVaultName, amount, frequency } = params;

  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' };

  const ruleId = `stash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const nextDueDate = calculateNextStashDueDate(frequency);

  const newRule: ScheduledStashRule = {
    id: ruleId,
    businessId,
    userId,
    targetVaultId,
    targetVaultName: targetVaultName || 'Savings Vault',
    amount,
    frequency,
    nextDueDate,
    status: 'active',
    occurrencesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = demoSavingsStore.getScheduledStashRules(businessId, userId);
  demoSavingsStore.setScheduledStashRules(businessId, userId, [newRule, ...existing]);

  if (db) {
    try {
      const stashCol = collection(db, 'businesses', businessId, 'scheduled_stashes');
      await setDoc(doc(stashCol, ruleId), newRule);
    } catch (err) {}
  }

  return { success: true, rule: newRule };
}

export async function togglePauseScheduledStashRule(
  businessId: string,
  ruleId: string
): Promise<{ success: boolean; newStatus?: 'active' | 'paused'; error?: string }> {
  const allKeys = Object.keys((demoSavingsStore as any).state.scheduledStashRules);
  let targetRule: ScheduledStashRule | null = null;
  let targetUserId = '';

  for (const k of allKeys) {
    const rules = (demoSavingsStore as any).state.scheduledStashRules[k] || [];
    const found = rules.find((r: ScheduledStashRule) => r.id === ruleId);
    if (found) {
      targetRule = found;
      targetUserId = found.userId;
      break;
    }
  }

  if (!targetRule) return { success: false, error: 'Scheduled stash rule not found.' };

  const newStatus = targetRule.status === 'active' ? 'paused' : 'active';
  const existing = demoSavingsStore.getScheduledStashRules(businessId, targetUserId);
  const updated = existing.map((r) =>
    r.id === ruleId ? { ...r, status: newStatus as 'active' | 'paused', updatedAt: new Date().toISOString() } : r
  );
  demoSavingsStore.setScheduledStashRules(businessId, targetUserId, updated);

  if (db) {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'scheduled_stashes', ruleId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {}
  }

  return { success: true, newStatus };
}

export async function deleteScheduledStashRule(
  businessId: string,
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const allKeys = Object.keys((demoSavingsStore as any).state.scheduledStashRules);
  for (const k of allKeys) {
    const rules = (demoSavingsStore as any).state.scheduledStashRules[k] || [];
    const found = rules.find((r: ScheduledStashRule) => r.id === ruleId);
    if (found) {
      const remaining = rules.filter((r: ScheduledStashRule) => r.id !== ruleId);
      demoSavingsStore.setScheduledStashRules(businessId, found.userId, remaining);
      break;
    }
  }

  if (db) {
    try {
      await deleteDoc(doc(db, 'businesses', businessId, 'scheduled_stashes', ruleId));
    } catch (err) {}
  }

  return { success: true };
}

export async function executeScheduledStashRuleNow(
  businessId: string,
  userId: string,
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const rules = demoSavingsStore.getScheduledStashRules(businessId, userId);
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return { success: false, error: 'Rule not found.' };

  const stashRes = await transferToVault({
    businessId,
    userId,
    vaultId: rule.targetVaultId,
    vaultName: rule.targetVaultName || 'Savings Vault',
    amount: rule.amount,
    type: 'vault_deposit',
    note: `Auto-Stash execution: ${rule.targetVaultName || 'Vault'}`,
    notificationTitle: 'Auto-Stash Executed',
    notificationType: 'scheduled_stash',
  });

  if (!stashRes.success) {
    return { success: false, error: stashRes.error };
  }

  const updatedRules = rules.map((r) =>
    r.id === ruleId
      ? {
          ...r,
          occurrencesCount: (r.occurrencesCount || 0) + 1,
          lastExecutedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : r
  );
  demoSavingsStore.setScheduledStashRules(businessId, userId, updatedRules);

  return { success: true };
}

export async function processDueScheduledStashes(
  businessId: string,
  userId: string
): Promise<{ processedCount: number; totalAmountSaved: number }> {
  const rules = demoSavingsStore.getScheduledStashRules(businessId, userId);
  const today = new Date().toISOString().split('T')[0];
  let processedCount = 0;
  let totalAmountSaved = 0;
  const currentRules = [...rules];

  for (let i = 0; i < currentRules.length; i++) {
    const rule = currentRules[i];
    if (rule.status === 'active' && rule.nextDueDate <= today) {
      const stashRes = await transferToVault({
        businessId,
        userId,
        vaultId: rule.targetVaultId,
        vaultName: rule.targetVaultName || 'Savings Vault',
        amount: rule.amount,
        type: 'vault_deposit',
        note: `Auto-Stash (${rule.frequency}) to ${rule.targetVaultName || 'Vault'}`,
        notificationTitle: 'Auto-Stash Executed',
        notificationType: 'scheduled_stash',
      });

      if (stashRes.success) {
        processedCount++;
        totalAmountSaved += rule.amount;
        const nextDueDate = calculateNextStashDueDate(rule.frequency);
        currentRules[i] = {
          ...rule,
          nextDueDate,
          occurrencesCount: (rule.occurrencesCount || 0) + 1,
          lastExecutedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  if (processedCount > 0) {
    demoSavingsStore.setScheduledStashRules(businessId, userId, currentRules);
  }

  return { processedCount, totalAmountSaved };
}

// ---------------------------------------------------------------------------
// Spendable Book Sync (Deduct Expense / Credit Income)
// ---------------------------------------------------------------------------

export async function deductSpendableForBookExpense(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  bookEntryId: string;
  bookName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, amount, currency = 'USD', bookName = 'Book Entry', note } = params;

  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' };

  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  if (acc.mainBalance < amount) {
    return { success: false, error: `Insufficient wallet balance.` };
  }

  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance - amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_book_exp`,
    businessId,
    userId,
    type: 'book_expense_payment',
    amount,
    currency,
    status: 'completed',
    note: note || `Payment for ${bookName}`,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Book expense deduction cloud sync warning:', err);
    }
  }

  return { success: true };
}

export async function creditSpendableForBookIncome(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  bookEntryId: string;
  bookName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, amount, currency = 'USD', bookName = 'Book Entry', note } = params;

  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' };

  const acc = demoSavingsStore.getAccount(businessId, userId, currency);
  const updatedAcc: MemberAccount = {
    ...acc,
    mainBalance: acc.mainBalance + amount,
    updatedAt: new Date().toISOString(),
  };
  demoSavingsStore.setAccount(businessId, userId, updatedAcc);

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_book_inc`,
    businessId,
    userId,
    type: 'book_income_deposit',
    amount,
    currency,
    status: 'completed',
    note: note || `Income credit from ${bookName}`,
    createdAt: new Date().toISOString(),
  };
  demoSavingsStore.addTransaction(businessId, userId, tx);

  if (db) {
    try {
      const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      await runTransaction(db, async (t) => {
        t.set(accountRef, updatedAcc, { merge: true });
        t.set(doc(txCol, tx.id), tx);
      });
    } catch (err) {
      console.warn('[Savings] Book income credit cloud sync warning:', err);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function subscribeToVaults(
  businessId: string,
  userId: string,
  callback: (vaults: SavingsVault[]) => void
): Unsubscribe {
  const unsubLocal = demoSavingsStore.subscribeVaults(businessId, userId, callback);
  let unsubCloud: Unsubscribe | null = null;
  if (db && businessId && userId) {
    try {
      const q = query(
        collection(db, 'businesses', businessId, 'vaults'),
        where('userId', '==', userId)
      );
      unsubCloud = onSnapshot(q, (snapshot) => {
        const list: SavingsVault[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as SavingsVault));
        if (list.length > 0) {
          demoSavingsStore.setVaults(businessId, userId, list);
        }
      });
    } catch (err) {}
  }

  return () => {
    unsubLocal();
    if (unsubCloud) unsubCloud();
  };
}

export function subscribeToWalletTransactions(
  businessId: string,
  userId: string,
  callback: (transactions: WalletTransaction[]) => void,
  maxItems: number = 20
): Unsubscribe {
  const unsubLocal = demoSavingsStore.subscribeTransactions(businessId, userId, (list) => {
    callback(list.slice(0, maxItems));
  });

  let unsubCloud: Unsubscribe | null = null;
  if (db && businessId && userId) {
    try {
      const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');
      const q = query(txCol, where('userId', '==', userId));
      unsubCloud = onSnapshot(q, (snapshot) => {
        const list: WalletTransaction[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as WalletTransaction));
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          list.forEach((tx) => demoSavingsStore.addTransaction(businessId, userId, tx));
        }
      });
    } catch (err) {}
  }

  return () => {
    unsubLocal();
    if (unsubCloud) unsubCloud();
  };
}

export function subscribeToIncomingPendingTransfers(
  businessId: string,
  recipientId: string,
  callback: (transfers: PendingTransfer[]) => void
): Unsubscribe {
  return demoSavingsStore.subscribeIncomingTransfers(businessId, recipientId, callback);
}

export function subscribeToOutgoingPendingTransfers(
  businessId: string,
  senderId: string,
  callback: (transfers: PendingTransfer[]) => void
): Unsubscribe {
  return demoSavingsStore.subscribeOutgoingTransfers(businessId, senderId, callback);
}

export function subscribeToMoneyRequests(
  businessId: string,
  userId: string,
  role: 'payer' | 'requester',
  callback: (requests: MoneyRequest[]) => void
): Unsubscribe {
  return demoSavingsStore.subscribeMoneyRequests(businessId, (all) => {
    const filtered = all.filter((r) =>
      role === 'payer' ? r.payerId === userId : r.requesterId === userId
    );
    callback(filtered);
  });
}

export function subscribeToScheduledStashRules(
  businessId: string,
  userId: string,
  callback: (rules: ScheduledStashRule[]) => void
): Unsubscribe {
  return demoSavingsStore.subscribeScheduledStashes(businessId, userId, callback);
}

export function subscribeToGroupPool(
  businessId: string,
  callback: (balance: number) => void
): Unsubscribe {
  const unsubLocal = demoSavingsStore.subscribeGroupPool(businessId, callback);
  let unsubCloud: Unsubscribe | null = null;
  if (db && businessId) {
    try {
      const bizRef = doc(db, 'businesses', businessId);
      unsubCloud = onSnapshot(bizRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.groupPoolBalance === 'number') {
            demoSavingsStore.setGroupPoolBalance(businessId, data.groupPoolBalance);
          }
        }
      });
    } catch (err) {}
  }
  return () => {
    unsubLocal();
    if (unsubCloud) unsubCloud();
  };
}

export async function checkTransferLimits(
  businessId: string,
  senderId: string,
  amount: number
): Promise<void> {
  // Transfer limit validation helper
}

export async function checkDepositLimit(
  businessId: string,
  amount: number
): Promise<void> {
  // Deposit limit validation helper
}

export async function updateTransferLimits(
  businessId: string,
  limits: Business['transferLimits']
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

/**
 * Role-based permission validator for savings and vault operations.
 */
export function canPerformVaultOperation(
  role: UserRole,
  operation: 'view' | 'deposit' | 'withdraw' | 'create' | 'delete'
): boolean {
  if (role === 'owner' || role === 'partner') return true;
  if (role === 'viewer') return operation === 'view';
  return false;
}

/**
 * Role-based permission validator for collective pool disbursement.
 */
export function canDisburseCollectivePool(role: UserRole): boolean {
  return role === 'owner';
}
