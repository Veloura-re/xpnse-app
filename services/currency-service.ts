import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENCIES, Currency } from '@/constants/currencies';

const RATES_CACHE_PREFIX = 'spndy_fx_rates_';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 Hours

// Fallback rates relative to USD if network and cache are unavailable
const STATIC_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 154.5,
  CAD: 1.38,
  AUD: 1.52,
  CHF: 0.89,
  CNY: 7.24,
  INR: 83.4,
  AED: 3.67,
  SAR: 3.75,
  NGN: 1480.0,
  KES: 130.5,
  ZAR: 18.2,
  BRL: 5.45,
  MXN: 18.1,
  SGD: 1.35,
  TRY: 32.8,
  EGP: 47.6,
  GHS: 14.9,
  PHP: 58.5,
  PKR: 278.5,
  BDT: 117.2,
  VND: 25400.0,
  IDR: 16250.0,
};

// In-memory cache for rapid synchronous calls
const memoryRatesCache: Record<string, { rates: Record<string, number>; timestamp: number }> = {};

export interface FXRateResult {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  isLive: boolean;
  timestamp: number;
}

export class CurrencyService {
  /**
   * Fetches exchange rates where `baseCurrency` is the base (1 base = X target).
   */
  static async getRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    const base = baseCurrency.toUpperCase();

    // 1. Check in-memory cache
    const mem = memoryRatesCache[base];
    if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.rates;
    }

    // 2. Check AsyncStorage cache
    try {
      const cachedStr = await AsyncStorage.getItem(`${RATES_CACHE_PREFIX}${base}`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.rates) {
          memoryRatesCache[base] = cached;
          return cached.rates;
        }
      }
    } catch {
      // Non-blocking storage read error, proceed to network
    }

    // 3. Fetch from Open Exchange Rates API
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          const rates: Record<string, number> = data.rates;
          const cacheEntry = { rates, timestamp: Date.now() };
          memoryRatesCache[base] = cacheEntry;

          // Save to AsyncStorage asynchronously
          AsyncStorage.setItem(`${RATES_CACHE_PREFIX}${base}`, JSON.stringify(cacheEntry)).catch(() => {});
          return rates;
        }
      }
    } catch (networkError) {
      console.warn(`[CurrencyService] Live rates fetch failed for ${base}, using fallback:`, networkError);
    }

    // 4. Fallback calculation if network failed
    return this.getFallbackRates(base);
  }

  /**
   * Computes fallback rates relative to requested base using static USD rates table
   */
  private static getFallbackRates(base: string): Record<string, number> {
    const baseToUsd = STATIC_FALLBACK_RATES[base] || 1.0;
    const rates: Record<string, number> = {};

    for (const [code, rateAgainstUsd] of Object.entries(STATIC_FALLBACK_RATES)) {
      rates[code] = rateAgainstUsd / baseToUsd;
    }

    // Ensure all currencies exist in the table at least with 1:1 if not found
    for (const curr of CURRENCIES) {
      if (!rates[curr.code]) {
        rates[curr.code] = 1.0;
      }
    }

    rates[base] = 1.0;
    return rates;
  }

  /**
   * Returns exchange rate: how much 1 unit of `fromCurrency` is worth in `toCurrency`.
   * (e.g. 1 EUR -> 1.08 USD)
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (!fromCurrency || !toCurrency || fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return 1.0;
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    try {
      const rates = await this.getRates(from);
      if (rates && rates[to]) {
        return rates[to];
      }
    } catch (error) {
      console.warn('[CurrencyService] Rate lookup error:', error);
    }

    // Fallback calculation via USD
    const fromUsd = STATIC_FALLBACK_RATES[from] || 1.0;
    const toUsd = STATIC_FALLBACK_RATES[to] || 1.0;
    return toUsd / fromUsd;
  }

  /**
   * Converts an amount from `fromCurrency` to `toCurrency`.
   * Accepts an optional `customRate` if the user overrode the market rate.
   */
  static convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number
  ): number {
    if (isNaN(amount) || amount === 0) return 0;
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
    const effectiveRate = isNaN(rate) || rate <= 0 ? 1.0 : rate;
    return Math.round(amount * effectiveRate * 100) / 100;
  }

  /**
   * Searches currencies by code or name
   */
  static search(queryText: string): Currency[] {
    if (!queryText || !queryText.trim()) return CURRENCIES;
    const q = queryText.trim().toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }

  /**
   * Returns popular currencies for fast pickers
   */
  static getPopular(): Currency[] {
    const popularCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'AED', 'SAR', 'KES', 'NGN', 'ZAR', 'BRL', 'CNY', 'CHF'];
    return popularCodes
      .map((code) => CURRENCIES.find((c) => c.code === code))
      .filter((c): c is Currency => Boolean(c));
  }
}
