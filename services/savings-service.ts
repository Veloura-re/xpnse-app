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
  serverTimestamp,
  increment,
  Unsubscribe,
  addDoc,
} from 'firebase/firestore';
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
} from '@/types';

/**
 * Ensures Firestore database instance is available
 */
function getDb(): Firestore {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  return db;
}

/**
 * Dispatch real-time in-app and push notifications for savings and vault events
 */
export async function dispatchSavingsNotification(params: {
  userId: string;
  businessId: string;
  title: string;
  message: string;
  type: NotificationType;
  color?: string;
  data?: Record<string, any>;
}): Promise<void> {
  if (!db || !params.userId) return;

  const notifColor = params.color || '#10b981';
  const payloadData = {
    category: 'savings_vault',
    businessId: params.businessId,
    path: '/(tabs)',
    ...params.data,
  };

  try {
    // 1. Write in-app notification to Firestore notifications collection
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
  } catch (err) {
    console.warn('[Savings] In-app notification write notice:', err);
  }

  // 2. Dispatch native push notification
  try {
    await PushNotificationService.sendToUser(params.userId, {
      title: params.title,
      body: params.message,
      data: payloadData,
    });
  } catch (pushErr) {
    console.warn('[Savings] Push notification notice:', pushErr);
  }
}

/**
 * Fetch or initialize a member's spendable wallet account
 */
export async function getOrCreateMemberAccount(
  businessId: string,
  userId: string,
  currency: string = 'USD'
): Promise<MemberAccount> {
  const firestore = getDb();
  const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
  const snapshot = await getDoc(accountRef);

  if (snapshot.exists()) {
    return snapshot.data() as MemberAccount;
  }

  const newAccount: MemberAccount = {
    id: userId,
    businessId,
    userId,
    mainBalance: 0,
    lockedSavingsBalance: 0,
    currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(accountRef, newAccount);
  return newAccount;
}

/**
 * Subscribe in real-time to a member's wallet account balance
 */
export function subscribeToMemberAccount(
  businessId: string,
  userId: string,
  callback: (account: MemberAccount | null) => void
): Unsubscribe {
  if (!db) {
    callback(null);
    return () => {};
  }

  const accountRef = doc(db, 'businesses', businessId, 'accounts', userId);
  return onSnapshot(
    accountRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as MemberAccount);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('[Savings] Account subscription error:', err);
      callback(null);
    }
  );
}

/**
 * Deposit funds via card into member's main spendable balance
 */
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

  try {
    await checkDepositLimit(businessId, amount);
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      const currentMain = accSnap.exists() ? (accSnap.data().mainBalance || 0) : 0;
      const currentLocked = accSnap.exists() ? (accSnap.data().lockedSavingsBalance || 0) : 0;

      const updatedAccount: Partial<MemberAccount> = {
        id: userId,
        businessId,
        userId,
        mainBalance: currentMain + amount,
        lockedSavingsBalance: currentLocked,
        currency,
        updatedAt: new Date().toISOString(),
      };

      if (!accSnap.exists()) {
        updatedAccount.createdAt = new Date().toISOString();
      }

      t.set(accountRef, updatedAccount, { merge: true });

      const transactionRecord: WalletTransaction = {
        id: newTxRef.id,
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

      t.set(newTxRef, transactionRecord);
    });

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
  } catch (err: any) {
    console.error('[Savings] Deposit error:', err);
    return { success: false, error: err?.message || 'Deposit could not be processed.' };
  }
}

/**
 * Instant atomic peer-to-peer transfer between members
 */
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
    return { success: false, error: 'Cannot send money to yourself.' };
  }

  if (amount <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const senderRef = doc(firestore, 'businesses', businessId, 'accounts', senderId);
    const recipientRef = doc(firestore, 'businesses', businessId, 'accounts', recipientId);

    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const senderTxRef = doc(txCol);
    const recipientTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const senderSnap = await t.get(senderRef);
      if (!senderSnap.exists()) {
        throw new Error('Sender wallet does not exist.');
      }

      const senderData = senderSnap.data() as MemberAccount;
      if ((senderData.mainBalance || 0) < amount) {
        throw new Error('Insufficient spendable balance.');
      }

      const recipientSnap = await t.get(recipientRef);
      const recipientMain = recipientSnap.exists() ? (recipientSnap.data().mainBalance || 0) : 0;
      const recipientLocked = recipientSnap.exists() ? (recipientSnap.data().lockedSavingsBalance || 0) : 0;

      // Deduct from sender
      t.update(senderRef, {
        mainBalance: senderData.mainBalance - amount,
        updatedAt: new Date().toISOString(),
      });

      // Credit to recipient
      t.set(
        recipientRef,
        {
          id: recipientId,
          businessId,
          userId: recipientId,
          mainBalance: recipientMain + amount,
          lockedSavingsBalance: recipientLocked,
          currency,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const timestamp = new Date().toISOString();

      // Sender transaction receipt
      const senderTx: WalletTransaction = {
        id: senderTxRef.id,
        businessId,
        userId: senderId,
        type: 'transfer_sent',
        amount,
        currency,
        counterpartyId: recipientId,
        counterpartyName: recipientName,
        status: 'completed',
        note: note || `Sent to ${recipientName}`,
        createdAt: timestamp,
      };

      // Recipient transaction receipt
      const recipientTx: WalletTransaction = {
        id: recipientTxRef.id,
        businessId,
        userId: recipientId,
        type: 'transfer_recv',
        amount,
        currency,
        counterpartyId: senderId,
        counterpartyName: senderName,
        status: 'completed',
        note: note || `Received from ${senderName}`,
        createdAt: timestamp,
      };

      t.set(senderTxRef, senderTx);
      t.set(recipientTxRef, recipientTx);
    });

    // Notify sender
    dispatchSavingsNotification({
      userId: senderId,
      businessId,
      title: 'Transfer Sent',
      message: `Sent ${currency} ${amount.toFixed(2)} to ${recipientName}.`,
      type: 'transfer_sent',
      color: '#6366f1',
      data: { amount, currency, counterpartyId: recipientId, counterpartyName: recipientName },
    }).catch(() => {});

    // Notify recipient
    dispatchSavingsNotification({
      userId: recipientId,
      businessId,
      title: 'Transfer Received',
      message: `Received ${currency} ${amount.toFixed(2)} from ${senderName}.`,
      type: 'transfer_recv',
      color: '#10b981',
      data: { amount, currency, counterpartyId: senderId, counterpartyName: senderName },
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] P2P Transfer error:', err);
    return { success: false, error: err?.message || 'Transfer could not be processed.' };
  }
}

