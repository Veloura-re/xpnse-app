import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BookEntry } from '@/types';

export function usePaginatedEntries(businessId: string | null, bookId?: string, pageSize = 20) {
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

            if (bookId) {
                q = query(
                    collection(db, 'businesses', businessId, 'entries'),
                    where('bookId', '==', bookId),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
            } else {
                q = query(
                    collection(db, 'businesses', businessId, 'entries'),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
            }

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
    }, [businessId, bookId, pageSize, lastDoc, hasMore, loading]);

    const refresh = useCallback(() => {
        setLastDoc(null);
        setHasMore(true);
        loadEntries(true);
    }, [loadEntries]);

    // Initial load
    useEffect(() => {
        refresh();
    }, [businessId, bookId]);

    return {
        entries,
        loading,
        hasMore,
        error,
        loadMore: () => loadEntries(false),
        refresh
    };
}
