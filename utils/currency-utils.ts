import { CURRENCIES } from '@/constants/currencies';

/**
 * Returns the currency symbol for a given currency code.
 * Fallbacks to the code itself if no symbol is found, or '$' if code is missing.
 */
export const getCurrencySymbol = (code: string | undefined): string => {
    if (!code) return '$';
    const upper = code.trim().toUpperCase();
    const currency = CURRENCIES.find(c => c.code.toUpperCase() === upper);
    return currency?.symbol || upper;
};

/**
 * Formats a numeric amount into a localized currency string.
 * Uses Intl.NumberFormat for precision and formatting with robust fallback.
 */
export const formatCurrency = (amount: number, code: string | undefined): string => {
    const rawCode = (code || 'USD').trim().toUpperCase();
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: rawCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    } catch (error) {
        const symbol = getCurrencySymbol(rawCode);
        const formattedNum = Math.abs(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return num < 0 ? `-${symbol}${formattedNum}` : `${symbol}${formattedNum}`;
    }
};

