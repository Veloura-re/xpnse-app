import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BookEntry } from '@/types';

interface PaginationOptions {
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
}

export function usePaginatedEntries(businessId: string | null, bookId?: string, options: PaginationOptions = {}) {
    const { pageSize = 20, startDate, endDate } = options;
    const [entries, setEntries] = useState<BookEntry[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadEntries = useCallback(async (isRefresh = false) => {
        if (!businessId || (!isRefresh && !hasMore) || loading || !db) return;

        setLoading(true);
        setError(null);

        try {
            let q;
            const constraints: any[] = [orderBy('createdAt', 'desc')];

            if (bookId) {
                constraints.push(where('bookId', '==', bookId));
            }

            if (startDate) {
                constraints.push(where('createdAt', '>=', startDate.toISOString()));
            }

            if (endDate) {
                constraints.push(where('createdAt', '<=', endDate.toISOString()));
            }

            // Apply limit at the end of constraints, before startAfter
            constraints.push(limit(pageSize));

            // Construct the base query
            q = query(collection(db, 'businesses', businessId, 'entries'), ...constraints);

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
        } catch (err) {
            console.error('Error loading entries:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [businessId, bookId, pageSize, startDate?.toISOString(), endDate?.toISOString(), lastDoc, hasMore, loading]);

    const refresh = useCallback(() => {
        setLastDoc(null);
        setHasMore(true);
        loadEntries(true);
    }, [loadEntries]);

    // Initial load - re-run when filters change
    useEffect(() => {
        refresh();
    }, [businessId, bookId, startDate?.toISOString(), endDate?.toISOString()]);

    return {
        entries,
        loading,
        hasMore,
        error,
        loadMore: () => loadEntries(false),
        refresh
    };
}
