import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { X, Plus, TrendingUp, TrendingDown, Edit3, Trash2, FileDown, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryEditModal } from './entry-edit-modal';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/exportUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BookModal({ visible, book, entries, onClose, onAddEntry, onEditEntry, onDeleteEntry, userRole, currency }) {
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [entryEditVisible, setEntryEditVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [selectedEntryMenu, setSelectedEntryMenu] = useState(null);

  useEffect(() => {
    if (visible) {
      StatusBar.setBackgroundColor('rgba(0,0,0,0.5)', true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        StatusBar.setBackgroundColor('transparent', true);
      });
    }
  }, [visible, fadeAnim, slideAnim]);

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    } catch (e) {
      // Fallback for invalid currency codes
      return `${currency || '$'} ${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleAddEntry = () => {
    setSelectedEntry(null);
    setEntryEditVisible(true);
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setEntryEditVisible(true);
  };

  const handleSaveEntry = (entryData) => {
    if (selectedEntry?.id) {
      onEditEntry(selectedEntry.id, entryData);
    } else {
      onAddEntry(entryData);
    }
    setEntryEditVisible(false);
    setSelectedEntry(null);
  };

  const handleExport = async (format) => {
    setExportMenuVisible(false);
    try {
      switch (format) {
        case 'excel':
          await exportToExcel(book, entries);
          break;
        case 'pdf':
          await exportToPDF(book, entries);
          break;
        case 'csv':
          await exportToCSV(book, entries);
          break;
      }
    } catch (error) {
      console.error(`Export ${format} failed:`, error);
    }
  };

  const handleClose = () => {
    setExportMenuVisible(false);
    setSelectedEntryMenu(null);
    onClose();
  };

  const renderEntry = (entry, index) => (
    <Animated.View
      key={entry.id}
      style={[
        styles.entryCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.entryContent}
        onPress={() => handleEditEntry(entry)}
        activeOpacity={0.7}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryTypeContainer}>
            {entry.type === 'cash_in' ? (
              <View style={styles.cashInBadge}>
                <TrendingUp size={14} color="#10b981" strokeWidth={2.5} />
                <Text style={styles.cashInText}>Cash In</Text>
              </View>
            ) : (
              <View style={styles.cashOutBadge}>
                <TrendingDown size={14} color="#ef4444" strokeWidth={2.5} />
                <Text style={styles.cashOutText}>Cash Out</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.entryAmount,
              entry.type === 'cash_in' ? styles.cashInAmount : styles.cashOutAmount,
            ]}
          >
            {formatCurrency(entry.amount)}
          </Text>
        </View>

        <Text style={styles.entryDescription} numberOfLines={2}>
          {entry.description}
        </Text>

        <View style={styles.entryMeta}>
          <View style={styles.entryDate}>
            <Text style={styles.entryDateText}>{formatDate(entry.date)}</Text>
          </View>

          {entry.category && (
            <View style={styles.entryTag}>
              <Text style={styles.entryTagText}>{entry.category}</Text>
            </View>
          )}

          {entry.paymentMode && (
            <View style={styles.entryTag}>
              <Text style={styles.entryTagText}>{entry.paymentMode}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {(userRole === 'owner' || userRole === 'partner') && (
        <TouchableOpacity
          style={styles.entryMenuButton}
          onPress={() => setSelectedEntryMenu(selectedEntryMenu === entry.id ? null : entry.id)}
          activeOpacity={0.7}
        >
          <MoreVertical size={16} color="#6b7280" />
        </TouchableOpacity>
      )}

      {selectedEntryMenu === entry.id && (
        <TouchableWithoutFeedback onPress={() => setSelectedEntryMenu(null)}>
          <View style={styles.entryMenuOverlay}>
            <View style={styles.entryMenu}>
              <TouchableOpacity
                style={styles.entryMenuItem}
                onPress={() => {
                  handleEditEntry(entry);
                  setSelectedEntryMenu(null);
                }}
              >
                <Edit3 size={16} color="#6b7280" />
                <Text style={styles.entryMenuText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.entryMenuItem, styles.entryMenuItemLast]}
                onPress={() => {
                  onDeleteEntry(entry.id);
                  setSelectedEntryMenu(null);
                }}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={[styles.entryMenuText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </Animated.View>
  );

  if (!book) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              paddingTop: insets.top + 10,
              paddingBottom: Math.max(insets.bottom, 10),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleSection}>
                <Text style={styles.title} numberOfLines={1}>
                  {book.name}
                </Text>
                <Text style={styles.subtitle}>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => setExportMenuVisible(!exportMenuVisible)}
                  activeOpacity={0.7}
                >
                  <FileDown size={20} color="#10b981" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Export Menu */}
            {exportMenuVisible && (
              <View style={styles.exportMenu}>
                <TouchableOpacity
                  style={styles.exportMenuItem}
                  onPress={() => handleExport('excel')}
                >
                  <FileDown size={16} color="#10b981" />
                  <Text style={styles.exportMenuText}>Export Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportMenuItem}
                  onPress={() => handleExport('pdf')}
                >
                  <FileDown size={16} color="#ef4444" />
                  <Text style={styles.exportMenuText}>Export PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportMenuItem, styles.exportMenuItemLast]}
                  onPress={() => handleExport('csv')}
                >
                  <FileDown size={16} color="#10b981" />
                  <Text style={styles.exportMenuText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.statIconGreen]}>
                <TrendingUp size={16} color="#10b981" strokeWidth={2.5} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Cash In</Text>
                <Text style={styles.statValue}>{formatCurrency(book.totalCashIn)}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.statIconRed]}>
                <TrendingDown size={16} color="#ef4444" strokeWidth={2.5} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Cash Out</Text>
                <Text style={styles.statValue}>{formatCurrency(book.totalCashOut)}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, book.netBalance >= 0 ? styles.statIconGreen : styles.statIconRed]}>
                <Text style={[styles.netIcon, { color: book.netBalance >= 0 ? '#10b981' : '#ef4444' }]}>$</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Net Balance</Text>
                <Text style={[
                  styles.statValue,
                  book.netBalance >= 0 ? styles.positiveText : styles.negativeText
                ]}>
                  {formatCurrency(book.netBalance)}
                </Text>
              </View>
            </View>
          </View>

          {/* Entries List */}
          <View style={styles.contentContainer}>
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <TrendingUp size={48} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>No Entries Yet</Text>
                <Text style={styles.emptyDescription}>
                  Add your first cash in or cash out entry to start tracking
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.entriesList}
                contentContainerStyle={styles.entriesListContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {entries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(renderEntry)}
              </ScrollView>
            )}
          </View>

          {/* FAB */}
          {(userRole === 'owner' || userRole === 'partner') && (
            <TouchableOpacity
              style={styles.fab}
              onPress={handleAddEntry}
              activeOpacity={0.8}
            >
              <Plus size={24} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Entry Edit Modal */}
        <EntryEditModal
          visible={entryEditVisible}
          entry={selectedEntry}
          book={book}
          onClose={() => {
            setEntryEditVisible(false);
            setSelectedEntry(null);
          }}
          onSave={handleSaveEntry}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    marginTop: 60,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportMenu: {
    position: 'absolute',
    top: 70,
    right: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1000,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exportMenuItemLast: {
    borderBottomWidth: 0,
  },
  exportMenuText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconGreen: {
    backgroundColor: '#ecfdf5',
  },
  statIconRed: {
    backgroundColor: '#fef2f2',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  netIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  positiveText: {
    color: '#10b981',
  },
  negativeText: {
    color: '#ef4444',
  },
  contentContainer: {
    flex: 1,
    marginTop: 16,
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entriesListContent: {
    paddingBottom: 100,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  entryContent: {
    flex: 1,
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashOutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashInText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  cashOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cashInAmount: {
    color: '#10b981',
  },
  cashOutAmount: {
    color: '#ef4444',
  },
  entryDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  entryDate: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entryDateText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  entryTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entryTagText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  entryMenuButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
  },
  entryMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  entryMenu: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  entryMenuItemLast: {
    borderBottomWidth: 0,
  },
  entryMenuText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});