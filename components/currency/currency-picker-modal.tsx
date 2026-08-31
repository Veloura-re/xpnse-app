import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { X, Search, Check, Globe } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { CURRENCIES, Currency } from '@/constants/currencies';
import { CurrencyService } from '@/services/currency-service';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurrency: string;
  onSelect: (currencyCode: string) => void;
  title?: string;
  subtitle?: string;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export function CurrencyPickerModal({
  visible,
  onClose,
  selectedCurrency,
  onSelect,
  title = 'Select Currency',
  subtitle = 'Choose from 150+ global currencies',
}: CurrencyPickerModalProps) {
  const { colors, isDark, deviceFont } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Reset search when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const popularCurrencies = useMemo(() => CurrencyService.getPopular(), []);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return CURRENCIES;
    }
    const q = searchQuery.trim().toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    onSelect(code);
    onClose();
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = (selectedCurrency || '').toUpperCase() === item.code.toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.currencyItem,
          {
            backgroundColor: isSelected
              ? isDark
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(16, 185, 129, 0.1)'
              : isDark
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.02)',
            borderColor: isSelected
              ? colors.primary
              : isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
        onPress={() => handleSelect(item.code)}
        activeOpacity={0.7}
      >
        <View style={styles.currencyLeft}>
          <View
            style={[
              styles.symbolBadge,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <Text
              style={[
                styles.symbolText,
                {
                  color: isSelected ? '#FFFFFF' : colors.text,
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
              numberOfLines={1}
            >
              {item.symbol}
            </Text>
          </View>
          <View style={styles.currencyInfo}>
            <Text
              style={[
                styles.currencyCode,
                {
                  color: colors.text,
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              {item.code}
            </Text>
            <Text
              style={[
                styles.currencyName,
                {
                  color: colors.textSecondary,
                  fontFamily: 'SpaceGrotesk_400Regular',
                },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
            <Check size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassBackdrop isDark={isDark} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            {/* Top Sheen */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 24,
                right: 24,
                height: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                zIndex: 10,
              }}
            />
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerIconBox,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
                  ]}
                >
                  <Globe size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.headerTitle,
                      {
                        color: colors.text,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  >
                    {title}
                  </Text>
                  <Text
                    style={[
                      styles.headerSubtitle,
                      {
                        color: colors.textSecondary,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      },
                    ]}
                  >
                    {subtitle}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: isSearchFocused
                    ? isDark ? 'rgba(16, 185, 129, 0.06)' : '#F0FDF4'
                    : colors.inputBackground,
                  borderColor: isSearchFocused ? colors.primary : colors.border,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Search size={18} color={isSearchFocused ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search USD, EUR, Dollar, Rupee..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    fontFamily: 'SpaceGrotesk_400Regular',
                  },
                ]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Popular Currencies Quick Bar */}
            {!searchQuery && (
              <View style={styles.popularSection}>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                >
                  POPULAR
                </Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={popularCurrencies}
                  keyExtractor={(item) => `pop-${item.code}`}
                  contentContainerStyle={styles.popularList}
                  renderItem={({ item }) => {
                    const isSelected = (selectedCurrency || '').toUpperCase() === item.code.toUpperCase();
                    return (
                      <TouchableOpacity
                        style={[
                          styles.popularPill,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.08)',
                          },
                        ]}
                        onPress={() => handleSelect(item.code)}
                      >
                        <Text
                          style={[
                            styles.popularPillText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.text,
                              fontFamily: 'SpaceGrotesk_700Bold',
                            },
                          ]}
                        >
                          {item.code} ({item.symbol})
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            {/* Currencies List */}
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={renderCurrencyItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="always"
              initialNumToRender={25}
              maxToRenderPerBatch={30}
              windowSize={10}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: colors.textSecondary,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      },
                    ]}
                  >
                    No currency found matching "{searchQuery}"
                  </Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  modalContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.78,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  popularSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  popularList: {
    gap: 8,
  },
  popularPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  popularPillText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  symbolBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 15,
  },
  currencyName: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
