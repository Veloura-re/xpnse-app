import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ArrowDownLeft, Check, X, Clock } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import {
  subscribeToIncomingPendingTransfers,
  respondToPendingTransfer,
} from '@/services/savings-service';
import { PendingTransfer } from '@/types';
import { formatCurrency } from '@/utils/currency-utils';
import { formatDistanceToNow } from 'date-fns';

interface PendingTransferPromptProps {
  businessId: string;
  recipientId: string;
  currency?: string;
}

export const PendingTransferPrompt: React.FC<PendingTransferPromptProps> = ({
  businessId,
  recipientId,
  currency = 'USD',
}) => {
  const { colors, isDark } = useTheme();
  const [queue, setQueue] = useState<PendingTransfer[]>([]);
  const [responding, setResponding] = useState(false);

  // Always subscribed — surfaces any incoming pending transfer in real time
  useEffect(() => {
    if (!businessId || !recipientId) return;
    const unsub = subscribeToIncomingPendingTransfers(businessId, recipientId, setQueue);
    return unsub;
  }, [businessId, recipientId]);

  const current = queue[0] ?? null;

  const handleRespond = async (decision: 'confirmed' | 'declined') => {
    if (!current || responding) return;
    setResponding(true);
    try {
      await respondToPendingTransfer({
        businessId,
        pendingTransferId: current.id,
        recipientId,
        decision,
      });
    } catch (err) {
      console.warn('[PendingTransferPrompt] Respond error:', err);
    } finally {
      setResponding(false);
    }
  };

  if (!current) return null;

  const expiresIn = formatDistanceToNow(new Date(current.expiresAt), { addSuffix: true });
  const txCurrency = current.currency || currency;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => handleRespond('declined')}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#111113' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {/* Header pill */}
          <View style={styles.pill} />

          {/* Icon */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' },
            ]}
          >
            <ArrowDownLeft size={26} color="#10b981" strokeWidth={2} />
          </View>

          <Text style={[styles.heading, { color: colors.text }]}>Incoming Transfer</Text>
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>
            from {current.senderName}
          </Text>

          {/* Amount */}
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatCurrency(current.amount, txCurrency)}
          </Text>

          {/* Note */}
          {current.note ? (
            <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
              {current.note}
            </Text>
          ) : null}

          {/* Expiry */}
          <View style={styles.expiryRow}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
              Expires {expiresIn}
            </Text>
          </View>

          {/* Pending count badge */}
          {queue.length > 1 && (
            <Text style={[styles.queueBadge, { color: colors.textSecondary }]}>
              +{queue.length - 1} more pending
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={responding}
              onPress={() => handleRespond('declined')}
              style={[
                styles.actionBtn,
                styles.declineBtn,
                {
                  backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                  borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
                },
              ]}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <X size={18} color="#ef4444" />
                  <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={responding}
              onPress={() => handleRespond('confirmed')}
              style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: '#10b981' }]}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={[styles.actionLabel, { color: '#ffffff' }]}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 42 : 28,
    paddingTop: 12,
    alignItems: 'center',
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 20,
  },
  amount: {
    fontSize: 42,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  expiryText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  queueBadge: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  declineBtn: {
    borderWidth: 1.5,
  },
  confirmBtn: {
    borderWidth: 0,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
