import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Business, Book, BookEntry, ActivityLog, UserRole, BusinessMember, User, Party } from '@/types';
import { mockBusinesses, mockBooks, mockEntries, mockActivityLogs, mockUsers } from '@/mocks/data';
import { useAuth } from './auth-provider';
import { useStorage } from './storage-provider';
import { v4 as uuidv4 } from 'uuid';
import { db, firebaseInitialized } from '@/config/firebase';
import { collection, query, where, getDocs, getDoc, limit, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, increment, orderBy, arrayUnion, runTransaction, QuerySnapshot, QueryDocumentSnapshot, FirestoreError, DocumentData, Transaction } from 'firebase/firestore';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface BusinessState {
  // Existing state
  businesses: Business[];
  currentBusiness: Business | null;
  books: Book[];
  activityLogs: ActivityLog[];
  isLoading: boolean;
  currentUserRole: UserRole | null;

  // Business management
  switchBusiness: (businessId: string) => void;
  createBusiness: (name: string, currency?: string, icon?: string, color?: string) => Promise<void>;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
  updateBusinessFont: (fontId: string) => Promise<void>;
  updateBusinessLogo: (icon: string, color: string) => Promise<void>;
  deleteBusiness: (businessId: string) => Promise<void>;
  leaveBusiness: (businessId: string) => Promise<void>;
  touchBook: (bookId: string) => Promise<void>;

  // Book management
  createBook: (name: string, settings?: { showPaymentMode: boolean; showCategory: boolean; showAttachments: boolean }) => Promise<void>;
  updateBook: (bookId: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  copyBook: (bookId: string, targetBusinessId: string) => Promise<{ success: boolean; message: string }>;
  moveBook: (bookId: string, targetBusinessId: string) => Promise<{ success: boolean; message: string }>;

  // Entry management
  addEntry: (entry: Omit<BookEntry, 'id' | 'createdAt' | 'userId'>, context?: { bookName?: string, currentBalance?: number }) => Promise<void>;
  updateEntry: (entryId: string, updates: Partial<Omit<BookEntry, 'id' | 'businessId' | 'bookId' | 'userId' | 'createdAt'>>, context?: { bookName?: string, currentBalance?: number }) => Promise<void>;
  deleteEntry: (entryId: string, context?: { bookName?: string }) => Promise<void>;
  transferEntry: (entry: BookEntry, targetBookId: string) => Promise<void>;

  // Team management
  inviteTeamMember: (email: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  searchUserByEmail: (email: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  updateTeamMemberRole: (userId: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  removeTeamMember: (userId: string) => Promise<{ success: boolean; message: string }>;
  getTeamMembers: () => BusinessMember[];

  // Permissions
  getUserRole: (businessId?: string) => UserRole | null;
  hasPermission: (requiredRole: UserRole) => boolean;
  autoCategorize: (description: string) => string | undefined;

  // Party management
  parties: Party[];
  createParty: (name: string, type: 'customer' | 'vendor', email?: string, phone?: string) => Promise<void>;
  updateParty: (partyId: string, updates: Partial<Party>) => Promise<void>;
  deleteParty: (partyId: string) => Promise<void>;
}

export const [BusinessProvider, useBusiness] = createContextHook((): BusinessState => {
  const { user } = useAuth();
  const storage = useStorage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore Listeners
  useEffect(() => {
    if (!user || !db) {
      setBusinesses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Query businesses where user is a member (using memberIds array for efficient querying)
    // Note: We need to ensure we write 'memberIds' to the business document
    const q = query(
      collection(db, 'businesses'),
      where('memberIds', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const businessList: Business[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        businessList.push({ id: doc.id, ...doc.data() } as Business);
      });

      // Sort businesses by lastActiveAt (descending) so Businesses[0] is the most recent
      businessList.sort((a, b) => {
        const timeA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const timeB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return timeB - timeA;
      });

      setBusinesses(businessList);

      // If current business is not in the new list (e.g. deleted or removed), deselect it
      if (currentBusiness && !businessList.find(b => b.id === currentBusiness.id)) {
        setCurrentBusiness(null);
      }

      setIsLoading(false);
    }, (error: FirestoreError) => {
      console.error("Error fetching businesses:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]); // Removed currentBusiness dependency to prevent re-subscription loops

  // Sync currentBusiness with businesses state
  useEffect(() => {
    if (!currentBusiness) return;

    const updatedBusiness = businesses.find((b: Business) => b.id === currentBusiness.id);
    if (updatedBusiness) {
      if (updatedBusiness !== currentBusiness) {
        setCurrentBusiness(updatedBusiness);
      }
    } else if (businesses.length > 0 && !isLoading) {
      // Current business removed/deleted
      setCurrentBusiness(null);
      if (user) storage.removeItem(`currentBusinessId_${user.id}`);
    }
  }, [businesses, currentBusiness, isLoading, storage, user]);

  // Books and activity logs are now loaded on-demand in their respective screens
  // This optimizes login performance by not loading unnecessary data upfront

  // Helper function to find user by email
  const findUserByEmail = async (email: string): Promise<User | undefined> => {
    try {
      console.log('🔍 [findUserByEmail] Starting search for:', email);

      // First try Firebase if initialized
      if (firebaseInitialized && db) {
        const normalizedEmail = email.trim().toLowerCase();
        console.log('🔍 [findUserByEmail] Normalized email:', normalizedEmail);

        // Query Firestore users collection by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', normalizedEmail), limit(1));

        console.log('🔍 [findUserByEmail] Executing Firestore query...');
        const querySnapshot = await getDocs(q);
        console.log('🔍 [findUserByEmail] Query completed. Empty?', querySnapshot.empty, 'Size:', querySnapshot.size);

        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs[0];
          const userData = docSnapshot.data();
          console.log('✅ [findUserByEmail] User found in Firestore:', { id: docSnapshot.id, email: userData.email });

          return {
            id: docSnapshot.id,
            email: userData.email || email,
            name: userData.displayName || userData.name || email.split('@')[0],
            displayName: userData.displayName || userData.name || email.split('@')[0],
            phoneNumber: userData.phoneNumber || '',
            avatar: userData.photoURL || userData.avatar || undefined,
          } as User;
        }

        console.log('⚠️ [findUserByEmail] User not found in Firestore, checking mock users...');
        // If not found in Firestore, check mock users as fallback
        const mockUser = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);
        if (mockUser) {
          console.log('✅ [findUserByEmail] User found in mock data:', mockUser.email);
          return mockUser;
        }

        console.log('❌ [findUserByEmail] User not found anywhere');
        return undefined;
      } else {
        console.log('⚠️ [findUserByEmail] Firebase not initialized, using mock data only');
        // Fallback to mock data if Firebase not initialized
        return mockUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      }
    } catch (error: any) {
      console.error('❌ [findUserByEmail] Error occurred:', error);
      console.error('❌ [findUserByEmail] Error code:', error?.code);
      console.error('❌ [findUserByEmail] Error message:', error?.message);

      // Fallback to mock data on error
      return mockUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    }
  };

  // Helper function to check permissions
  const hasPermission = useCallback((requiredRole: UserRole): boolean => {
    if (!currentBusiness || !user) return false;

    // Find the member record for this user
    const member = currentBusiness.members?.find((m: BusinessMember) => m.userId === user.id);
    if (!member) return false;

    const roleHierarchy: Record<UserRole, number> = {
      'owner': 3,
      'partner': 2,
      'viewer': 1
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }, [currentBusiness, user]);

  // User lost access, switch to first available business or clear
  useEffect(() => {
    if (!user) return;

    if (!isLoading && businesses.length > 0 && !currentBusiness) {
      // Try to restore last used business specifically for this user
      storage.getItem(`currentBusinessId_${user.id}`).then(lastId => {
        if (lastId) {
          const found = businesses.find((b: Business) => b.id === lastId);
          if (found) {
            setCurrentBusiness(found);
            return;
          }
        }
        // Default to first one (which is now sorted by lastActiveAt)
        setCurrentBusiness(businesses[0]);
      });
    } else if (!isLoading && businesses.length === 0) {
      setCurrentBusiness(null);
    }
  }, [businesses, isLoading, currentBusiness, user, storage]);

  const switchBusiness = useCallback(async (businessId: string) => {
    if (!user) return;
    const business = businesses.find((b: Business) => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      await storage.setItem(`currentBusinessId_${user.id}`, businessId);
      // Update lastActiveAt for business
      if (db) {
        try {
          await updateDoc(doc(db, 'businesses', businessId), {
            lastActiveAt: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error updating business activity:", error);
        }
      }
    }
  }, [businesses, storage, user]);

  const createBusiness = useCallback(async (name: string, currency: string = 'USD', icon?: string, color?: string) => {
    if (!user || !db) return;

    const newBusinessId = uuidv4();
    const newBusiness: Business = {
      id: newBusinessId,
      name,
      ownerId: user.id!,
      currency,

      icon,
      color,
      createdAt: new Date().toISOString(),
      members: [{
        id: uuidv4(),
        userId: user.id!,
        businessId: newBusinessId,
        role: 'owner',
        user: user,
        joinedAt: new Date().toISOString(),
      }],
      lastActiveAt: new Date().toISOString(),
    };

    // Add memberIds array for querying
    const businessDoc = {
      ...newBusiness,
      memberIds: [user.id!]
    };

    try {
      // Deep filter to remove undefined values from nested objects
      const filterUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(filterUndefined);

        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            filtered[key] = filterUndefined(value);
          }
        }
        return filtered;
      };

      const cleanBusinessDoc = filterUndefined(businessDoc);

      await setDoc(doc(db, 'businesses', newBusinessId), cleanBusinessDoc);
      // No need to set state manually, the onSnapshot listener will pick it up
      setCurrentBusiness(newBusiness);
      await storage.setItem(`currentBusinessId_${user.id}`, newBusinessId);
    } catch (error) {
      console.error("Error creating business:", error);
      throw error;
    }
  }, [user, storage]);

  const updateBusiness = useCallback(async (updates: Partial<Business>) => {
    if (!currentBusiness || !db) return;
    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id), updates);
      // State update handled by onSnapshot
    } catch (error) {
      console.error("Error updating business:", error);
      throw error;
    }
  }, [currentBusiness, db]);

  const updateBusinessFont = useCallback(async (fontId: string) => {
    if (!currentBusiness) return;
    await updateBusiness({ selectedFont: fontId });
  }, [currentBusiness, updateBusiness]);

  const updateBusinessLogo = useCallback(async (icon: string, color: string) => {
    if (!currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      throw new Error('Only owners and partners can update business logo');
    }

    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id), {
        icon,
        color
      });
      // State update handled by onSnapshot
    } catch (error) {
      console.error("Error updating business logo:", error);
      throw error;
    }
  }, [currentBusiness, db, hasPermission]);

  const deleteBusiness = useCallback(async (businessId: string) => {
    if (!user || !db) return;

    const business = businesses.find((b: Business) => b.id === businessId);
    if (!business || business.ownerId !== user.id) {
      return;
    }

    try {
      // 1. Delete all entries for this business (client-side best effort)
      // Note: In a real app, use Cloud Functions for recursive delete
      const entriesQuery = query(collection(db, 'businesses', businessId, 'entries'));
      const entriesSnapshot = await getDocs(entriesQuery);
      const batch = writeBatch(db);

      entriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Delete all books
      const booksQuery = query(collection(db, 'businesses', businessId, 'books'));
      const booksSnapshot = await getDocs(booksQuery);
      booksSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete the business document
      batch.delete(doc(db, 'businesses', businessId));

      await batch.commit();

      if (currentBusiness?.id === businessId) {
        setCurrentBusiness(null);
        await storage.removeItem('currentBusinessId');
      }
    } catch (error) {
      console.error("Error deleting business:", error);
      throw error;
    }
  }, [user, businesses, currentBusiness, storage, db]);

  const leaveBusiness = useCallback(async (businessId: string) => {
    if (!user || !db) return;

    const business = businesses.find((b: Business) => b.id === businessId);
    if (!business) return;

    if (business.ownerId === user.id) {
      console.warn('Owners cannot leave their own business. Delete or transfer ownership instead.');
      return;
    }

    try {
      const updatedMembers = business.members.filter((m: BusinessMember) => m.userId !== user.id);
      const updatedMemberIds = business.memberIds?.filter((id: string) => id !== user.id) || [];

      await updateDoc(doc(db, 'businesses', businessId), {
        members: updatedMembers,
        memberIds: updatedMemberIds
      });

      if (currentBusiness?.id === businessId) {
        setCurrentBusiness(null);
        await storage.removeItem('currentBusinessId');
      }
    } catch (error) {
      console.error("Error leaving business:", error);
      throw error;
    }
  }, [user, businesses, currentBusiness, storage, db]);

  const touchBook = useCallback(async (bookId: string) => {
    if (!currentBusiness || !db) return;
    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'books', bookId), {
        lastActiveAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error touching book:", error);
    }
  }, [currentBusiness, db]);

  const createBook = useCallback(async (name: string, settings?: { showPaymentMode: boolean; showCategory: boolean; showAttachments: boolean }) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can create books');
      return;
    }

    const newBook: Book = {
      id: uuidv4(),
      businessId: currentBusiness.id,
      name,
      createdAt: new Date().toISOString(),
      createdBy: user.id!,
      totalCashIn: 0,
      totalCashOut: 0,
      netBalance: 0,
      settings: settings || {
        showPaymentMode: true,
        showCategory: true,
        showAttachments: true,
      },
    };

    try {
      // Deep filter to remove undefined values from nested objects
      const filterUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(filterUndefined);

        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            filtered[key] = filterUndefined(value);
          }
        }
        return filtered;
      };

      const bookData = filterUndefined(newBook);

      await setDoc(doc(db, 'businesses', currentBusiness.id, 'books', newBook.id), bookData);

      // Log activity for book creation
      const newActivity: ActivityLog = {
        id: uuidv4(),
        entityType: 'book',
        entityId: currentBusiness.id,
        userId: user.id!,
        action: 'create_book',
        timestamp: new Date().toISOString(),
        metadata: {
          bookName: name,
          bookId: newBook.id
        },
        user: {
          id: user.id || '',
          uid: user.uid || user.id || '',
          email: user.email || '',
          name: user.name || user.displayName || '',
          displayName: user.displayName || user.name || '',
          phoneNumber: user.phoneNumber || '',
          avatar: user.avatar || '',
          emailVerified: user.emailVerified || false,
          isAnonymous: user.isAnonymous || false,
          disabled: user.disabled || false,
          metadata: {},
          providerData: []
        }
      };

      const cleanActivity = JSON.parse(JSON.stringify(newActivity));
      await setDoc(doc(db, 'activityLogs', newActivity.id), cleanActivity);

      // Notify team members about the new book
      const teamMembers = (currentBusiness.members || []).filter((m: BusinessMember) => m.userId !== user.id);

      for (const member of teamMembers) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: member.userId,
            title: 'New Book Created',
            message: `${user.displayName || user.name || user.email} created a new book "${name}" in ${currentBusiness.name}`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'book_created',
            metadata: {
              businessId: currentBusiness.id,
              businessName: currentBusiness.name,
              bookId: newBook.id,
              bookName: name
            }
          });
        } catch (notifError) {
          console.error('Error sending notification to team member:', notifError);
        }
      }
    } catch (error) {
      console.error("Error creating book:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db]);

  const updateBook = useCallback(async (bookId: string, updates: Partial<Book>) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can update books');
      return;
    }

    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'books', bookId), updates);
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db]);

  const deleteBook = useCallback(async (bookId: string) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('owner')) {
      console.warn('Only owners can delete books');
      return;
    }

    try {
      // Fetch book data first to get the name for notification
      const bookRef = doc(db, 'businesses', currentBusiness.id, 'books', bookId);
      const bookSnap = await getDoc(bookRef);
      const bookName = bookSnap.exists() ? (bookSnap.data() as Book).name : (books.find((b: Book) => b.id === bookId)?.name || 'Unknown Book');


      const batch = writeBatch(db);

      // Delete all entries in this book
      const entriesQuery = query(
        collection(db, 'businesses', currentBusiness.id, 'entries'),
        where('bookId', '==', bookId)
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      entriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the book
      batch.delete(bookRef);

      await batch.commit();

      // Notify team members about book deletion
      if (bookName && bookName !== 'Unknown Book') {
        const membersToNotify = currentBusiness.members.filter((m: BusinessMember) => m.userId !== user.id);
        for (const member of membersToNotify) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: member.userId,
              title: 'Book Deleted',
              message: `${user.name || user.email} deleted the book "${bookName}"`,
              read: false,
              createdAt: new Date().toISOString(),
              type: 'book_deleted',
              metadata: {
                businessId: currentBusiness.id,
                businessName: currentBusiness.name,
                bookId: bookId,
                deletedBy: user.name || user.email
              }
            });
          } catch (notifError) {
            console.error('Error sending notification to team member:', notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db]);

  const addEntry = useCallback(async (entryData: Omit<BookEntry, 'id' | 'createdAt' | 'userId'>, context?: { bookName?: string, currentBalance?: number }) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can add entries');
      return;
    }

    const newEntryId = uuidv4();
    const newEntry: BookEntry = {
      ...entryData,
      id: newEntryId,
      userId: user.id!,
      createdAt: new Date().toISOString(),
      businessId: currentBusiness.id, // Ensure businessId is set
    };

    try {
      // Filter out undefined values to prevent Firestore errors
      const entryDataFiltered = Object.fromEntries(
        Object.entries(newEntry).filter(([_, value]) => value !== undefined)
      );

      await setDoc(doc(db, 'businesses', currentBusiness.id, 'entries', newEntryId), entryDataFiltered);

      // Update book totals atomically
      const bookRef = doc(db, 'businesses', currentBusiness.id, 'books', entryData.bookId);
      const amount = Number(entryData.amount) || 0;

      await updateDoc(bookRef, {
        totalCashIn: entryData.type === 'cash_in' ? increment(amount) : increment(0),
        totalCashOut: entryData.type === 'cash_out' ? increment(amount) : increment(0),
        netBalance: entryData.type === 'cash_in' ? increment(amount) : increment(-amount)
      });

      // Update party totals if partyId is present
      if (entryData.partyId) {
        const partyRef = doc(db, 'businesses', currentBusiness.id, 'parties', entryData.partyId);
        await updateDoc(partyRef, {
          totalCashIn: entryData.type === 'cash_in' ? increment(amount) : increment(0),
          totalCashOut: entryData.type === 'cash_out' ? increment(amount) : increment(0),
          balance: entryData.type === 'cash_in' ? increment(amount) : increment(-amount)
        });
      }

      // Notify team members about new entry
      const membersToNotify = (currentBusiness.members || []).filter((m: BusinessMember) => m.userId !== user.id);

      // Get book name for notification
      let bookName = context?.bookName || 'Unknown Book';

      // If not provided in context, try to find in state
      if (bookName === 'Unknown Book') {
        const knownBook = books.find((b: Book) => b.id === entryData.bookId);
        if (knownBook) {
          bookName = knownBook.name;
        } else {
          // Try fetch if not in state
          try {
            const bookSnap = await getDoc(bookRef);
            if (bookSnap.exists()) {
              bookName = (bookSnap.data() as Book).name;
            }
          } catch (e) {
            // Ignore error, keep default
          }
        }
      }

      // Calculate new balance for notification
      let newBalanceStr = '';
      if (context?.currentBalance !== undefined) {
        const currentBal = Number(context.currentBalance);
        const change = entryData.type === 'cash_in' ? amount : -amount;
        const newTotal = currentBal + change;

        newBalanceStr = formatCurrency(newTotal, currentBusiness?.currency);
      }

      const description = entryData.description ? `"${entryData.description}"` : 'an entry';
      const balanceText = newBalanceStr ? `. Balance: ${newBalanceStr}` : '';

      if (bookName && bookName !== 'Unknown Book') {
        for (const member of membersToNotify) {
          try {
            const entryTypeName = entryData.type === 'cash_in' ? 'Cash In' : 'Cash Out';
            await addDoc(collection(db, 'notifications'), {
              id: uuidv4(),
              title: entryData.type === 'cash_in' ? 'Money Received' : 'Money Paid',
              message: `${user.displayName || user.name || user.email} added ${entryTypeName} of ${formatCurrency(amount, currentBusiness.currency)} for ${description} to "${bookName}"${balanceText}`,
              timestamp: new Date().toISOString(),
              type: entryData.type === 'cash_in' ? 'success' : 'error',
              userId: member.userId,
              businessId: currentBusiness.id,
              metadata: {
                businessId: currentBusiness.id,
                businessName: currentBusiness.name,
                bookId: entryData.bookId,
                bookName: bookName,
                entryId: newEntryId,
                amount: amount,
                description: entryData.description,
                type: entryData.type,
                addedBy: user.displayName || user.name || user.email,
                newBalance: newBalanceStr
              }
            });
          } catch (notifError) {
            console.error('Error sending notification to team member:', notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db, books]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<Omit<BookEntry, 'id' | 'businessId' | 'bookId' | 'userId' | 'createdAt'>>, context?: { bookName?: string, currentBalance?: number }) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can update entries');
      return;
    }

    try {
      // Get old entry first to calculate difference
      const entryRef = doc(db, 'businesses', currentBusiness.id, 'entries', entryId);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists()) return;

      const oldEntry = entrySnap.data() as BookEntry;
      const bookRef = doc(db, 'businesses', currentBusiness.id, 'books', oldEntry.bookId);

      // Update the entry
      const { id, userId, createdAt, businessId, bookId, ...restUpdates } = updates as any;

      // Filter out undefined values
      const safeUpdates = Object.fromEntries(
        Object.entries(restUpdates).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(entryRef, safeUpdates);

      // Calculate adjustments if amount or type changed
      const newAmount = updates.amount !== undefined ? Number(updates.amount) : Number(oldEntry.amount);
      const newType = updates.type || oldEntry.type;

      const oldAmount = Number(oldEntry.amount);
      const oldType = oldEntry.type;

      // Prepare atomic updates
      const batchUpdates: any = {};

      // Actually, let's calculate the net change for each field
      let cashInChange = 0;
      let cashOutChange = 0;
      let netChange = 0;

      // Remove old
      if (oldType === 'cash_in') {
        cashInChange -= oldAmount;
        netChange -= oldAmount;
      } else {
        cashOutChange -= oldAmount;
        netChange += oldAmount;
      }

      // Add new
      if (newType === 'cash_in') {
        cashInChange += newAmount;
        netChange += newAmount;
      } else {
        cashOutChange += newAmount;
        netChange -= newAmount;
      }

      if (Math.abs(netChange) > 0 || Math.abs(cashInChange) > 0 || Math.abs(cashOutChange) > 0) {
        await updateDoc(bookRef, {
          totalCashIn: increment(cashInChange),
          totalCashOut: increment(cashOutChange),
          netBalance: increment(netChange)
        });
      }

      // Update party totals
      // If party changed, we need to update both old and new parties
      const newPartyId = updates.partyId !== undefined ? updates.partyId : oldEntry.partyId;
      const oldPartyId = oldEntry.partyId;

      // If party didn't change and there is a party
      if (newPartyId === oldPartyId && newPartyId) {
        const partyRef = doc(db, 'businesses', currentBusiness.id, 'parties', newPartyId);
        if (Math.abs(netChange) > 0 || Math.abs(cashInChange) > 0 || Math.abs(cashOutChange) > 0) {
          await updateDoc(partyRef, {
            totalCashIn: increment(cashInChange),
            totalCashOut: increment(cashOutChange),
            balance: increment(netChange)
          });
        }
      }
      // If party changed
      else {
        // Remove from old party if it existed
        if (oldPartyId) {
          const oldPartyRef = doc(db, 'businesses', currentBusiness.id, 'parties', oldPartyId);
          // Calculate what to remove (reverse of adding old entry)
          const oldIn = oldType === 'cash_in' ? oldAmount : 0;
          const oldOut = oldType === 'cash_out' ? oldAmount : 0;
          const oldNet = oldType === 'cash_in' ? oldAmount : -oldAmount;

          await updateDoc(oldPartyRef, {
            totalCashIn: increment(-oldIn),
            totalCashOut: increment(-oldOut),
            balance: increment(-oldNet)
          });
        }

        // Add to new party if it exists
        if (newPartyId) {
          const newPartyRef = doc(db, 'businesses', currentBusiness.id, 'parties', newPartyId);
          // Calculate what to add (new entry values)
          const newIn = newType === 'cash_in' ? newAmount : 0;
          const newOut = newType === 'cash_out' ? newAmount : 0;
          const newNet = newType === 'cash_in' ? newAmount : -newAmount;

          await updateDoc(newPartyRef, {
            totalCashIn: increment(newIn),
            totalCashOut: increment(newOut),
            balance: increment(newNet)
          });
        }
      }

      // Notify team members about updated entry
      const membersToNotify = (currentBusiness.members || []).filter((m: BusinessMember) => m.userId !== user.id);

      // Get book name
      let bookName = context?.bookName || 'Unknown Book';

      // If not provided in context, try to find in state
      if (bookName === 'Unknown Book') {
        const knownBook = books.find((b: Book) => b.id === oldEntry.bookId);
        if (knownBook) {
          bookName = knownBook.name;
        } else {
          try {
            // Fallback fetch if book not in state
            const bookSnap = await getDoc(bookRef);
            if (bookSnap.exists()) {
              bookName = (bookSnap.data() as Book).name;
            }
          } catch (error) {
            console.error('Error fetching book name for notification:', error);
          }
        }
      }

      // Calculate new balance string if provided
      let newBalanceStr = '';
      if (context?.currentBalance !== undefined) {
        // Assuming context.currentBalance IS the predicted new balance passed from client
        const newTotal = Number(context.currentBalance);
        newBalanceStr = formatCurrency(newTotal, currentBusiness?.currency);
      }

      const description = updates.description || oldEntry.description || 'an entry';
      const balanceText = newBalanceStr ? `. Balance: ${newBalanceStr}` : '';

      if (bookName && bookName !== 'Unknown Book') {
        for (const member of membersToNotify) {
          try {
            const entryTypeName = (updates.type || oldEntry.type) === 'cash_in' ? 'Cash In' : 'Cash Out';
            await addDoc(collection(db, 'notifications'), {
              userId: member.userId,
              title: 'Entry Updated',
              message: `${user.displayName || user.name || user.email} updated a ${entryTypeName} (${description}) in "${bookName}"${balanceText}`,
              read: false,
              createdAt: new Date().toISOString(),
              type: 'entry_updated',
              metadata: {
                businessId: currentBusiness.id,
                businessName: currentBusiness.name,
                bookId: oldEntry.bookId,
                bookName: bookName,
                entryId: entryId,
                description: description,
                updatedBy: user.displayName || user.name || user.email,
                newBalance: newBalanceStr
              }
            });
          } catch (notifError) {
            console.error('Error sending notification to team member:', notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db, books]);

  const deleteEntry = useCallback(async (entryId: string, context?: { bookName?: string }) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can delete entries');
      return;
    }

    try {
      console.log('Attempting to delete entry:', entryId);
      // Get the entry first to know amount and type
      const entryRef = doc(db, 'businesses', currentBusiness.id, 'entries', entryId);
      const entrySnap = await getDoc(entryRef);

      if (entrySnap.exists()) {
        const entryData = entrySnap.data() as BookEntry;
        const amount = Number(entryData.amount) || 0;
        const bookRef = doc(db, 'businesses', currentBusiness.id, 'books', entryData.bookId);

        // Get book name reliably
        let bookName = context?.bookName;

        if (!bookName) {
          bookName = books.find((b: Book) => b.id === entryData.bookId)?.name;
          if (!bookName) {
            try {
              const bookDoc = await getDoc(bookRef);
              if (bookDoc.exists()) {
                bookName = (bookDoc.data() as Book).name;
              }
            } catch (e) {
              console.log('Error fetching book name for notification:', e);
            }
          }
        }
        bookName = bookName || 'Unknown Book';

        // Delete the entry
        await deleteDoc(entryRef);

        // Update book totals (reverse the operation)
        await updateDoc(bookRef, {
          totalCashIn: entryData.type === 'cash_in' ? increment(-amount) : increment(0),
          totalCashOut: entryData.type === 'cash_out' ? increment(-amount) : increment(0),
          netBalance: entryData.type === 'cash_in' ? increment(-amount) : increment(amount)
        });

        // Update party totals if partyId is present
        if (entryData.partyId) {
          const partyRef = doc(db, 'businesses', currentBusiness.id, 'parties', entryData.partyId);
          await updateDoc(partyRef, {
            totalCashIn: entryData.type === 'cash_in' ? increment(-amount) : increment(0),
            totalCashOut: entryData.type === 'cash_out' ? increment(-amount) : increment(0),
            balance: entryData.type === 'cash_in' ? increment(-amount) : increment(amount)
          });
        }

        const description = entryData.description ? `"${entryData.description}"` : 'an entry';

        // Notify team members about entry deletion
        if (bookName && bookName !== 'Unknown Book') {
          const membersToNotify = currentBusiness.members.filter((m: BusinessMember) => m.userId !== user.id);
          for (const member of membersToNotify) {
            try {
              const entryTypeName = entryData.type === 'cash_in' ? 'Cash In' : 'Cash Out';
              await addDoc(collection(db, 'notifications'), {
                id: uuidv4(),
                title: entryData.type === 'cash_in' ? 'Cash In Deleted' : 'Cash Out Deleted',
                message: `${user.name || user.email} deleted ${entryTypeName} (${description}) of ${formatCurrency(amount, currentBusiness.currency)} from "${bookName}"`,
                timestamp: new Date().toISOString(),
                type: 'warning',
                userId: member.userId,
                businessId: currentBusiness.id,
                metadata: {
                  businessId: currentBusiness.id,
                  businessName: currentBusiness.name,
                  bookId: entryData.bookId,
                  bookName: bookName,
                  entryId: entryId,
                  amount: amount,
                  description: entryData.description,
                  deletedBy: user.name || user.email
                }
              });
            } catch (notifError) {
              console.error('Error sending notification to team member:', notifError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db, books]);

  const transferEntry = useCallback(async (entry: BookEntry, targetBookId: string) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can transfer entries');
      return;
    }

    try {
      const batch = writeBatch(db);
      const amount = Number(entry.amount) || 0;

      // 1. Create new entry in target book
      const newEntryId = uuidv4();
      const newEntry: BookEntry = {
        ...entry,
        id: newEntryId,
        bookId: targetBookId,
        // Preserve original createdAt and userId
      };

      // Filter undefined values
      const entryData = Object.fromEntries(
        Object.entries(newEntry).filter(([_, value]) => value !== undefined)
      );

      const newEntryRef = doc(db, 'businesses', currentBusiness.id, 'entries', newEntryId);
      batch.set(newEntryRef, entryData);

      // 2. Delete old entry
      const oldEntryRef = doc(db, 'businesses', currentBusiness.id, 'entries', entry.id);
      batch.delete(oldEntryRef);

      // 3. Update source book totals (Reverse effect)
      const sourceBookRef = doc(db, 'businesses', currentBusiness.id, 'books', entry.bookId);
      batch.update(sourceBookRef, {
        totalCashIn: entry.type === 'cash_in' ? increment(-amount) : increment(0),
        totalCashOut: entry.type === 'cash_out' ? increment(-amount) : increment(0),
        netBalance: entry.type === 'cash_in' ? increment(-amount) : increment(amount)
      });

      // 4. Update target book totals (Apply effect)
      const targetBookRef = doc(db, 'businesses', currentBusiness.id, 'books', targetBookId);
      batch.update(targetBookRef, {
        totalCashIn: entry.type === 'cash_in' ? increment(amount) : increment(0),
        totalCashOut: entry.type === 'cash_out' ? increment(amount) : increment(0),
        netBalance: entry.type === 'cash_in' ? increment(amount) : increment(-amount)
      });

      await batch.commit();

    } catch (error) {
      console.error("Error transferring entry:", error);
      throw error;
    }
  }, [user, currentBusiness, hasPermission, db]);

  const getUserRole = useCallback((businessId?: string): UserRole | null => {
    const targetBusinessId = businessId || currentBusiness?.id;
    if (!targetBusinessId || !user) return null;

    const business = businesses.find((b: Business) => b.id === targetBusinessId);
    const member = business?.members?.find((m: BusinessMember) => m.userId === user.id);
    return member?.role || null;
  }, [businesses, currentBusiness, user]);

  const inviteTeamMember = async (email: string, role: UserRole) => {
    if (!currentBusiness || !user || !db) {
      return { success: false, message: 'No business selected or user not authenticated' };
    }

    if (!hasPermission('owner')) {
      return { success: false, message: 'You do not have permission to invite team members' };
    }

    const invitedUser = await findUserByEmail(email);
    if (!invitedUser) {
      return { success: false, message: 'User not found' };
    }

    const isAlreadyMember = (currentBusiness.members || []).some((m: BusinessMember) => m.userId === invitedUser.id);
    if (isAlreadyMember) {
      return { success: false, message: 'User is already a team member' };
    }

    const newMember: BusinessMember = {
      id: uuidv4(),
      userId: invitedUser.id!,
      businessId: currentBusiness.id,
      role,
      user: {
        ...invitedUser,
        id: invitedUser.id!,
        uid: invitedUser.id!,
        email: invitedUser.email,
        name: invitedUser.name || invitedUser.displayName || invitedUser.email.split('@')[0],
        displayName: invitedUser.displayName || invitedUser.name || invitedUser.email.split('@')[0],
        phoneNumber: invitedUser.phoneNumber || '',
        avatar: invitedUser.avatar || '',
      } as User,
      joinedAt: new Date().toISOString(),
    };

    try {
      const businessRef = doc(db, 'businesses', currentBusiness.id);

      // Clean the members array to remove any undefined values
      const cleanMember = JSON.parse(JSON.stringify(newMember)); // Remove undefined fields

      // Use a transaction to reliably add the member
      // arrayUnion is unreliable with complex nested objects
      await runTransaction(db, async (transaction) => {
        const businessDoc = await transaction.get(businessRef);

        if (!businessDoc.exists()) {
          throw new Error('Business not found');
        }

        const currentMembers = businessDoc.data().members || [];
        const currentMemberIds = businessDoc.data().memberIds || [];

        // Double-check if user is already a member (race condition protection)
        if (currentMemberIds.includes(invitedUser.id!)) {
          throw new Error('User is already a team member');
        }

        // Add the new member to the arrays
        transaction.update(businessRef, {
          members: [...currentMembers, cleanMember],
          memberIds: [...currentMemberIds, invitedUser.id!]
        });
      });

      // Log activity - create clean user object with no undefined values
      const cleanUser = {
        id: user.id || '',
        uid: user.uid || user.id || '',
        email: user.email || '',
        name: user.name || user.displayName || '',
        displayName: user.displayName || user.name || '',
        phoneNumber: user.phoneNumber || '',
        avatar: user.avatar || '',
        emailVerified: user.emailVerified || false,
        isAnonymous: user.isAnonymous || false,
        disabled: user.disabled || false,
        metadata: {},
        providerData: []
      };

      const newActivity: ActivityLog = {
        id: uuidv4(),
        entityType: 'business',
        entityId: currentBusiness.id,
        userId: user.id!,
        action: 'invite_member',
        timestamp: new Date().toISOString(),
        metadata: {
          memberId: newMember.id,
          role,
          email: invitedUser.email
        },
        user: cleanUser as User
      };

      // Remove any remaining undefined values
      const cleanActivity = JSON.parse(JSON.stringify(newActivity));
      await setDoc(doc(db, 'activityLogs', newActivity.id), cleanActivity);

      // Notify team members about the new invitation
      const teamToNotify = (currentBusiness.members || []).filter((m: BusinessMember) => m.userId !== user.id);
      for (const member of teamToNotify) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: member.userId,
            title: 'Team Member Invited',
            message: `${user.displayName || user.name || user.email} invited ${invitedUser.displayName || invitedUser.name || email} to join as ${role}`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'team_invite',
            metadata: {
              businessId: currentBusiness.id,
              businessName: currentBusiness.name,
              invitedUserEmail: email,
              invitedUserId: invitedUser.id,
              role: role
            }
          });
        } catch (notifError) {
          console.error('Error sending notification to team member:', notifError);
        }
      }

      // Notify the invited user specifically
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: invitedUser.id!,
          title: 'Invited to Team',
          message: `You have been invited by ${user.displayName || user.name || user.email} to join "${currentBusiness.name}" as ${role}`,
          read: false,
          createdAt: new Date().toISOString(),
          type: 'team_invite',
          metadata: {
            businessId: currentBusiness.id,
            businessName: currentBusiness.name,
            invitedBy: user.displayName || user.name || user.email,
            role: role
          }
        });
      } catch (notifError) {
        console.error('Error sending notification to invited user:', notifError);
      }

      return { success: true, message: 'Team member invited successfully' };
    } catch (error: any) {
      console.error("Error inviting member:", error);
      if (error.message === 'User is already a team member') {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Failed to invite member' };
    }
  };

  const updateTeamMemberRole = async (userId: string, role: UserRole) => {
    if (!currentBusiness || !user || !db) {
      return { success: false, message: 'No business selected or user not authenticated' };
    }

    if (!hasPermission('owner')) {
      return { success: false, message: 'You do not have permission to update roles' };
    }

    if (userId === user.id) {
      return { success: false, message: 'Cannot change your own role' };
    }

    try {
      await runTransaction(db!, async (transaction: Transaction) => {
        const businessRef = doc(db!, 'businesses', currentBusiness.id);
        const businessDoc = await transaction.get(businessRef);

        if (!businessDoc.exists()) {
          throw new Error("Business does not exist");
        }

        const businessData = businessDoc.data() as Business;
        const members = businessData.members || [];

        const memberIndex = members.findIndex((m: BusinessMember) => m.userId === userId);
        if (memberIndex === -1) {
          throw new Error("Member not found");
        }

        // Update the member's role
        const updatedMembers = [...members];
        updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], role };

        // Sanitize members array before update
        const sanitizedMembers = JSON.parse(JSON.stringify(updatedMembers));

        transaction.update(businessRef, {
          members: sanitizedMembers
        });

        // Log activity
        const updatedMember = updatedMembers[memberIndex];
        const newActivityId = uuidv4();
        const newActivity: ActivityLog = {
          id: newActivityId,
          entityType: 'business',
          entityId: currentBusiness.id,
          userId: user.id!,
          action: 'update_member_role',
          timestamp: new Date().toISOString(),
          metadata: {
            memberId: updatedMember.id,
            newRole: role,
            userId: updatedMember.userId
          },
          user: {
            id: user.id || '',
            uid: user.uid || user.id || '',
            email: user.email || '',
            name: user.name || user.displayName || '',
            displayName: user.displayName || user.name || '',
            phoneNumber: user.phoneNumber || '',
            avatar: user.avatar || '',
            emailVerified: user.emailVerified || false,
            isAnonymous: user.isAnonymous || false,
            disabled: user.disabled || false,
            metadata: {},
            providerData: []
          }
        };

        const activityRef = doc(db!, 'activityLogs', newActivityId);
        transaction.set(activityRef, newActivity);

        // Notify the updated user
        const userNotificationRef = doc(collection(db!, 'notifications'));
        transaction.set(userNotificationRef, {
          userId: userId,
          title: 'Role Updated',
          message: `Your role in "${currentBusiness.name}" has been updated to ${role} by ${user.displayName || user.name || user.email}`,
          read: false,
          createdAt: new Date().toISOString(),
          type: 'role_updated',
          metadata: {
            businessId: currentBusiness.id,
            businessName: currentBusiness.name,
            newRole: role,
            updatedBy: user.displayName || user.name || user.email
          }
        });

        // Notify the rest of the team
        const otherMembers = members.filter((m: BusinessMember) => m.userId !== userId && m.userId !== user.id);
        const memberName = updatedMember.user.name || updatedMember.user.displayName || 'a team member';

        for (const member of otherMembers) {
          const teamNotificationRef = doc(collection(db!, 'notifications'));
          transaction.set(teamNotificationRef, {
            userId: member.userId,
            title: 'Team Member Role Updated',
            message: `${user.displayName || user.name || user.email} updated ${memberName}'s role to ${role}`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'role_updated',
            metadata: {
              businessId: currentBusiness.id,
              businessName: currentBusiness.name,
              targetUserId: userId,
              targetUserName: memberName,
              newRole: role,
              updatedBy: user.displayName || user.name || user.email
            }
          });
        }
      });

      return { success: true, message: 'Team member role updated successfully' };
    } catch (error: any) {
      console.error("Error updating role:", error);
      return { success: false, message: error.message || 'Failed to update role' };
    }
  };

  const removeTeamMember = async (userId: string) => {
    if (!currentBusiness || !user || !db) {
      return { success: false, message: 'No business selected or user not authenticated' };
    }

    const currentUserId = (user.id || user.uid || '').trim();
    const targetUserId = (userId || '').trim();
    const isSelf = targetUserId === currentUserId;

    // Debug logging
    if (!isSelf && targetUserId === user.uid) {
      console.log('ID Mismatch debug:', { userId, currentUserId, userUid: user.uid, isSelf });
    }

    const userMember = currentBusiness.members?.find((m: BusinessMember) => m.userId === currentUserId);
    const targetMember = currentBusiness.members?.find((m: BusinessMember) => m.userId === targetUserId);

    // If trying to remove someone else, must be owner
    if (!isSelf && !hasPermission('owner')) {
      return { success: false, message: 'You do not have permission to remove team members' };
    }

    // Owners cannot leave their own team (they must delete or transfer ownership first)
    if (isSelf && userMember?.role === 'owner') {
      return { success: false, message: 'Owners cannot leave the team. Transfer ownership or delete the business instead.' };
    }

    // Cannot remove another owner
    if (!isSelf && targetMember?.role === 'owner') {
      return { success: false, message: 'Cannot remove another owner from the team' };
    }

    try {
      await runTransaction(db!, async (transaction: Transaction) => {
        const businessRef = doc(db!, 'businesses', currentBusiness.id);
        const businessDoc = await transaction.get(businessRef);

        if (!businessDoc.exists()) {
          throw new Error("Business does not exist");
        }

        const businessData = businessDoc.data() as Business;
        const members = businessData.members || [];

        const memberIndex = members.findIndex((m: BusinessMember) => m.userId === userId);
        if (memberIndex === -1) {
          throw new Error("Team member not found");
        }

        const memberToRemove = members[memberIndex];

        // Remove the member
        const updatedMembers = members.filter((m: BusinessMember) => m.userId !== userId);
        const updatedMemberIds = updatedMembers.map((m: BusinessMember) => m.userId);

        // Sanitize members array before update
        const sanitizedMembers = JSON.parse(JSON.stringify(updatedMembers));

        transaction.update(businessRef, {
          members: sanitizedMembers,
          memberIds: updatedMemberIds
        });

        // Log activity
        const newActivityId = uuidv4();
        const newActivity: ActivityLog = {
          id: newActivityId,
          entityType: 'business',
          entityId: currentBusiness.id,
          userId: user.id!,
          action: 'remove_member',
          timestamp: new Date().toISOString(),
          metadata: {
            memberId: memberToRemove.id,
            userId: memberToRemove.userId,
            role: memberToRemove.role
          },
          user: {
            id: user.id || '',
            uid: user.uid || user.id || '',
            email: user.email || '',
            name: user.name || user.displayName || '',
            displayName: user.displayName || user.name || '',
            phoneNumber: user.phoneNumber || '',
            avatar: user.avatar || '',
            emailVerified: user.emailVerified || false,
            isAnonymous: user.isAnonymous || false,
            disabled: user.disabled || false,
            metadata: {},
            providerData: []
          }
        };

        const activityRef = doc(db!, 'activityLogs', newActivityId);
        transaction.set(activityRef, newActivity);

        // Send notification to the removed user
        const removedUserNotificationRef = doc(collection(db!, 'notifications'));
        const actionText = isSelf ? 'left' : 'been removed from';
        const removedByText = isSelf ? '' : ` by ${user.displayName || user.name || user.email}`;

        transaction.set(removedUserNotificationRef, {
          userId: userId,
          title: isSelf ? 'Left Team' : 'Removed from Team',
          message: `You have ${actionText} ${currentBusiness.name}${removedByText}`,
          read: false,
          createdAt: new Date().toISOString(),
          type: 'team_removal',
          metadata: {
            businessId: currentBusiness.id,
            businessName: currentBusiness.name,
            isSelf
          }
        });

        // Notify the rest of the team
        const otherMembers = updatedMembers.filter((m: BusinessMember) => m.userId !== user.id);
        const memberName = memberToRemove.user.name || memberToRemove.user.displayName || 'a team member';

        for (const member of otherMembers) {
          const teamNotificationRef = doc(collection(db!, 'notifications'));
          transaction.set(teamNotificationRef, {
            userId: member.userId,
            title: 'Team Update',
            message: isSelf
              ? `${memberName} has left the team`
              : `${user.displayName || user.name || user.email} removed ${memberName} from the team`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'team_removal',
            metadata: {
              businessId: currentBusiness.id,
              businessName: currentBusiness.name,
              targetUserId: userId,
              targetUserName: memberName,
              removedBy: isSelf ? 'self' : (user.displayName || user.name || user.email)
            }
          });
        }
      });

      return { success: true, message: 'Team member removed successfully' };
    } catch (error: any) {
      console.error("Error removing member:", error);
      return { success: false, message: error.message || 'Failed to remove member' };
    }
  };

  // Get all team members for current business
  const getTeamMembers = useCallback((): BusinessMember[] => {
    if (!currentBusiness) return [];
    return currentBusiness.members || [];
  }, [currentBusiness]);

  // Search user by email (public function for UI)
  const searchUserByEmail = useCallback(async (email: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        return { success: true, user: foundUser };
      } else {
        return { success: false, message: 'User not found. They must sign up first.' };
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      return { success: false, message: 'Failed to search for user' };
    }
  }, [findUserByEmail]);

  // Get current user's role for permission checks
  const currentUserRole = useMemo(() => {
    return getUserRole();
  }, [getUserRole]);

  // Simple local smart categorization
  const autoCategorize = useCallback((description: string): string | undefined => {
    if (!description) return undefined;

    const lowerDesc = description.toLowerCase();

    const keywords: Record<string, string> = {
      'uber': 'Transport',
      'lyft': 'Transport',
      'taxi': 'Transport',
      'bus': 'Transport',
      'train': 'Transport',
      'fuel': 'Transport',
      'gas': 'Transport',
      'parking': 'Transport',

      'coffee': 'Food & Drink',
      'cafe': 'Food & Drink',
      'restaurant': 'Food & Drink',
      'lunch': 'Food & Drink',
      'dinner': 'Food & Drink',
      'breakfast': 'Food & Drink',
      'burger': 'Food & Drink',
      'pizza': 'Food & Drink',
      'groceries': 'Food & Drink',
      'market': 'Food & Drink',

      'internet': 'Utilities',
      'wifi': 'Utilities',
      'phone': 'Utilities',
      'mobile': 'Utilities',
      'electric': 'Utilities',
      'water': 'Utilities',
      'bill': 'Utilities',

      'salary': 'Payroll',
      'wages': 'Payroll',
      'contractor': 'Payroll',

      'rent': 'Rent',
      'office': 'Rent',

      'software': 'Software',
      'subscription': 'Software',
      'app': 'Software',
      'hosting': 'Software',
      'domain': 'Software',

      'client': 'Sales',
      'project': 'Sales',
      'sale': 'Sales',
      'invoice': 'Sales',
    };

    for (const [keyword, category] of Object.entries(keywords)) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }

    return undefined;
  }, []);

  const [parties, setParties] = useState<Party[]>([]);

  // Listen for Parties when a business is selected
  useEffect(() => {
    if (!currentBusiness || !db) {
      setParties([]);
      return;
    }

    const partiesQuery = query(collection(db, 'businesses', currentBusiness.id, 'parties'));
    const unsubscribeParties = onSnapshot(partiesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const partiesList: Party[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        partiesList.push({ id: doc.id, ...doc.data() } as Party);
      });
      setParties(partiesList);
    });

    return () => unsubscribeParties();
  }, [currentBusiness?.id]);

  // Listen for Books
  useEffect(() => {
    if (!currentBusiness || !db) {
      setBooks([]);
      return;
    }

    const booksQuery = query(collection(db, 'businesses', currentBusiness.id, 'books'));
    const unsubscribe = onSnapshot(booksQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const booksList: Book[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        booksList.push({ id: doc.id, ...doc.data() } as Book);
      });
      setBooks(booksList);
    }, (error: FirestoreError) => {
      console.error("Error fetching books:", error);
    });

    return () => unsubscribe();
  }, [currentBusiness?.id]);

  const createParty = useCallback(async (name: string, type: 'customer' | 'vendor', email?: string, phone?: string) => {
    if (!user || !currentBusiness || !db) return;

    if (!hasPermission('partner')) {
      console.warn('Only owners and partners can create parties');
      return;
    }

    const newPartyId = uuidv4();
    const newParty: Party = {
      id: newPartyId,
      businessId: currentBusiness.id,
      name,
      type,
      email,
      phone,
      createdAt: new Date().toISOString(),
      totalCashIn: 0,
      totalCashOut: 0,
      balance: 0,
    };

    try {
      // Filter out undefined values to prevent Firestore errors
      const partyData = Object.fromEntries(
        Object.entries(newParty).filter(([_, value]) => value !== undefined)
      );

      await setDoc(doc(db, 'businesses', currentBusiness.id, 'parties', newPartyId), partyData);

      // Notify team members about new party
      const membersToNotify = (currentBusiness.members || []).filter((m: BusinessMember) => m.userId !== user.id);

      for (const member of membersToNotify) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: member.userId,
            title: `New ${type === 'customer' ? 'Customer' : 'Vendor'} Added`,
            message: `${user.displayName || user.name || user.email} added "${name}" as a ${type} in ${currentBusiness.name}`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'party_created',
            metadata: {
              businessId: currentBusiness.id,
              businessName: currentBusiness.name,
              partyId: newPartyId,
              partyName: name,
              addedBy: user.displayName || user.name || user.email
            }
          });
        } catch (notifError) {
          console.error('Error sending notification to team member:', notifError);
        }
      }

    } catch (error) {
      console.error("Error creating party:", error);
      throw error;
    }
  }, [user, currentBusiness, db]);

  const updateParty = useCallback(async (partyId: string, updates: Partial<Party>) => {
    if (!user || !currentBusiness || !db) return;

    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'parties', partyId), updates);
    } catch (error) {
      console.error("Error updating party:", error);
      throw error;
    }
  }, [user, currentBusiness, db]);

  const deleteParty = useCallback(async (partyId: string) => {
    if (!user || !currentBusiness || !db) return;

    try {
      await deleteDoc(doc(db, 'businesses', currentBusiness.id, 'parties', partyId));
    } catch (error) {
      console.error("Error deleting party:", error);
      throw error;
    }
  }, [user, currentBusiness, db]);

  const copyBook = useCallback(async (bookId: string, targetBusinessId: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !currentBusiness || !db) {
      return { success: false, message: 'Not authenticated or no business selected' };
    }

    // Check if user has permission in current business
    if (!hasPermission('partner')) {
      return { success: false, message: 'Only owners and partners can copy books' };
    }

    // Check if user has permission in target business
    const targetBusiness = businesses.find((b: Business) => b.id === targetBusinessId);
    if (!targetBusiness) {
      return { success: false, message: 'Target business not found' };
    }

    const targetMember = targetBusiness.members?.find((m: BusinessMember) => m.userId === user.id);
    if (!targetMember || (targetMember.role !== 'owner' && targetMember.role !== 'partner')) {
      return { success: false, message: 'You must be an owner or partner in the target business' };
    }

    // Don't allow copying to the same business
    if (currentBusiness.id === targetBusinessId) {
      return { success: false, message: 'Cannot copy book to the same business' };
    }

    try {
      // Get the source book
      const bookRef = doc(db, 'businesses', currentBusiness.id, 'books', bookId);
      const bookSnap = await getDoc(bookRef);

      if (!bookSnap.exists()) {
        return { success: false, message: 'Source book not found' };
      }

      const sourceBook = bookSnap.data() as Book;

      // Create new book in target business
      const newBookId = uuidv4();
      const newBook: Book = {
        id: newBookId,
        businessId: targetBusinessId,
        name: sourceBook.name,
        createdAt: new Date().toISOString(),
        createdBy: user.id!,
        totalCashIn: 0,
        totalCashOut: 0,
        netBalance: 0,
        settings: sourceBook.settings || {
          showPaymentMode: true,
          showCategory: true,
          showAttachments: true,
        },
      };

      // Filter undefined values
      const filterUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(filterUndefined);

        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            filtered[key] = filterUndefined(value);
          }
        }
        return filtered;
      };

      const bookData = filterUndefined(newBook);

      await setDoc(doc(db, 'businesses', targetBusinessId, 'books', newBookId), bookData);

      return { success: true, message: `Book "${sourceBook.name}" copied successfully` };
    } catch (error) {
      console.error("Error copying book:", error);
      return { success: false, message: 'Failed to copy book' };
    }
  }, [user, currentBusiness, businesses, hasPermission, db]);

  const moveBook = useCallback(async (bookId: string, targetBusinessId: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !currentBusiness || !db) {
      return { success: false, message: 'Not authenticated or no business selected' };
    }

    // Check permissions
    if (!hasPermission('owner')) {
      return { success: false, message: 'Only owners can move books' };
    }

    // Check target business permissions
    const targetBusiness = businesses.find((b: Business) => b.id === targetBusinessId);
    if (!targetBusiness) {
      return { success: false, message: 'Target business not found' };
    }

    const targetMember = targetBusiness.members?.find((m: BusinessMember) => m.userId === user.id);
    if (!targetMember || (targetMember.role !== 'owner' && targetMember.role !== 'partner')) {
      return { success: false, message: 'You must be an owner or partner in the target business' };
    }

    if (currentBusiness.id === targetBusinessId) {
      return { success: false, message: 'Cannot move book to the same business' };
    }

    try {
      // 1. Copy the book first (reuse logic or duplicate for safety)
      // We'll duplicate logic to ensure we can do it in a transaction or batch if possible, 
      // but cross-business moves might be complex for atomic batches if they are in different collections root?
      // Actually they are all under 'businesses' collection.

      const batch = writeBatch(db);

      // Get source book
      const sourceBookRef = doc(db, 'businesses', currentBusiness.id, 'books', bookId);
      const sourceBookSnap = await getDoc(sourceBookRef);

      if (!sourceBookSnap.exists()) {
        return { success: false, message: 'Source book not found' };
      }

      const sourceBook = sourceBookSnap.data() as Book;

      // Create new book in target business
      const newBookId = uuidv4();
      const newBook: Book = {
        ...sourceBook,
        id: newBookId,
        businessId: targetBusinessId,
        // Keep original createdBy/At or update? Let's keep original metadata if possible, but maybe update createdBy to mover?
        // Let's keep it simple: copy as is, but update businessId.
      };

      // Filter undefined
      const filterUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(filterUndefined);
        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) filtered[key] = filterUndefined(value);
        }
        return filtered;
      };

      const bookData = filterUndefined(newBook);
      const targetBookRef = doc(db, 'businesses', targetBusinessId, 'books', newBookId);
      batch.set(targetBookRef, bookData);

      // Copy entries? 
      // Ideally we should move entries too. The user said "move to another business for books too".
      // Usually moving a book implies moving its contents.
      // Let's fetch all entries and move them.

      const entriesQuery = query(collection(db!, 'businesses', currentBusiness.id, 'entries'), where('bookId', '==', bookId));
      const entriesSnap = await getDocs(entriesQuery);

      entriesSnap.docs.forEach((entryDoc: QueryDocumentSnapshot<DocumentData>) => {
        const entry = entryDoc.data();
        const newEntryId = uuidv4();
        const newEntry = {
          ...entry,
          id: newEntryId,
          businessId: targetBusinessId,
          bookId: newBookId,
        };

        const newEntryRef = doc(db!, 'businesses', targetBusinessId, 'entries', newEntryId);
        batch.set(newEntryRef, filterUndefined(newEntry));

        // Delete old entry
        batch.delete(entryDoc.ref);
      });

      // Delete source book
      batch.delete(sourceBookRef);

      await batch.commit();

      return { success: true, message: `Book "${sourceBook.name}" moved successfully` };

    } catch (error) {
      console.error("Error moving book:", error);
      return { success: false, message: 'Failed to move book' };
    }
  }, [user, currentBusiness, businesses, hasPermission, db]);

  return {
    // State
    businesses,
    currentBusiness,
    books,
    activityLogs,

    isLoading,
    currentUserRole,
    parties,

    // Business management
    switchBusiness,
    createBusiness,
    updateBusiness,
    updateBusinessFont,
    updateBusinessLogo,
    deleteBusiness,
    leaveBusiness,

    // Book management
    createBook,
    updateBook,
    deleteBook,
    copyBook,
    moveBook,

    // Entry management
    addEntry,
    updateEntry,
    deleteEntry,
    transferEntry,

    // Team management
    inviteTeamMember,
    searchUserByEmail,
    updateTeamMemberRole,
    removeTeamMember,
    getTeamMembers,

    // Party management
    createParty,
    updateParty,
    deleteParty,

    // Permissions
    getUserRole,
    hasPermission,
    autoCategorize,
    touchBook,
  };
});
