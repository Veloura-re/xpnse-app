import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ArrowRightLeft, RefreshCw, Edit3, Check, Globe } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { CurrencyService } from '@/services/currency-service';
import { CurrencyPickerModal } from './currency-picker-modal';
import * as Haptics from 'expo-haptics';

interface CurrencyConverterCardProps {
  initialBaseCurrency?: string;
  initialTargetCurrency?: string;
  onCurrencyConverted?: (result: {
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
  }) => void;
}

export function CurrencyConverterCard({
  initialBaseCurrency = 'USD',
  initialTargetCurrency = 'EUR',
}: CurrencyConverterCardProps) {
  const { colors, isDark, deviceFont } = useTheme();

  const [fromCurrency, setFromCurrency] = useState(initialBaseCurrency);
  const [toCurrency, setToCurrency] = useState(initialTargetCurrency);
  const [amount, setAmount] = useState('100');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [customRateText, setCustomRateText] = useState<string>('');
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);

  // Pickers state
  const [fromPickerVisible, setFromPickerVisible] = useState(false);
  const [toPickerVisible, setToPickerVisible] = useState(false);

  const fetchLiveRate = useCallback(async (from: string, to: string) => {
    setIsLoadingRate(true);
    try {
      const rate = await CurrencyService.getExchangeRate(from, to);
      setExchangeRate(rate);
      setCustomRateText(rate.toFixed(4));
    } catch {
      // Fallback already handled inside CurrencyService
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveRate(fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency, fetchLiveRate]);

  const handleSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setIsEditingRate(false);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditingRate(false);
    fetchLiveRate(fromCurrency, toCurrency);
  };

  const handleSaveCustomRate = () => {
    const parsed = parseFloat(customRateText);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRate(parsed);
      setIsEditingRate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = CurrencyService.convert(numericAmount, fromCurrency, toCurrency, exchangeRate);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 20,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
            ]}
          >
            <Globe size={18} color={colors.primary} />
          </View>
          <View>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
              ]}
            >
              Currency Converter
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontFamily: getFontFamily(deviceFont, 'regular') },
              ]}
            >
              Live & customizable FX exchange
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
          ]}
        >
          {isLoadingRate ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={15} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* From Currency & Amount */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[
            styles.currencySelector,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFromPickerVisible(true)}
        >
          <Text
            style={[
              styles.currencyCodeText,
              { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
            ]}
          >
            {fromCurrency}
          </Text>
        </TouchableOpacity>

        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.amountInput,
            {
              color: colors.text,
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              fontFamily: getFontFamily(deviceFont, 'bold'),
            },
          ]}
        />
      </View>

      {/* Swap and Rate Banner */}
      <View style={styles.middleRow}>
        <View style={styles.rateInfoContainer}>
          {isEditingRate ? (
            <View style={styles.editRateRow}>
              <Text
                style={[
                  styles.ratePrefix,
                  { color: colors.textSecondary, fontFamily: getFontFamily(deviceFont, 'regular') },
                ]}
              >
                1 {fromCurrency} =
              </Text>
              <TextInput
                value={customRateText}
                onChangeText={setCustomRateText}
                keyboardType="numeric"
                style={[
                  styles.customRateInput,
                  {
                    color: colors.primary,
                    borderColor: colors.primary,
                    fontFamily: getFontFamily(deviceFont, 'bold'),
                  },
                ]}
                autoFocus
              />
              <Text
                style={[
                  styles.ratePrefix,
                  { color: colors.textSecondary, fontFamily: getFontFamily(deviceFont, 'regular') },
                ]}
              >
                {toCurrency}
              </Text>
              <TouchableOpacity onPress={handleSaveCustomRate} style={styles.saveRateBtn}>
                <Check size={16} color={colors.primary} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingRate(true)}
              style={styles.rateBadge}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rateText,
                  { color: colors.textSecondary, fontFamily: getFontFamily(deviceFont, 'medium') },
                ]}
              >
                1 {fromCurrency} = <Text style={{ color: colors.text }}>{exchangeRate.toFixed(4)}</Text> {toCurrency}
              </Text>
              <Edit3 size={13} color={colors.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSwap}
          style={[
            styles.swapButton,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: colors.primary,
            },
          ]}
        >
          <ArrowRightLeft size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* To Currency & Converted Output */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[
            styles.currencySelector,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
          onPress={() => setToPickerVisible(true)}
        >
          <Text
            style={[
              styles.currencyCodeText,
              { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
            ]}
          >
            {toCurrency}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.convertedOutputBox,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.convertedAmountText,
              {
                color: colors.primary,
                fontFamily: getFontFamily(deviceFont, 'bold'),
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {convertedAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Currency Pickers */}
      <CurrencyPickerModal
        visible={fromPickerVisible}
        onClose={() => setFromPickerVisible(false)}
        selectedCurrency={fromCurrency}
        onSelect={setFromCurrency}
        title="From Currency"
      />
      <CurrencyPickerModal
        visible={toPickerVisible}
        onClose={() => setToPickerVisible(false)}
        selectedCurrency={toCurrency}
        onSelect={setToCurrency}
        title="To Currency"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencySelector: {
    width: 90,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCodeText: {
    fontSize: 16,
  },
  amountInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  rateInfoContainer: {
    flex: 1,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateText: {
    fontSize: 12,
  },
  editRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratePrefix: {
    fontSize: 12,
  },
  customRateInput: {
    borderBottomWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 13,
    minWidth: 50,
  },
  saveRateBtn: {
    padding: 4,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertedOutputBox: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  convertedAmountText: {
    fontSize: 18,
  },
});
