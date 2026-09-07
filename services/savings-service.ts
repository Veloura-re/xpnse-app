import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  MemberAccount,
  SavingsVault,
  WalletTransaction,
  WalletTransactionType,
  Business,
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

      // Update Account balances
      t.update(accountRef, {
        mainBalance: (accData.mainBalance || 0) - amount,
        lockedSavingsBalance: (accData.lockedSavingsBalance || 0) + amount,
        updatedAt: new Date().toISOString(),
      });

      // Update Vault balance
      t.update(vaultRef, {
        currentAmount: (vaultData.currentAmount || 0) + amount,
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
        vaultName: vaultData.name || vaultName,
        status: 'completed',
        note: `Allocated to ${vaultData.name || vaultName}`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

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
        vaultName: vaultData.name || vaultName,
        status: 'completed',
        note: `Released from ${vaultData.name || vaultName}`,
        createdAt: new Date().toISOString(),
      };

      t.set(newTxRef, tx);
    });

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
  const q = query(txCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const txList: WalletTransaction[] = [];
      snapshot.forEach((docSnap) => {
        txList.push(docSnap.data() as WalletTransaction);
      });
      callback(txList.slice(0, maxItems));
    },
    (err) => {
      console.warn('[Savings] Transactions subscription error:', err);
      callback([]);
    }
  );
}
