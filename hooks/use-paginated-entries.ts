import { useState, useCallback, useEffect, useRef } from 'react';
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs, 
    QueryDocumentSnapshot, 
    where, 
    getAggregateFromServer, 
    sum, 
    count,
    collectionGroup 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BookEntry } from '@/types';

interface PaginationOptions {
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    type?: 'cash_in' | 'cash_out' | 'all';
}

export function usePaginatedEntries(businessId: string | null, bookId?: string, options: PaginationOptions = {}) {
    const { pageSize = 20, startDate, endDate, type = 'all' } = options;
    const [entries, setEntries] = useState<BookEntry[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadingRef = useRef(false);

    const loadEntries = useCallback(async (isRefresh = false) => {
        if ((!businessId && !db) || (!isRefresh && !hasMore) || loadingRef.current || !db) return;

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            let q;
            const constraints: any[] = [orderBy('createdAt', 'desc')];

            if (bookId) {
                constraints.push(where('bookId', '==', bookId));
            }

            if (type !== 'all') {
                constraints.push(where('type', '==', type));
            }

            if (startDate) {
                constraints.push(where('createdAt', '>=', startDate.toISOString()));
            }

            if (endDate) {
                constraints.push(where('createdAt', '<=', endDate.toISOString()));
            }

            // Apply limit
            constraints.push(limit(pageSize));

            // Construct the base query - use collectionGroup if businessId is null for global analytics
            const baseRef = businessId 
                ? collection(db, 'businesses', businessId, 'entries') 
                : collectionGroup(db, 'entries');
            
            // If using collectionGroup for a specific business, we need to filter by businessId
            // but note that this requires a composite index including businessId
            if (!businessId) {
                // For global analytics, we might want to ensure we only see user-accessible data
                // but for now we follow the existing pattern
            }

            q = query(baseRef, ...constraints);

            // Apply pagination if not refreshing
            if (!isRefresh && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const newEntries: BookEntry[] = [];

            snapshot.forEach((doc) => {
                newEntries.push({ id: doc.id, ...doc.data() } as BookEntry);
            });

            if (isRefresh) {
                setEntries(newEntries);
            } else {
                setEntries(prev => [...prev, ...newEntries]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err: any) {
            console.error('Error loading entries:', err);
            setError(err as Error);
            // If it's an index error, we'll expose the link if possible
            if (err?.message?.includes('index')) {
                console.warn('Index required for this query. Follow the link in the console.');
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [businessId, bookId, type, pageSize, startDate?.toISOString(), endDate?.toISOString()]);

    const refresh = useCallback(() => {
        setLastDoc(null);
        setHasMore(true);
        // We use a small timeout to ensure state updates (lastDoc=null) have been processed
        // or we could use the newEntries logic inside loadEntries
        loadEntries(true);
    }, [loadEntries, businessId, bookId, type, pageSize, startDate?.toISOString(), endDate?.toISOString()]);

    // Initial load - re-run when filters change
    useEffect(() => {
        refresh();
    }, [businessId, bookId, type, startDate?.toISOString(), endDate?.toISOString()]);

    const getTotals = useCallback(async () => {
        if (!db) return { totalCashIn: 0, totalCashOut: 0, netBalance: 0, count: 0 };

        const baseConstraints: any[] = [];
        if (bookId) baseConstraints.push(where('bookId', '==', bookId));
        if (startDate) baseConstraints.push(where('createdAt', '>=', startDate.toISOString()));
        if (endDate) baseConstraints.push(where('createdAt', '<=', endDate.toISOString()));

        const baseRef = businessId 
            ? collection(db, 'businesses', businessId, 'entries') 
            : collectionGroup(db, 'entries');

        const inQuery = query(
            baseRef,
            ...baseConstraints,
            where('type', '==', 'cash_in')
        );

        const outQuery = query(
            baseRef,
            ...baseConstraints,
            where('type', '==', 'cash_out')
        );

        try {
            const [inSnapshot, outSnapshot] = await Promise.all([
                getAggregateFromServer(inQuery, {
                    totalAmount: sum('amount'),
                    count: count()
                }),
                getAggregateFromServer(outQuery, {
                    totalAmount: sum('amount'),
                    count: count()
                })
            ]);

            const totalCashIn = inSnapshot.data().totalAmount || 0;
            const totalCashOut = outSnapshot.data().totalAmount || 0;

            return {
                totalCashIn,
                totalCashOut,
                netBalance: totalCashIn - totalCashOut,
                count: (inSnapshot.data().count || 0) + (outSnapshot.data().count || 0)
            };
        } catch (err) {
            console.error('Error fetching aggregate totals:', err);
            // Return zeros so UI doesn't crash, but log the error
            return { totalCashIn: 0, totalCashOut: 0, netBalance: 0, count: 0, error: err };
        }
    }, [businessId, bookId, startDate?.toISOString(), endDate?.toISOString()]);

    return {
        entries,
        loading,
        hasMore,
        error,
        loadMore: () => loadEntries(false),
        refresh,
        getTotals
    };
}
