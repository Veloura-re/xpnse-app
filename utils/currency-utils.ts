import { CURRENCIES } from '@/constants/currencies';

/**
 * Returns the currency symbol for a given currency code.
 * Fallbacks to the code itself if no symbol is found, or '$' if code is missing.
 */
export const getCurrencySymbol = (code: string | undefined): string => {
    if (!code) return '$';
    const currency = CURRENCIES.find(c => c.code === code);
    return currency?.symbol || code;
};

/**
 * Formats a numeric amount into a localized currency string.
 * Uses Intl.NumberFormat for precision and formatting.
 * Fallbacks to a basic string format if Intl fails.
 */
export const formatCurrency = (amount: number, code: string | undefined): string => {
    const currencyCode = code || 'USD';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        const symbol = getCurrencySymbol(code);
        return `${symbol}${amount.toFixed(2)}`;
    }
};