/**
 * Cash out funds from wallet to external card or bank account
 */
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
    destinationDetails,
    destinationTitle,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Withdrawal amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const snap = await t.get(accountRef);
      if (!snap.exists()) {
        throw new Error('Wallet account not found.');
      }

      const currentBalance = snap.data().mainBalance || 0;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance to cash out.');
      }

      t.update(accountRef, {
        mainBalance: currentBalance - amount,
        updatedAt: new Date().toISOString(),
      });

      const noteText =
        destinationTitle ||
        `Withdrawal to ${destinationType === 'card' ? 'Debit Card' : 'Bank Account'} (${destinationDetails || 'Account'})`;

      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'withdrawal',
        amount,
        currency,
        status: 'completed',
        note: noteText,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    dispatchSavingsNotification({
      userId,
      businessId,
      title: 'Withdrawal Initiated',
      message: `Withdrew ${currency} ${amount.toFixed(2)} (${destinationTitle || destinationType}).`,
      type: 'wallet_cashout',
      color: '#f59e0b',
      data: { amount, currency, destinationType },
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Cash-out error:', err);
    return { success: false, error: err?.message || 'Cash-out could not be completed.' };
  }
}

/**
 * Create a new personal savings vault
 */
export async function createSavingsVault(params: {
  businessId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currency?: string;
  isLocked?: boolean;
  lockUntilDate?: string;
}): Promise<{ success: boolean; data?: SavingsVault; error?: string }> {
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

  try {
    const firestore = getDb();
    const vaultsCol = collection(firestore, 'businesses', businessId, 'vaults');
    const newVaultRef = doc(vaultsCol);

    const newVault: SavingsVault = {
      id: newVaultRef.id,
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

    await setDoc(newVaultRef, newVault);

    dispatchSavingsNotification({
      userId,
      businessId,
      title: 'Vault Created',
      message: `Created "${name.trim()}" with target ${currency} ${targetAmount.toFixed(2)}.`,
      type: 'vault_deposit',
      color: '#8b5cf6',
      data: { vaultId: newVaultRef.id, vaultName: name.trim(), targetAmount },
    }).catch(() => {});

    return { success: true, data: newVault };
  } catch (err: any) {
    console.error('[Savings] Create vault error:', err);
    return { success: false, error: err?.message || 'Could not create savings vault.' };
  }
}

/**
 * Move money from main spendable balance into a personal savings vault
 */
export async function transferToVault(params: {
  businessId: string;
  userId: string;
  vaultId: string;
  vaultName?: string;
  amount: number;
  currency?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, vaultId, vaultName = 'Vault', amount, currency = 'USD' } = params;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const vaultRef = doc(firestore, 'businesses', businessId, 'vaults', vaultId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    let resolvedVaultName = vaultName;
    let targetAmount = 0;
    let prevPct = 0;
    let newPct = 0;

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      const vaultSnap = await t.get(vaultRef);

      if (!accSnap.exists() || !vaultSnap.exists()) {
        throw new Error('Account or vault does not exist.');
      }

      const accData = accSnap.data() as MemberAccount;
      const vaultData = vaultSnap.data() as SavingsVault;

      if ((accData.mainBalance || 0) < amount) {
        throw new Error('Insufficient spendable balance.');
      }

      resolvedVaultName = vaultData.name || vaultName;
      targetAmount = vaultData.targetAmount || 0;
      const currentAmount = vaultData.currentAmount || 0;
      prevPct = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      newPct = targetAmount > 0 ? ((currentAmount + amount) / targetAmount) * 100 : 0;

      // Update Account balances
      t.update(accountRef, {
        mainBalance: (accData.mainBalance || 0) - amount,
        lockedSavingsBalance: (accData.lockedSavingsBalance || 0) + amount,
        updatedAt: new Date().toISOString(),
      });

      // Update Vault balance
      t.update(vaultRef, {
        currentAmount: currentAmount + amount,
        updatedAt: new Date().toISOString(),
      });

      // Record transaction
      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'vault_deposit',
        amount,
        currency,
        vaultId,
        vaultName: resolvedVaultName,
        status: 'completed',
        note: `Allocated to ${resolvedVaultName}`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    // 1. Dispatch vault deposit notification
    dispatchSavingsNotification({
      userId,
      businessId,
      title: 'Allocated to Vault',
      message: `Stashed ${currency} ${amount.toFixed(2)} into ${resolvedVaultName}.`,
      type: 'vault_deposit',
      color: '#8b5cf6',
      data: { vaultId, vaultName: resolvedVaultName, amount, currency },
    }).catch(() => {});

    // 2. Dispatch milestone notifications if target thresholds crossed
    if (targetAmount > 0) {
      if (prevPct < 100 && newPct >= 100) {
        dispatchSavingsNotification({
          userId,
          businessId,
          title: 'Goal Achieved',
          message: `Vault "${resolvedVaultName}" has achieved 100% of its target!`,
          type: 'vault_milestone',
          color: '#10b981',
          data: { vaultId, vaultName: resolvedVaultName, milestonePercent: 100, targetAmount },
        }).catch(() => {});
      } else if (prevPct < 75 && newPct >= 75) {
        dispatchSavingsNotification({
          userId,
          businessId,
          title: '75% Milestone Reached',
          message: `Vault "${resolvedVaultName}" is now 75% funded!`,
          type: 'vault_milestone',
          color: '#3b82f6',
          data: { vaultId, vaultName: resolvedVaultName, milestonePercent: 75, targetAmount },
        }).catch(() => {});
      } else if (prevPct < 50 && newPct >= 50) {
        dispatchSavingsNotification({
          userId,
          businessId,
          title: 'Halfway There (50%)',
          message: `Vault "${resolvedVaultName}" crossed 50% of its goal!`,
          type: 'vault_milestone',
          color: '#3b82f6',
          data: { vaultId, vaultName: resolvedVaultName, milestonePercent: 50, targetAmount },
        }).catch(() => {});
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Transfer to vault error:', err);
    return { success: false, error: err?.message || 'Could not allocate to vault.' };
  }
}

/**
 * Release money from personal savings vault back into main spendable balance
 */
export async function withdrawFromVault(params: {
  businessId: string;
  userId: string;
  vaultId: string;
  vaultName?: string;
  amount: number;
  currency?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, vaultId, vaultName = 'Vault', amount, currency = 'USD' } = params;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const vaultRef = doc(firestore, 'businesses', businessId, 'vaults', vaultId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    let resolvedVaultName = vaultName;

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      const vaultSnap = await t.get(vaultRef);

      if (!accSnap.exists() || !vaultSnap.exists()) {
        throw new Error('Account or vault does not exist.');
      }

      const accData = accSnap.data() as MemberAccount;
      const vaultData = vaultSnap.data() as SavingsVault;

      if ((vaultData.currentAmount || 0) < amount) {
        throw new Error('Insufficient funds in vault.');
      }

      resolvedVaultName = vaultData.name || vaultName;

      // Update Account balances
      t.update(accountRef, {
        mainBalance: (accData.mainBalance || 0) + amount,
        lockedSavingsBalance: Math.max(0, (accData.lockedSavingsBalance || 0) - amount),
        updatedAt: new Date().toISOString(),
      });

      // Update Vault balance
      t.update(vaultRef, {
        currentAmount: (vaultData.currentAmount || 0) - amount,
        updatedAt: new Date().toISOString(),
      });

      // Record transaction
      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'vault_withdraw',
        amount,
        currency,
        vaultId,
        vaultName: resolvedVaultName,
        status: 'completed',
        note: `Released from ${resolvedVaultName}`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    dispatchSavingsNotification({
      userId,
      businessId,
      title: 'Vault Funds Released',
      message: `Released ${currency} ${amount.toFixed(2)} from ${resolvedVaultName} back to spendable wallet.`,
      type: 'vault_withdraw',
      color: '#f59e0b',
      data: { vaultId, vaultName: resolvedVaultName, amount, currency },
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Withdraw from vault error:', err);
    return { success: false, error: err?.message || 'Could not withdraw from vault.' };
  }
}

/**
 * Contribute money from member's wallet to the collective Group Pool
 */
export async function contributeToGroupPool(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  userName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, userId, amount, currency = 'USD', userName, note } = params;

  if (amount <= 0) {
    return { success: false, error: 'Contribution amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const businessRef = doc(firestore, 'businesses', businessId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      const bizSnap = await t.get(businessRef);

      if (!accSnap.exists() || !bizSnap.exists()) {
        throw new Error('Account or business does not exist.');
      }

      const accData = accSnap.data() as MemberAccount;
      const bizData = bizSnap.data() as Business;

      if ((accData.mainBalance || 0) < amount) {
        throw new Error('Insufficient spendable balance.');
      }

      // Deduct from contributor's spendable wallet
      t.update(accountRef, {
        mainBalance: (accData.mainBalance || 0) - amount,
        updatedAt: new Date().toISOString(),
      });

      // Add to business groupPoolBalance
      t.update(businessRef, {
        groupPoolBalance: (bizData.groupPoolBalance || 0) + amount,
      });

      // Record transaction
      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'pool_contribution',
        amount,
        currency,
        status: 'completed',
        note: note || (userName ? `Pool contribution by ${userName}` : 'Contribution to Group Savings Pool'),
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Group pool contribution error:', err);
    return { success: false, error: err?.message || 'Could not process pool contribution.' };
  }
}

/**
 * Subscribe to all savings vaults for a member in a business
 */
export function subscribeToVaults(
  businessId: string,
  userId: string,
  callback: (vaults: SavingsVault[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const vaultsCol = collection(db, 'businesses', businessId, 'vaults');
  const q = query(vaultsCol, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const vaultsList: SavingsVault[] = [];
      snapshot.forEach((docSnap) => {
        vaultsList.push(docSnap.data() as SavingsVault);
      });
      // Sort newest first
      vaultsList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(vaultsList);
    },
    (err) => {
      console.warn('[Savings] Vaults subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Subscribe to wallet transactions for a member in a business
 */
export function subscribeToWalletTransactions(
  businessId: string,
  userId: string,
  callback: (transactions: WalletTransaction[]) => void,
  maxItems: number = 20
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const txCol = collection(db, 'businesses', businessId, 'wallet_transactions');

  // Attempt the optimal query that requires a composite index (userId ASC + createdAt DESC).
  // During the window before that index finishes building in the Firebase Console, Firestore
  // returns failed-precondition. The error handler falls back to a simpler filter-only query
  // and performs the sort client-side so the UI is never blocked.
  const indexedQuery = query(txCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));

  let fallbackUnsub: Unsubscribe | null = null;

  const unsub = onSnapshot(
    indexedQuery,
    (snapshot) => {
      const txList: WalletTransaction[] = [];
      snapshot.forEach((docSnap) => {
        txList.push(docSnap.data() as WalletTransaction);
      });
      callback(txList.slice(0, maxItems));
    },
    (err: any) => {
      // failed-precondition means the composite index is missing or still building.
      // Fall back to a filter-only query and sort in memory.
      if (err?.code === 'failed-precondition') {
        console.warn('[Savings] Composite index not ready; using client-side sort fallback.');
        const fallbackQuery = query(txCol, where('userId', '==', userId));
        fallbackUnsub = onSnapshot(
          fallbackQuery,
          (snap) => {
            const txList: WalletTransaction[] = [];
            snap.forEach((docSnap) => {
              txList.push(docSnap.data() as WalletTransaction);
            });
            txList.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            callback(txList.slice(0, maxItems));
          },
          (fallbackErr) => {
            console.warn('[Savings] Transactions fallback subscription error:', fallbackErr);
            callback([]);
          }
        );
      } else {
        console.warn('[Savings] Transactions subscription error:', err);
        callback([]);
      }
    }
  );

  // Return a composite unsubscribe that tears down whichever listener is active.
  return () => {
    unsub();
    if (fallbackUnsub) fallbackUnsub();
  };
}

// ---------------------------------------------------------------------------
// Transfer Limit Enforcement
// ---------------------------------------------------------------------------

/**
 * Validates a proposed outbound amount against the business transfer limits.
 * Throws a descriptive Error if any limit would be exceeded.
 */
export async function checkTransferLimits(
  businessId: string,
  senderId: string,
  amount: number
): Promise<void> {
  const firestore = getDb();
  const bizRef = doc(firestore, 'businesses', businessId);
  const bizSnap = await getDoc(bizRef);
  if (!bizSnap.exists()) return;

  const biz = bizSnap.data() as Business;
  const limits = biz.transferLimits;
  if (!limits) return;

  // Single-transfer cap
  if (limits.singleTransferMax !== undefined && amount > limits.singleTransferMax) {
    throw new Error(
      `Transfer amount exceeds the single-transfer limit of ${limits.singleTransferMax} ${biz.currency || 'USD'}.`
    );
  }

  // Rolling 24-hour cap: sum all outbound wallet_transactions created in the last 24h
  if (limits.dailyTransferMax !== undefined) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const recentQ = query(
      txCol,
      where('userId', '==', senderId),
      where('type', 'in', ['transfer_sent', 'withdrawal', 'pool_contribution']),
      where('createdAt', '>=', oneDayAgo)
    );
    const snap = await getDocs(recentQ);
    let dailyTotal = 0;
    snap.forEach((d) => { dailyTotal += Number(d.data().amount || 0); });
    if (dailyTotal + amount > limits.dailyTransferMax) {
      throw new Error(
        `This transfer would exceed your daily outbound limit of ${limits.dailyTransferMax} ${biz.currency || 'USD'}.`
      );
    }
  }
}

/**
 * Validates a deposit amount against the business deposit limit.
 */
export async function checkDepositLimit(
  businessId: string,
  amount: number
): Promise<void> {
  const firestore = getDb();
  const bizRef = doc(firestore, 'businesses', businessId);
  const bizSnap = await getDoc(bizRef);
  if (!bizSnap.exists()) return;

  const biz = bizSnap.data() as Business;
  const depositMax = biz.transferLimits?.depositMax;
  if (depositMax !== undefined && amount > depositMax) {
    throw new Error(
      `Deposit amount exceeds the maximum allowed deposit of ${depositMax} ${biz.currency || 'USD'}.`
    );
  }
}

/**
 * Updates business-level transfer limits (owner only — caller must verify role).
 */
export async function updateTransferLimits(
  businessId: string,
  limits: Business['transferLimits']
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    await updateDoc(doc(firestore, 'businesses', businessId), { transferLimits: limits ?? null });
    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Update transfer limits error:', err);
    return { success: false, error: err?.message || 'Could not update transfer limits.' };
  }
}

// ---------------------------------------------------------------------------
// Pending Transfer (Hold-and-Confirm) Flow
// ---------------------------------------------------------------------------

/**
 * Initiates a pending transfer from sender to recipient.
 * Funds are NOT moved yet. The recipient must confirm before the wallet balances change.
 * A push notification is dispatched to the recipient.
 */
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
    businessId, senderId, senderName,
    recipientId, recipientName, amount,
    currency = 'USD', note,
  } = params;

  if (senderId === recipientId) {
    return { success: false, error: 'Cannot send money to yourself.' };
  }
  if (amount <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }

  try {
    // Enforce business-level limits before creating the pending record
    await checkTransferLimits(businessId, senderId, amount);

    const firestore = getDb();

    // Verify sender has sufficient spendable balance
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', senderId);
    const accSnap = await getDoc(accountRef);
    const currentBalance = accSnap.exists() ? (accSnap.data().mainBalance || 0) : 0;
    if (currentBalance < amount) {
      return { success: false, error: 'Insufficient spendable balance.' };
    }

    const ptCol = collection(firestore, 'businesses', businessId, 'pending_transfers');
    const ptRef = doc(ptCol);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const pendingTx: PendingTransfer = {
      id: ptRef.id,
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

    await setDoc(ptRef, pendingTx);

    // Notify recipient via in-app & push
    dispatchSavingsNotification({
      userId: recipientId,
      businessId,
      title: 'Incoming Transfer',
      message: `${senderName} wants to send you ${currency} ${amount.toFixed(2)}. Open to confirm.`,
      type: 'pending_transfer',
      color: '#6366f1',
      data: { type: 'pending_transfer', pendingTransferId: ptRef.id, businessId, amount, currency, senderName },
    }).catch(() => {});

    return { success: true, pendingTransferId: ptRef.id };
  } catch (err: any) {
    console.error('[Savings] Initiate pending transfer error:', err);
    return { success: false, error: err?.message || 'Could not initiate transfer.' };
  }
}

/**
 * Recipient responds to a pending transfer.
 * On confirmation: atomically debits sender and credits recipient, creates wallet_transaction records.
 * On decline: marks the record declined, no money moves.
 */
export async function respondToPendingTransfer(params: {
  businessId: string;
  pendingTransferId: string;
  recipientId: string;
  decision: 'confirmed' | 'declined';
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, pendingTransferId, recipientId, decision } = params;

  try {
    const firestore = getDb();
    const ptRef = doc(firestore, 'businesses', businessId, 'pending_transfers', pendingTransferId);

    if (decision === 'declined') {
      const ptSnap = await getDoc(ptRef);
      if (ptSnap.exists()) {
        const pt = ptSnap.data() as PendingTransfer;
        await updateDoc(ptRef, {
          status: 'declined' as PendingTransferStatus,
          respondedAt: new Date().toISOString(),
        });
        dispatchSavingsNotification({
          userId: pt.senderId,
          businessId,
          title: 'Transfer Declined',
          message: `${pt.recipientName} declined your transfer of ${pt.currency} ${pt.amount.toFixed(2)}.`,
          type: 'pending_transfer',
          color: '#ef4444',
          data: { pendingTransferId, decision: 'declined' },
        }).catch(() => {});
      }
      return { success: true };
    }

    let confirmedSenderId = '';
    let confirmedRecipientName = '';
    let confirmedAmount = 0;
    let confirmedCurrency = 'USD';

    // Confirm — atomically execute the transfer
    await runTransaction(firestore, async (t) => {
      const ptSnap = await t.get(ptRef);
      if (!ptSnap.exists()) throw new Error('Pending transfer not found.');

      const pt = ptSnap.data() as PendingTransfer;

      if (pt.status !== 'awaiting_confirmation') {
        throw new Error('This transfer has already been responded to or expired.');
      }
      if (pt.recipientId !== recipientId) {
        throw new Error('You are not the intended recipient of this transfer.');
      }
      if (new Date(pt.expiresAt) < new Date()) {
        throw new Error('This transfer request has expired.');
      }

      confirmedSenderId = pt.senderId;
      confirmedRecipientName = pt.recipientName;
      confirmedAmount = pt.amount;
      confirmedCurrency = pt.currency;

      const senderRef = doc(firestore, 'businesses', businessId, 'accounts', pt.senderId);
      const recipientRef = doc(firestore, 'businesses', businessId, 'accounts', recipientId);

      const senderSnap = await t.get(senderRef);
      if (!senderSnap.exists()) throw new Error('Sender account not found.');

      const senderData = senderSnap.data() as MemberAccount;
      if ((senderData.mainBalance || 0) < pt.amount) {
        throw new Error('Sender no longer has sufficient balance.');
      }

      const recipientSnap = await t.get(recipientRef);
      const recipientMain = recipientSnap.exists() ? (recipientSnap.data().mainBalance || 0) : 0;
      const recipientLocked = recipientSnap.exists() ? (recipientSnap.data().lockedSavingsBalance || 0) : 0;

      // Deduct from sender
      t.update(senderRef, {
        mainBalance: senderData.mainBalance - pt.amount,
        updatedAt: new Date().toISOString(),
      });

      // Credit to recipient
      t.set(recipientRef, {
        id: recipientId,
        businessId,
        userId: recipientId,
        mainBalance: recipientMain + pt.amount,
        lockedSavingsBalance: recipientLocked,
        currency: pt.currency,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const timestamp = new Date().toISOString();
      const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');

      // Sender ledger record
      const senderTxRef = doc(txCol);
      const senderTx: WalletTransaction = {
        id: senderTxRef.id,
        businessId,
        userId: pt.senderId,
        type: 'transfer_sent',
        amount: pt.amount,
        currency: pt.currency,
        counterpartyId: recipientId,
        counterpartyName: pt.recipientName,
        status: 'completed',
        note: pt.note || `Sent to ${pt.recipientName}`,
        createdAt: timestamp,
      };
      t.set(senderTxRef, senderTx);

      // Recipient ledger record
      const recipientTxRef = doc(txCol);
      const recipientTx: WalletTransaction = {
        id: recipientTxRef.id,
        businessId,
        userId: recipientId,
        type: 'transfer_recv',
        amount: pt.amount,
        currency: pt.currency,
        counterpartyId: pt.senderId,
        counterpartyName: pt.senderName,
        status: 'completed',
        note: pt.note || `Received from ${pt.senderName}`,
        createdAt: timestamp,
      };
      t.set(recipientTxRef, recipientTx);

      // Mark pending transfer as confirmed
      t.update(ptRef, {
        status: 'confirmed' as PendingTransferStatus,
        respondedAt: timestamp,
      });
    });

    // Notify sender that the transfer was confirmed
    if (confirmedSenderId) {
      dispatchSavingsNotification({
        userId: confirmedSenderId,
        businessId,
        title: 'Transfer Confirmed',
        message: `${confirmedRecipientName} accepted your transfer of ${confirmedCurrency} ${confirmedAmount.toFixed(2)}.`,
        type: 'transfer_sent',
        color: '#10b981',
        data: { pendingTransferId, amount: confirmedAmount, recipientName: confirmedRecipientName },
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Respond to pending transfer error:', err);
    return { success: false, error: err?.message || 'Could not process transfer response.' };
  }
}

/**
 * Subscribe to incoming pending transfers for the current user (as recipient).
 * Returns only transfers awaiting confirmation.
 */
export function subscribeToIncomingPendingTransfers(
  businessId: string,
  recipientId: string,
  callback: (transfers: PendingTransfer[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const ptCol = collection(db, 'businesses', businessId, 'pending_transfers');
  const q = query(
    ptCol,
    where('recipientId', '==', recipientId),
    where('status', '==', 'awaiting_confirmation'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: PendingTransfer[] = [];
      snap.forEach((d) => list.push(d.data() as PendingTransfer));
      // Filter out any that have expired client-side (index build gap safety net)
      const now = new Date();
      callback(list.filter((pt) => new Date(pt.expiresAt) > now));
    },
    (err) => {
      console.warn('[Savings] Incoming pending transfers subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Subscribe to all pending transfers initiated by the current user (as sender).
 */
export function subscribeToOutgoingPendingTransfers(
  businessId: string,
  senderId: string,
  callback: (transfers: PendingTransfer[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const ptCol = collection(db, 'businesses', businessId, 'pending_transfers');
  const q = query(
    ptCol,
    where('senderId', '==', senderId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: PendingTransfer[] = [];
      snap.forEach((d) => list.push(d.data() as PendingTransfer));
      callback(list);
    },
    (err) => {
      console.warn('[Savings] Outgoing pending transfers subscription error:', err);
      callback([]);
    }
  );
}

// ---------------------------------------------------------------------------
// Money Request Flow
// ---------------------------------------------------------------------------

/**
 * Creates a money request from requester to payer.
 * A push notification is dispatched to the payer.
 */
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
    businessId, requesterId, requesterName,
    payerId, payerName, amount,
    currency = 'USD', note,
  } = params;

  if (requesterId === payerId) {
    return { success: false, error: 'Cannot request money from yourself.' };
  }
  if (amount <= 0) {
    return { success: false, error: 'Requested amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const reqCol = collection(firestore, 'businesses', businessId, 'money_requests');
    const reqRef = doc(reqCol);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    const moneyRequest: MoneyRequest = {
      id: reqRef.id,
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

    await setDoc(reqRef, moneyRequest);

    // Notify the payer via in-app & push
    dispatchSavingsNotification({
      userId: payerId,
      businessId,
      title: 'Money Request',
      message: `${requesterName} is requesting ${currency} ${amount.toFixed(2)} from you.`,
      type: 'money_request',
      color: '#f59e0b',
      data: { type: 'money_request', requestId: reqRef.id, businessId, amount, currency, requesterName },
    }).catch(() => {});

    return { success: true, requestId: reqRef.id };
  } catch (err: any) {
    console.error('[Savings] Request money error:', err);
    return { success: false, error: err?.message || 'Could not create money request.' };
  }
}

/**
 * Payer responds to a money request.
 * On approval: calls initiatePendingTransfer so the requester must also confirm receipt.
 * On decline: marks the request declined.
 */
export async function respondToMoneyRequest(params: {
  businessId: string;
  requestId: string;
  payerId: string;
  payerName: string;
  decision: 'approved' | 'declined';
}): Promise<{ success: boolean; error?: string }> {
  const { businessId, requestId, payerId, payerName, decision } = params;

  try {
    const firestore = getDb();
    const reqRef = doc(firestore, 'businesses', businessId, 'money_requests', requestId);
    const reqSnap = await getDoc(reqRef);

    if (!reqSnap.exists()) {
      return { success: false, error: 'Money request not found.' };
    }

    const req = reqSnap.data() as MoneyRequest;

    if (req.status !== 'pending') {
      return { success: false, error: 'This request has already been responded to or expired.' };
    }
    if (req.payerId !== payerId) {
      return { success: false, error: 'You are not the designated payer for this request.' };
    }
    if (new Date(req.expiresAt) < new Date()) {
      await updateDoc(reqRef, { status: 'expired' as MoneyRequestStatus });
      return { success: false, error: 'This money request has expired.' };
    }

    if (decision === 'declined') {
      await updateDoc(reqRef, {
        status: 'declined' as MoneyRequestStatus,
        respondedAt: new Date().toISOString(),
      });
      // Notify requester via in-app & push
      dispatchSavingsNotification({
        userId: req.requesterId,
        businessId,
        title: 'Request Declined',
        message: `${payerName} declined your money request for ${req.currency} ${req.amount.toFixed(2)}.`,
        type: 'money_request',
        color: '#ef4444',
        data: { type: 'money_request', requestId, decision: 'declined', amount: req.amount, currency: req.currency, payerName },
      }).catch(() => {});
      return { success: true };
    }

    // Approved — initiate a pending transfer from payer to requester
    const result = await initiatePendingTransfer({
      businessId,
      senderId: payerId,
      senderName: payerName,
      recipientId: req.requesterId,
      recipientName: req.requesterName,
      amount: req.amount,
      currency: req.currency,
      note: req.note || `Payment for money request from ${req.requesterName}`,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Mark the money request as approved
    await updateDoc(reqRef, {
      status: 'approved' as MoneyRequestStatus,
      respondedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Respond to money request error:', err);
    return { success: false, error: err?.message || 'Could not process response.' };
  }
}

/**
 * Requester cancels their own pending money request.
 */
export async function cancelMoneyRequest(
  businessId: string,
  requestId: string,
  requesterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    const reqRef = doc(firestore, 'businesses', businessId, 'money_requests', requestId);
    const snap = await getDoc(reqRef);
    if (!snap.exists()) return { success: false, error: 'Request not found.' };
    const req = snap.data() as MoneyRequest;
    if (req.requesterId !== requesterId) return { success: false, error: 'Permission denied.' };
    if (req.status !== 'pending') return { success: false, error: 'Only pending requests can be cancelled.' };
    await updateDoc(reqRef, { status: 'cancelled' as MoneyRequestStatus });
    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Cancel money request error:', err);
    return { success: false, error: err?.message || 'Could not cancel request.' };
  }
}

/**
 * Subscribe to all money requests involving the current user (as requester or payer).
 */
export function subscribeToMoneyRequests(
  businessId: string,
  userId: string,
  role: 'payer' | 'requester',
  callback: (requests: MoneyRequest[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const reqCol = collection(db, 'businesses', businessId, 'money_requests');
  const field = role === 'payer' ? 'payerId' : 'requesterId';
  const q = query(reqCol, where(field, '==', userId), orderBy('createdAt', 'desc'), limit(30));

  return onSnapshot(
    q,
    (snap) => {
      const list: MoneyRequest[] = [];
      snap.forEach((d) => list.push(d.data() as MoneyRequest));
      callback(list);
    },
    (err) => {
      console.warn('[Savings] Money requests subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Calculates the exact spare change round-up amount based on user settings
 */
export function calculateRoundUp(amount: number, settings?: RoundUpSettings | null): number {
  if (!settings || !settings.enabled || settings.paused || !settings.targetVaultId) {
    return 0;
  }
  if (!amount || amount <= 0) {
    return 0;
  }

  const step = settings.step || 1;
  const multiplier = settings.multiplier || 1;

  let nextTarget = Math.ceil(amount / step) * step;
  // If exact multiple (e.g. $10.00 on step 1), no spare change
  let diff = nextTarget - amount;
  if (diff <= 0.001) {
    return 0;
  }

  const total = Math.round(diff * multiplier * 100) / 100;
  return total;
}

/**
 * Persist user round-up preferences to their MemberAccount document
 */
export async function updateRoundUpSettings(
  businessId: string,
  userId: string,
  settings: RoundUpSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    await setDoc(
      accountRef,
      {
        roundUpSettings: settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Update round-up settings error:', err);
    return { success: false, error: err?.message || 'Failed to update round-up settings.' };
  }
}

/**
 * Executes an automated micro-saving round-up for a logged expense book entry
 */
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
  const { businessId, userId, entryAmount, bookEntryId, bookName } = params;

  if (entryAmount <= 0) {
    return { success: true, roundUpAmount: 0 };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      return { success: true, roundUpAmount: 0, skippedReason: 'no_account' };
    }

    const account = accountSnap.data() as MemberAccount;
    const settings = account.roundUpSettings;

    if (!settings || !settings.enabled || settings.paused || !settings.targetVaultId) {
      return { success: true, roundUpAmount: 0, skippedReason: 'disabled' };
    }

    const roundUpAmount = calculateRoundUp(entryAmount, settings);
    if (roundUpAmount <= 0) {
      return { success: true, roundUpAmount: 0, skippedReason: 'zero_diff' };
    }

    // Check safety floor guard (e.g. don't round up if balance falls below $20)
    const safetyFloor = settings.safetyFloor || 0;
    if (account.mainBalance - roundUpAmount < safetyFloor) {
      return {
        success: true,
        roundUpAmount: 0,
        skippedReason: 'safety_floor_triggered',
      };
    }

    const vaultRef = doc(firestore, 'businesses', businessId, 'vaults', settings.targetVaultId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    let vaultName = settings.targetVaultName || 'Savings Vault';

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      if (!accSnap.exists()) throw new Error('Member account not found.');
      const currentAccount = accSnap.data() as MemberAccount;

      if (currentAccount.mainBalance < roundUpAmount) {
        throw new Error('Insufficient spendable balance for round-up.');
      }

      const vSnap = await t.get(vaultRef);
      if (!vSnap.exists()) {
        throw new Error('Target savings vault not found.');
      }
      const vaultData = vSnap.data() as SavingsVault;
      vaultName = vaultData.name;

      // 1. Deduct from main balance, add to locked savings
      t.update(accountRef, {
        mainBalance: currentAccount.mainBalance - roundUpAmount,
        lockedSavingsBalance: (currentAccount.lockedSavingsBalance || 0) + roundUpAmount,
        updatedAt: new Date().toISOString(),
      });

      // 2. Credit target vault
      t.update(vaultRef, {
        currentAmount: (vaultData.currentAmount || 0) + roundUpAmount,
        updatedAt: new Date().toISOString(),
      });

      // 3. Write immutable wallet transaction
      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'round_up_deposit',
        amount: roundUpAmount,
        currency: currentAccount.currency || 'USD',
        vaultId: settings.targetVaultId,
        vaultName: vaultData.name,
        status: 'completed',
        note: `Spare change rounded up from ${bookName || 'Expense'} ($${entryAmount.toFixed(2)})`,
        createdAt: new Date().toISOString(),
      };
      t.set(newTxRef, tx);
    });

    dispatchSavingsNotification({
      userId,
      businessId,
      title: 'Spare Change Stashed',
      message: `Rounded up $${roundUpAmount.toFixed(2)} from ${bookName || 'Expense'} into ${vaultName}.`,
      type: 'round_up_stashed',
      color: '#06b6d4',
      data: { roundUpAmount, vaultName, bookEntryId, bookName },
    }).catch(() => {});

    return {
      success: true,
      roundUpAmount,
      vaultName,
    };
  } catch (err: any) {
    console.warn('[Savings] Round-up execution note:', err?.message);
    return {
      success: false,
      error: err?.message || 'Round-up execution could not be completed.',
    };
  }
}

/**
 * Calculates the next due date string (YYYY-MM-DD) for a scheduled stash frequency
 */
export function calculateNextStashDueDate(
  frequency: ScheduledStashFrequency,
  fromDate: Date = new Date()
): string {
  const d = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'payday': {
      // 1st or 15th of the month
      const currentDay = d.getDate();
      if (currentDay < 15) {
        d.setDate(15);
      } else {
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
      }
      break;
    }
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Create a new scheduled recurring stash rule
 */
export async function createScheduledStashRule(params: {
  businessId: string;
  userId: string;
  targetVaultId: string;
  targetVaultName?: string;
  amount: number;
  frequency: ScheduledStashFrequency;
  startDate?: string;
}): Promise<{ success: boolean; rule?: ScheduledStashRule; error?: string }> {
  const {
    businessId,
    userId,
    targetVaultId,
    targetVaultName,
    amount,
    frequency,
    startDate,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Stash amount must be greater than zero.' };
  }
  if (!targetVaultId) {
    return { success: false, error: 'Please select a destination vault.' };
  }

  try {
    const firestore = getDb();
    const stashCol = collection(firestore, 'businesses', businessId, 'scheduled_stashes');
    const newDocRef = doc(stashCol);

    const nextDueDate = startDate || calculateNextStashDueDate(frequency);

    const rule: ScheduledStashRule = {
      id: newDocRef.id,
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

    await setDoc(newDocRef, rule);
    return { success: true, rule };
  } catch (err: any) {
    console.error('[Savings] Create scheduled stash rule error:', err);
    return { success: false, error: err?.message || 'Failed to create scheduled stash.' };
  }
}

/**
 * Update an existing scheduled stash rule
 */
export async function updateScheduledStashRule(
  businessId: string,
  ruleId: string,
  updates: Partial<ScheduledStashRule>
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    const ruleRef = doc(firestore, 'businesses', businessId, 'scheduled_stashes', ruleId);
    await updateDoc(ruleRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Update scheduled stash rule error:', err);
    return { success: false, error: err?.message || 'Failed to update scheduled stash.' };
  }
}

/**
 * Delete a scheduled stash rule
 */
export async function deleteScheduledStashRule(
  businessId: string,
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    const ruleRef = doc(firestore, 'businesses', businessId, 'scheduled_stashes', ruleId);
    await deleteDoc(ruleRef);
    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Delete scheduled stash rule error:', err);
    return { success: false, error: err?.message || 'Failed to delete scheduled stash.' };
  }
}

/**
 * Toggle pause / active state on a scheduled stash rule
 */
export async function togglePauseScheduledStashRule(
  businessId: string,
  ruleId: string,
  currentStatus: ScheduledStashRule['status']
): Promise<{ success: boolean; error?: string }> {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  return updateScheduledStashRule(businessId, ruleId, { status: newStatus });
}

/**
 * Subscribe in real-time to active scheduled stash rules for a user
 */
export function subscribeToScheduledStashRules(
  businessId: string,
  userId: string,
  callback: (rules: ScheduledStashRule[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const stashCol = collection(db, 'businesses', businessId, 'scheduled_stashes');
  const q = query(stashCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const list: ScheduledStashRule[] = [];
      snap.forEach((d) => list.push(d.data() as ScheduledStashRule));
      callback(list);
    },
    (err) => {
      console.warn('[Savings] Scheduled stash subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Process and execute any due scheduled stashes automatically (catch-up & execution)
 */
export async function processDueScheduledStashes(
  businessId: string,
  userId: string
): Promise<{ processedCount: number; totalAmountSaved: number }> {
  const firestore = getDb();
  const stashCol = collection(firestore, 'businesses', businessId, 'scheduled_stashes');

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Query active rules for user where nextDueDate <= today
  const q = query(
    stashCol,
    where('userId', '==', userId),
    where('status', '==', 'active'),
    where('nextDueDate', '<=', todayStr)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    return { processedCount: 0, totalAmountSaved: 0 };
  }

  let processedCount = 0;
  let totalAmountSaved = 0;

  const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);

  for (const docSnap of snap.docs) {
    const rule = docSnap.data() as ScheduledStashRule;
    const ruleRef = docSnap.ref;
    const vaultRef = doc(firestore, 'businesses', businessId, 'vaults', rule.targetVaultId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    try {
      let executedVaultName = '';
      let executedCurrency = 'USD';

      await runTransaction(firestore, async (t) => {
        const accSnap = await t.get(accountRef);
        if (!accSnap.exists()) return;
        const account = accSnap.data() as MemberAccount;

        // Skip execution if insufficient funds in spendable balance
        if (account.mainBalance < rule.amount) {
          console.warn(`[Savings] Skipped scheduled stash ${rule.id}: insufficient funds.`);
          return;
        }

        const vSnap = await t.get(vaultRef);
        if (!vSnap.exists()) return;
        const vault = vSnap.data() as SavingsVault;
        executedVaultName = vault.name;
        executedCurrency = account.currency || 'USD';

        // 1. Deduct main, credit locked
        t.update(accountRef, {
          mainBalance: account.mainBalance - rule.amount,
          lockedSavingsBalance: (account.lockedSavingsBalance || 0) + rule.amount,
          updatedAt: new Date().toISOString(),
        });

        // 2. Credit vault
        t.update(vaultRef, {
          currentAmount: (vault.currentAmount || 0) + rule.amount,
          updatedAt: new Date().toISOString(),
        });

        // 3. Register transaction
        const tx: WalletTransaction = {
          id: newTxRef.id,
          businessId,
          userId,
          type: 'scheduled_stash_deposit',
          amount: rule.amount,
          currency: executedCurrency,
          vaultId: rule.targetVaultId,
          vaultName: vault.name,
          status: 'completed',
          note: `Recurring ${rule.frequency} stash into ${vault.name}`,
          createdAt: new Date().toISOString(),
        };
        t.set(newTxRef, tx);

        // 4. Advance nextDueDate and increment occurrence count
        const nextDue = calculateNextStashDueDate(rule.frequency, new Date());
        t.update(ruleRef, {
          nextDueDate: nextDue,
          occurrencesCount: (rule.occurrencesCount || 0) + 1,
          lastExecutedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        processedCount++;
        totalAmountSaved += rule.amount;
      });

      if (executedVaultName) {
        dispatchSavingsNotification({
          userId,
          businessId,
          title: 'Scheduled Stash Saved',
          message: `Automated ${rule.frequency} stash of ${executedCurrency} ${rule.amount.toFixed(2)} stashed into ${executedVaultName}.`,
          type: 'scheduled_stash',
          color: '#8b5cf6',
          data: { vaultId: rule.targetVaultId, vaultName: executedVaultName, amount: rule.amount },
        }).catch(() => {});
      }
    } catch (e: any) {
      console.warn(`[Savings] Execution error on stash rule ${rule.id}:`, e?.message);
    }
  }

  return { processedCount, totalAmountSaved };
}

/**
 * Deduct funds from member spendable wallet when paid via Spndy Wallet for a book expense
 */
export async function deductSpendableForBookExpense(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  bookEntryId: string;
  bookName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    userId,
    amount,
    currency = 'USD',
    bookEntryId,
    bookName = 'Book Expense',
    note,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Expense amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      if (!accSnap.exists()) {
        throw new Error('Member spendable account not found.');
      }
      const acc = accSnap.data() as MemberAccount;
      if (acc.mainBalance < amount) {
        throw new Error(`Insufficient wallet balance (${acc.mainBalance} < ${amount}).`);
      }

      t.update(accountRef, {
        mainBalance: acc.mainBalance - amount,
        updatedAt: new Date().toISOString(),
      });

      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'book_expense_payment',
        amount,
        currency: acc.currency || currency,
        status: 'completed',
        note: note || `Payment for ${bookName} entry`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Deduct spendable for book expense error:', err);
    return { success: false, error: err?.message || 'Failed to deduct spendable wallet balance.' };
  }
}

/**
 * Credit funds to member spendable wallet when receiving income via Spndy Wallet for a book entry
 */
export async function creditSpendableForBookIncome(params: {
  businessId: string;
  userId: string;
  amount: number;
  currency?: string;
  bookEntryId: string;
  bookName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    userId,
    amount,
    currency = 'USD',
    bookEntryId,
    bookName = 'Book Income',
    note,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Income amount must be greater than zero.' };
  }

  try {
    const firestore = getDb();
    const accountRef = doc(firestore, 'businesses', businessId, 'accounts', userId);
    const txCol = collection(firestore, 'businesses', businessId, 'wallet_transactions');
    const newTxRef = doc(txCol);

    await runTransaction(firestore, async (t) => {
      const accSnap = await t.get(accountRef);
      const currentMain = accSnap.exists() ? (accSnap.data().mainBalance || 0) : 0;
      const currentLocked = accSnap.exists() ? (accSnap.data().lockedSavingsBalance || 0) : 0;

      const updatedAccount: Partial<MemberAccount> = {
        id: userId,
        businessId,
        userId,
        mainBalance: currentMain + amount,
        lockedSavingsBalance: currentLocked,
        currency,
        updatedAt: new Date().toISOString(),
      };

      if (!accSnap.exists()) {
        updatedAccount.createdAt = new Date().toISOString();
      }

      t.set(accountRef, updatedAccount, { merge: true });

      const tx: WalletTransaction = {
        id: newTxRef.id,
        businessId,
        userId,
        type: 'book_income_deposit',
        amount,
        currency,
        status: 'completed',
        note: note || `Income credit from ${bookName} entry`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Savings] Credit spendable for book income error:', err);
    return { success: false, error: err?.message || 'Failed to credit spendable wallet balance.' };
  }
}

