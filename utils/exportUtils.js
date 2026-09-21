import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { Alert, Platform } from 'react-native';

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  const safeCurrency = (currency || 'USD').toUpperCase();
  if (typeof amount !== 'number' || isNaN(amount)) return `${safeCurrency} 0.00`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
  }
};

// Helper function to format foreign amount with currency code
const formatForeignAmount = (amount, currencyCode) => {
  const code = (currencyCode || 'USD').toUpperCase();
  if (typeof amount !== 'number' || isNaN(amount)) return `${code} 0.00`;
  return `${code} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Helper function to format exchange rate
const formatExchangeRate = (rate) => {
  if (typeof rate !== 'number' || isNaN(rate) || rate === 0) return '1.0000';
  return rate.toFixed(4);
};

// Helper to convert base amount to secondary currency
const convertBaseToSecondary = (amountBase, rate, direction = 'base_to_quote') => {
  if (typeof amountBase !== 'number' || isNaN(amountBase)) return 0;
  if (!rate || rate <= 0) return 0;
  if (direction === 'quote_to_base') {
    return Math.round((amountBase / rate) * 100) / 100;
  }
  return Math.round((amountBase * rate) * 100) / 100;
};

// Helper function to format quotation string
const formatQuotation = (base, secondary, rate, direction = 'base_to_quote') => {
  if (!secondary || !rate) return '';
  const numRate = Number(rate);
  const formattedRate = numRate % 1 === 0 ? numRate.toFixed(2) : numRate.toFixed(4);
  if (direction === 'quote_to_base') {
    return `1 ${secondary} = ${formattedRate} ${base}`;
  }
  return `1 ${base} = ${formattedRate} ${secondary}`;
};

// Helper function to calculate standard totals
const calculateGroupTotals = (entries) => {
  return entries.reduce((acc, entry) => {
    const amount = Number(entry.amount) || 0;
    if (entry.type === 'cash_in') {
      acc.cashIn += amount;
    } else {
      acc.cashOut += amount;
    }
    acc.net = acc.cashIn - acc.cashOut;
    return acc;
  }, { cashIn: 0, cashOut: 0, net: 0 });
};

// Helper function to calculate dual totals for a group
const calculateDualGroupTotals = (entries, baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection = 'base_to_quote') => {
  let cashInBase = 0;
  let cashOutBase = 0;
  let cashInSec = 0;
  let cashOutSec = 0;

  entries.forEach(entry => {
    const amtBase = Number(entry.amount) || 0;
    const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
    const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
      ? entry.originalAmount
      : amtBase;

    let amtSec = 0;
    if (secondaryCurrency) {
      if (origCurr === secondaryCurrency) {
        amtSec = origAmt;
      } else if (secondaryValuation) {
        amtSec = convertBaseToSecondary(amtBase, secondaryValuation, secondaryDirection);
      }
    }

    if (entry.type === 'cash_in') {
      cashInBase += amtBase;
      cashInSec += amtSec;
    } else {
      cashOutBase += amtBase;
      cashOutSec += amtSec;
    }
  });

  return {
    cashIn: Math.round(cashInBase * 100) / 100,
    cashOut: Math.round(cashOutBase * 100) / 100,
    net: Math.round((cashInBase - cashOutBase) * 100) / 100,
    cashInSecondary: Math.round(cashInSec * 100) / 100,
    cashOutSecondary: Math.round(cashOutSec * 100) / 100,
    netSecondary: Math.round((cashInSec - cashOutSec) * 100) / 100,
  };
};

// Helper function to calculate multi-currency breakdown
const calculateCurrencyBreakdown = (entries, baseCurrency = 'USD') => {
  const normalizedBase = (baseCurrency || 'USD').toUpperCase();
  const breakdownMap = {};

  entries.forEach(entry => {
    const origCurr = (entry.originalCurrency || normalizedBase).toUpperCase();
    const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
      ? entry.originalAmount
      : (Number(entry.amount) || 0);
    const baseAmt = Number(entry.amount) || 0;
    const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
      ? entry.exchangeRate
      : (origAmt > 0 ? (baseAmt / origAmt) : 1.0);
    const isCustom = Boolean(entry.isCustomRate);

    if (!breakdownMap[origCurr]) {
      breakdownMap[origCurr] = {
        currency: origCurr,
        isBase: origCurr === normalizedBase,
        totalCashInForeign: 0,
        totalCashOutForeign: 0,
        netForeign: 0,
        totalCashInBase: 0,
        totalCashOutBase: 0,
        netBase: 0,
        entryCount: 0,
        weightedRateSum: 0,
        baseVolumeForRate: 0,
        customRateCount: 0
      };
    }

    const item = breakdownMap[origCurr];
    item.entryCount += 1;
    if (isCustom) item.customRateCount += 1;

    if (entry.type === 'cash_in') {
      item.totalCashInForeign += origAmt;
      item.totalCashInBase += baseAmt;
    } else {
      item.totalCashOutForeign += origAmt;
      item.totalCashOutBase += baseAmt;
    }

    item.netForeign = item.totalCashInForeign - item.totalCashOutForeign;
    item.netBase = item.totalCashInBase - item.totalCashOutBase;
    item.weightedRateSum += rate * baseAmt;
    item.baseVolumeForRate += baseAmt;
  });

  return Object.values(breakdownMap).map(item => ({
    ...item,
    effectiveRate: item.baseVolumeForRate > 0
      ? (item.weightedRateSum / item.baseVolumeForRate)
      : (item.isBase ? 1.0 : 1.0)
  }));
};

// Check if dataset contains foreign currency entries
const hasForeignCurrencyEntries = (entries, baseCurrency = 'USD') => {
  const normalizedBase = (baseCurrency || 'USD').toUpperCase();
  return entries.some(e => {
    const curr = (e.originalCurrency || normalizedBase).toUpperCase();
    return curr !== normalizedBase && typeof e.originalAmount === 'number' && e.originalAmount > 0;
  });
};

// Helper function to sanitize file name
const sanitizeFileName = (name) => {
  if (!name) return 'financial_export';
  return String(name).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
};

// Helper function to escape CSV cell value with CSV Formula Injection protection
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Defend against CSV injection in Excel / LibreOffice
  if (typeof value === 'string' && /^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Helper to trigger browser downloads on Web
const triggerWebDownload = (blobOrUrl, fileName, isBlob = true) => {
  let url = blobOrUrl;
  let shouldRevoke = false;
  if (isBlob) {
    url = URL.createObjectURL(blobOrUrl);
    shouldRevoke = true;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    if (shouldRevoke && typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, 200);
};

// Enhanced Excel Export with Dual Currencies & Cross-Platform Support (Web + iOS + Android)
export const exportToExcel = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'spndy_export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const secondaryCurrency = safeEntity.settings?.secondaryCurrency
      ? safeEntity.settings.secondaryCurrency.toUpperCase()
      : (options.secondaryCurrency ? options.secondaryCurrency.toUpperCase() : null);
    const secondaryValuation = typeof safeEntity.settings?.secondaryCurrencyValuation === 'number' && safeEntity.settings.secondaryCurrencyValuation > 0
      ? safeEntity.settings.secondaryCurrencyValuation
      : (typeof options.secondaryCurrencyValuation === 'number' ? options.secondaryCurrencyValuation : null);
    const secondaryDirection = safeEntity.settings?.preferredQuotationDirection || options.preferredQuotationDirection || 'base_to_quote';

    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);
    const currencyBreakdown = calculateCurrencyBreakdown(safeEntries, baseCurrency);
    const dualTotals = calculateDualGroupTotals(safeEntries, baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection);

    // Main entries sheet data
    const mainData = safeEntries.map(entry => {
      const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
      const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
        ? entry.originalAmount
        : Number(entry.amount) || 0;
      const baseAmt = Number(entry.amount) || 0;
      const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
        ? entry.exchangeRate
        : (origAmt > 0 ? (baseAmt / origAmt) : 1.0);

      let secAmt = null;
      if (secondaryCurrency) {
        if (origCurr === secondaryCurrency) {
          secAmt = origAmt;
        } else if (secondaryValuation) {
          secAmt = convertBaseToSecondary(baseAmt, secondaryValuation, secondaryDirection);
        }
      }

      const row = {
        Type: entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        Description: entry.description || 'N/A',
        Date: entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : 'N/A'),
        Category: entry.category || '',
        'Payment Mode': entry.paymentMode || '',
        [`Amount (${baseCurrency})`]: baseAmt,
      };

      if (secondaryCurrency) {
        row[`Amount (${secondaryCurrency})`] = secAmt !== null ? secAmt : '';
        row['Display Rate'] = entry.displayRate || secondaryValuation || '';
        row['Quotation'] = formatQuotation(
          baseCurrency,
          secondaryCurrency,
          entry.displayRate || secondaryValuation,
          entry.rateQuotationDirection || secondaryDirection
        );
      }

      if (hasForeign) {
        row['Original Amount'] = origAmt;
        row['Original Currency'] = origCurr;
        row['Exchange Rate'] = formatExchangeRate(rate);
        row['Rate Type'] = entry.isCustomRate ? 'Custom' : (origCurr === baseCurrency ? 'Base' : 'Market');
      }

      if (!isBusiness) {
        row[`Running Balance (${baseCurrency})`] = entry.displayBalance || 0;
        if (secondaryCurrency && secondaryValuation) {
          row[`Running Balance (${secondaryCurrency})`] = convertBaseToSecondary(
            Number(entry.displayBalance) || 0,
            secondaryValuation,
            secondaryDirection
          );
        }
      }

      if (isBusiness && entry.bookName) {
        row['Book'] = entry.bookName;
      }

      row['Created At'] = formatDate(entry.createdAt);
      return row;
    });

    const wb = XLSX.utils.book_new();

    // 1. Main Entries Sheet
    const mainWs = XLSX.utils.json_to_sheet(mainData.length > 0 ? mainData : [{ Status: 'No transactions recorded' }]);
    const mainCols = [
      { width: 12 }, // Type
      { width: 28 }, // Description
      { width: 13 }, // Date
      { width: 16 }, // Category
      { width: 16 }, // Payment Mode
      { width: 18 }, // Amount Base
    ];

    if (secondaryCurrency) {
      mainCols.push({ width: 18 }); // Amount Secondary
      mainCols.push({ width: 14 }); // Display Rate
      mainCols.push({ width: 22 }); // Quotation
    }

    if (hasForeign) {
      mainCols.push({ width: 16 }); // Original Amount
      mainCols.push({ width: 16 }); // Original Currency
      mainCols.push({ width: 14 }); // Exchange Rate
      mainCols.push({ width: 12 }); // Rate Type
    }

    if (!isBusiness) {
      mainCols.push({ width: 20 }); // Running Balance Base
      if (secondaryCurrency) {
        mainCols.push({ width: 20 }); // Running Balance Secondary
      }
    }
    if (isBusiness) {
      mainCols.push({ width: 22 }); // Book
    }
    mainCols.push({ width: 16 }); // Created At

    mainWs['!cols'] = mainCols;
    XLSX.utils.book_append_sheet(wb, mainWs, 'Transactions');

    // 2. Multi-Currency Breakdown Sheet
    if (hasForeign || currencyBreakdown.length > 1 || secondaryCurrency) {
      const currencyData = currencyBreakdown.map(item => ({
        Currency: item.currency,
        'Base Currency': item.isBase ? 'YES' : 'NO',
        'Foreign Cash In': item.totalCashInForeign,
        'Foreign Cash Out': item.totalCashOutForeign,
        'Net Foreign Total': item.netForeign,
        'Effective Exchange Rate': formatExchangeRate(item.effectiveRate),
        [`Converted Net (${baseCurrency})`]: item.netBase,
        'Transaction Count': item.entryCount,
        'Custom Rate Count': item.customRateCount,
      }));

      const currWs = XLSX.utils.json_to_sheet(currencyData);
      currWs['!cols'] = [
        { width: 12 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
        { width: 22 },
        { width: 16 },
        { width: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, currWs, 'Currency Breakdown');
    }

    // 3. Metadata & Dual Currency Summary Sheet
    const metaData = [
      { Field: 'Entity Type', Value: isBusiness ? 'Business' : 'Book' },
      { Field: 'Entity Name', Value: safeEntity.name || 'N/A' },
      { Field: 'Base Primary Currency', Value: baseCurrency },
      { Field: 'Secondary Currency', Value: secondaryCurrency || 'None configured' },
      { Field: 'Exchange Rate Valuation', Value: secondaryCurrency && secondaryValuation ? formatQuotation(baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection) : 'N/A' },
      { Field: 'Total Transactions', Value: safeEntries.length },
      { Field: `Total Cash In (${baseCurrency})`, Value: formatCurrency(dualTotals.cashIn, baseCurrency) },
      { Field: `Total Cash Out (${baseCurrency})`, Value: formatCurrency(dualTotals.cashOut, baseCurrency) },
      { Field: `Net Balance (${baseCurrency})`, Value: formatCurrency(dualTotals.net, baseCurrency) },
    ];

    if (secondaryCurrency && secondaryValuation) {
      metaData.push(
        { Field: `Total Cash In (${secondaryCurrency})`, Value: formatCurrency(dualTotals.cashInSecondary, secondaryCurrency) },
        { Field: `Total Cash Out (${secondaryCurrency})`, Value: formatCurrency(dualTotals.cashOutSecondary, secondaryCurrency) },
        { Field: `Net Balance (${secondaryCurrency})`, Value: formatCurrency(dualTotals.netSecondary, secondaryCurrency) }
      );
    }

    metaData.push(
      { Field: 'Report Period', Value: options.rangeLabel || 'All Time' },
      { Field: 'Generated At', Value: new Date().toLocaleString() }
    );

    const metaWs = XLSX.utils.json_to_sheet(metaData);
    metaWs['!cols'] = [{ width: 30 }, { width: 44 }];
    XLSX.utils.book_append_sheet(wb, metaWs, 'Report Summary');

    const defaultName = `${sanitizeFileName(safeEntity.name)}_financial_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileName = (options && options.fileName)
      ? (options.fileName.endsWith('.xlsx') ? sanitizeFileName(options.fileName) : `${sanitizeFileName(options.fileName)}.xlsx`)
      : defaultName;

    // Platform-specific dispatch: Web vs Native Phone
    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, fileName);
      return { success: true };
    } else {
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const separator = (cacheDir && cacheDir.endsWith('/')) ? '' : '/';
      const fileUri = `${cacheDir}${separator}${fileName}`;

      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch {}

      const base64Encoding = (FileSystem.EncodingType && FileSystem.EncodingType.Base64)
        ? FileSystem.EncodingType.Base64
        : 'base64';

      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: base64Encoding });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Excel Workbook',
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        Alert.alert('Export Complete', `Excel file saved to: ${fileUri}`);
      }

      return { success: true, uri: fileUri };
    }
  } catch (err) {
    console.error('Excel export error:', err);
    Alert.alert('Export Failed', 'Could not generate Excel file. Please try again.');
    return { success: false, error: err.message };
  }
};

// Enhanced PDF Export with Executive Dual-Currency Financial Design
export const exportToPDF = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'spndy_export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const secondaryCurrency = safeEntity.settings?.secondaryCurrency
      ? safeEntity.settings.secondaryCurrency.toUpperCase()
      : (options.secondaryCurrency ? options.secondaryCurrency.toUpperCase() : null);
    const secondaryValuation = typeof safeEntity.settings?.secondaryCurrencyValuation === 'number' && safeEntity.settings.secondaryCurrencyValuation > 0
      ? safeEntity.settings.secondaryCurrencyValuation
      : (typeof options.secondaryCurrencyValuation === 'number' ? options.secondaryCurrencyValuation : null);
    const secondaryDirection = safeEntity.settings?.preferredQuotationDirection || options.preferredQuotationDirection || 'base_to_quote';

    const entityTypeLabel = isBusiness ? 'Business' : 'Book';
    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);
    const currencyBreakdown = calculateCurrencyBreakdown(safeEntries, baseCurrency);

    const dualTotals = calculateDualGroupTotals(safeEntries, baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection);

    const displayBalanceBase = isBusiness
      ? dualTotals.net
      : (typeof safeEntity.netBalance === 'number' ? safeEntity.netBalance : dualTotals.net);

    const displayBalanceSec = secondaryCurrency && secondaryValuation
      ? convertBaseToSecondary(displayBalanceBase, secondaryValuation, secondaryDirection)
      : null;

    const quotationString = formatQuotation(baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection);

    const rangeLabel = options.rangeLabel ? `Period: ${options.rangeLabel}` : 'Period: All Time';
    const generationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Helper to generate section HTML for single book export
    const generateSectionHTML = (sectionTitle, sectionEntries, sectionTotals, secCurr, secVal, secDir) => {
      if (!sectionEntries || sectionEntries.length === 0) return '';

      const hasSec = Boolean(secCurr);

      const rowsHTML = sectionEntries.map(entry => {
        const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
        const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
          ? entry.originalAmount
          : Number(entry.amount) || 0;
        const baseAmt = Number(entry.amount) || 0;
        const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
          ? entry.exchangeRate
          : (origAmt > 0 ? (baseAmt / origAmt) : 1.0);

        let secAmt = null;
        if (hasSec) {
          if (origCurr === secCurr) {
            secAmt = origAmt;
          } else if (secVal) {
            secAmt = convertBaseToSecondary(baseAmt, secVal, secDir);
          }
        }

        const isCashIn = entry.type === 'cash_in';
        const typeBadgeBg = isCashIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        const typeBadgeColor = isCashIn ? '#059669' : '#DC2626';
        const typeLabel = isCashIn ? 'IN' : 'OUT';

        const amountSign = isCashIn ? '+' : '-';
        const amountColor = isCashIn ? '#059669' : '#DC2626';

        const balanceBase = Number(entry.displayBalance) || 0;
        const balanceSec = hasSec && secVal ? convertBaseToSecondary(balanceBase, secVal, secDir) : null;

        return `
          <tr style="border-bottom: 1px solid #E2E8F0; page-break-inside: avoid;">
            <td style="padding: 8px 10px; width: 48px;">
              <span style="display: inline-block; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; background: ${typeBadgeBg}; color: ${typeBadgeColor}; text-align: center;">
                ${typeLabel}
              </span>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; color: #475569; width: 75px; white-space: nowrap;">
              ${formatDate(entry.date || entry.createdAt)}
            </td>
            <td style="padding: 8px 10px; font-size: 12px; color: #0F172A; max-width: 220px; word-break: break-word;">
              <div style="font-weight: 700; margin-bottom: 2px;">${entry.description || 'N/A'}</div>
              <div style="font-size: 10px; color: #64748B;">
                ${entry.category ? `<span style="background: #F1F5F9; padding: 1px 5px; border-radius: 4px; margin-right: 4px;">${entry.category}</span>` : ''}
                ${entry.paymentMode ? `<span style="background: #F8FAFC; padding: 1px 5px; border-radius: 4px; border: 1px solid #E2E8F0; margin-right: 4px;">${entry.paymentMode}</span>` : ''}
                ${isBusiness && entry.bookName ? `<span style="color: #0284C7; font-weight: 600;"> • ${entry.bookName}</span>` : ''}
              </div>
            </td>
            <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 700; color: ${amountColor}; width: 115px;">
              ${amountSign}${formatCurrency(baseAmt, baseCurrency)}
            </td>
            ${hasSec ? `
            <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 700; color: ${amountColor}; width: 115px;">
              ${secAmt !== null ? `${amountSign}${formatCurrency(secAmt, secCurr)}` : '<span style="color: #94A3B8;">-</span>'}
              ${entry.displayRate ? `<div style="font-size: 9px; color: #64748B; font-weight: 500;">Rate: ${entry.displayRate}</div>` : ''}
            </td>` : ''}
            ${!isBusiness ? `
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #334155; width: 95px;">
              ${formatCurrency(balanceBase, baseCurrency)}
            </td>` : ''}
            ${!isBusiness && hasSec ? `
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #475569; width: 95px;">
              ${balanceSec !== null ? formatCurrency(balanceSec, secCurr) : '-'}
            </td>` : ''}
          </tr>
        `;
      }).join('');

      return `
        <div style="margin-bottom: 24px; page-break-inside: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 4px;">
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
              ${sectionTitle}
            </div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600;">
              ${sectionEntries.length} ${sectionEntries.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0;">
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Type</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Date</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Description</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount (${baseCurrency})</th>
                ${hasSec ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount (${secCurr})</th>` : ''}
                ${!isBusiness ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Bal (${baseCurrency})</th>` : ''}
                ${!isBusiness && hasSec ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Bal (${secCurr})</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; gap: 16px; font-size: 11px; background: #F8FAFC; padding: 8px 14px; border-radius: 6px; border: 1px solid #E2E8F0; page-break-inside: avoid;">
            <div>
              <span style="color: #64748B;">Inflow:</span> 
              <strong style="color: #059669;">+${formatCurrency(sectionTotals.cashIn, baseCurrency)}</strong>
              ${hasSec ? `<span style="color: #059669; font-size: 10px;"> (+${formatCurrency(sectionTotals.cashInSecondary, secCurr)})</span>` : ''}
            </div>
            <div>
              <span style="color: #64748B;">Outflow:</span> 
              <strong style="color: #DC2626;">-${formatCurrency(sectionTotals.cashOut, baseCurrency)}</strong>
              ${hasSec ? `<span style="color: #DC2626; font-size: 10px;"> (-${formatCurrency(sectionTotals.cashOutSecondary, secCurr)})</span>` : ''}
            </div>
            <div>
              <span style="color: #64748B;">Net:</span> 
              <strong style="color: ${sectionTotals.net >= 0 ? '#059669' : '#DC2626'};">${formatCurrency(sectionTotals.net, baseCurrency)}</strong>
              ${hasSec ? `<span style="color: ${sectionTotals.netSecondary >= 0 ? '#059669' : '#DC2626'}; font-size: 10px;"> (${formatCurrency(sectionTotals.netSecondary, secCurr)})</span>` : ''}
            </div>
          </div>
        </div>
      `;
    };

    // Helper for business export grouped by book
    const generateBookSectionHTML = (bookName, bookEntries, bookTotals, bookBaseCurr, bookSecCurr, bookSecVal, bookSecDir) => {
      const hasEntries = bookEntries && bookEntries.length > 0;
      const hasSec = Boolean(bookSecCurr);

      const rowsHTML = hasEntries
        ? bookEntries.map(entry => {
            const origCurr = (entry.originalCurrency || bookBaseCurr).toUpperCase();
            const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
              ? entry.originalAmount
              : Number(entry.amount) || 0;
            const baseAmt = Number(entry.amount) || 0;

            let secAmt = null;
            if (hasSec) {
              if (origCurr === bookSecCurr) {
                secAmt = origAmt;
              } else if (bookSecVal) {
                secAmt = convertBaseToSecondary(baseAmt, bookSecVal, bookSecDir);
              }
            }

            const isCashIn = entry.type === 'cash_in';
            const typeBadgeBg = isCashIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
            const typeBadgeColor = isCashIn ? '#059669' : '#DC2626';
            const typeLabel = isCashIn ? 'IN' : 'OUT';

            const amountSign = isCashIn ? '+' : '-';
            const amountColor = isCashIn ? '#059669' : '#DC2626';

            return `
              <tr style="border-bottom: 1px solid #E2E8F0; page-break-inside: avoid;">
                <td style="padding: 8px 10px; width: 48px;">
                  <span style="display: inline-block; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; background: ${typeBadgeBg}; color: ${typeBadgeColor}; text-align: center;">
                    ${typeLabel}
                  </span>
                </td>
                <td style="padding: 8px 10px; font-size: 11px; color: #475569; width: 75px; white-space: nowrap;">
                  ${formatDate(entry.date || entry.createdAt)}
                </td>
                <td style="padding: 8px 10px; font-size: 12px; color: #0F172A; max-width: 220px; word-break: break-word;">
                  <div style="font-weight: 700; margin-bottom: 2px;">${entry.description || 'N/A'}</div>
                  <div style="font-size: 10px; color: #64748B;">
                    ${entry.category ? `<span style="background: #F1F5F9; padding: 1px 5px; border-radius: 4px; margin-right: 4px;">${entry.category}</span>` : ''}
                    ${entry.paymentMode ? `<span style="background: #F8FAFC; padding: 1px 5px; border-radius: 4px; border: 1px solid #E2E8F0;">${entry.paymentMode}</span>` : ''}
                  </div>
                </td>
                <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 700; color: ${amountColor}; width: 115px;">
                  ${amountSign}${formatCurrency(baseAmt, bookBaseCurr)}
                </td>
                ${hasSec ? `
                <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 700; color: ${amountColor}; width: 115px;">
                  ${secAmt !== null ? `${amountSign}${formatCurrency(secAmt, bookSecCurr)}` : '<span style="color: #94A3B8;">-</span>'}
                </td>` : ''}
              </tr>
            `;
          }).join('')
        : `
          <tr>
            <td colspan="${hasSec ? 5 : 4}" style="padding: 16px 10px; font-size: 11px; color: #94A3B8; text-align: center; font-style: italic;">
              No transactions recorded for this book in selected period.
            </td>
          </tr>
        `;

      const bookQuotation = hasSec && bookSecVal ? formatQuotation(bookBaseCurr, bookSecCurr, bookSecVal, bookSecDir) : '';

      return `
        <div style="margin-bottom: 26px; page-break-inside: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 2px solid #10B981; padding-bottom: 6px; page-break-inside: avoid;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; font-weight: 800; color: #059669; background: #ECFDF5; padding: 2px 8px; border-radius: 5px; letter-spacing: 0.5px; text-transform: uppercase;">BOOK</span>
              <span style="font-size: 14px; font-weight: 700; color: #0F172A;">${bookName}</span>
              <span style="font-size: 10px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px;">
                ${bookBaseCurr}${hasSec ? ` / ${bookSecCurr}` : ''}
              </span>
              ${bookQuotation ? `<span style="font-size: 9px; color: #0284C7; font-weight: 600;">[${bookQuotation}]</span>` : ''}
            </div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600;">
              ${bookEntries.length} ${bookEntries.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0;">
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Type</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Date</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Description</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount (${bookBaseCurr})</th>
                ${hasSec ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount (${bookSecCurr})</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          ${hasEntries ? `
          <div style="display: flex; justify-content: flex-end; gap: 16px; font-size: 11px; background: #F8FAFC; padding: 7px 14px; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 12px; page-break-inside: avoid;">
            <div>
              <span style="color: #64748B;">Book Inflow:</span> 
              <strong style="color: #059669;">+${formatCurrency(bookTotals.cashIn, bookBaseCurr)}</strong>
              ${hasSec ? `<span style="color: #059669; font-size: 10px;"> (+${formatCurrency(bookTotals.cashInSecondary, bookSecCurr)})</span>` : ''}
            </div>
            <div>
              <span style="color: #64748B;">Book Outflow:</span> 
              <strong style="color: #DC2626;">-${formatCurrency(bookTotals.cashOut, bookBaseCurr)}</strong>
              ${hasSec ? `<span style="color: #DC2626; font-size: 10px;"> (-${formatCurrency(bookTotals.cashOutSecondary, bookSecCurr)})</span>` : ''}
            </div>
            <div>
              <span style="color: #64748B;">Book Net:</span> 
              <strong style="color: ${bookTotals.net >= 0 ? '#059669' : '#DC2626'};">${formatCurrency(bookTotals.net, bookBaseCurr)}</strong>
              ${hasSec ? `<span style="color: ${bookTotals.netSecondary >= 0 ? '#059669' : '#DC2626'}; font-size: 10px;"> (${formatCurrency(bookTotals.netSecondary, bookSecCurr)})</span>` : ''}
            </div>
          </div>
          ` : ''}
        </div>
      `;
    };

    // Body content compilation
    let contentHTML = '';

    if (isBusiness) {
      const providedBooks = Array.isArray(options.books)
        ? options.books
        : (Array.isArray(entity?.books) ? entity.books : []);

      const bookMap = new Map();

      // 1. Seed with known books from options or entity
      providedBooks.forEach((b) => {
        if (b && (b.id || b.name)) {
          const key = b.id || b.name;
          bookMap.set(key, {
            id: b.id || key,
            name: b.name || 'Unnamed Book',
            currency: b.currency || b.settings?.currency || baseCurrency,
            settings: b.settings || {},
            entries: [],
          });
        }
      });

      // 2. Distribute safeEntries into respective books
      safeEntries.forEach((entry) => {
        let matchedKey = null;
        if (entry.bookId && bookMap.has(entry.bookId)) {
          matchedKey = entry.bookId;
        } else if (entry.bookName) {
          for (const [key, b] of bookMap.entries()) {
            if (b.name === entry.bookName) {
              matchedKey = key;
              break;
            }
          }
        }

        if (!matchedKey) {
          matchedKey = entry.bookId || entry.bookName || 'general_book';
          bookMap.set(matchedKey, {
            id: entry.bookId || matchedKey,
            name: entry.bookName || 'General Book',
            currency: baseCurrency,
            settings: {},
            entries: [],
          });
        }

        bookMap.get(matchedKey).entries.push(entry);
      });

      const booksArray = Array.from(bookMap.values());
      // Sort: books with entries first, then alphabetically
      booksArray.sort((a, b) => {
        if (a.entries.length > 0 && b.entries.length === 0) return -1;
        if (a.entries.length === 0 && b.entries.length > 0) return 1;
        return a.name.localeCompare(b.name);
      });

      contentHTML = booksArray.map(b => {
        const sortedEntries = [...b.entries].sort((x, y) => {
          const tA = new Date(x.date || x.createdAt).getTime() || 0;
          const tB = new Date(y.date || y.createdAt).getTime() || 0;
          return tB - tA;
        });

        const bBaseCurr = (b.currency || baseCurrency).toUpperCase();
        const bSecCurr = b.settings?.secondaryCurrency ? b.settings.secondaryCurrency.toUpperCase() : secondaryCurrency;
        const bSecVal = typeof b.settings?.secondaryCurrencyValuation === 'number' ? b.settings.secondaryCurrencyValuation : secondaryValuation;
        const bSecDir = b.settings?.preferredQuotationDirection || secondaryDirection;

        const bookTotals = calculateDualGroupTotals(sortedEntries, bBaseCurr, bSecCurr, bSecVal, bSecDir);
        return generateBookSectionHTML(b.name, sortedEntries, bookTotals, bBaseCurr, bSecCurr, bSecVal, bSecDir);
      }).join('');
    } else {
      // Single book export: all transactions sorted newest first
      const sortedEntries = [...safeEntries].sort((x, y) => {
        const tA = new Date(x.date || x.createdAt).getTime() || 0;
        const tB = new Date(y.date || y.createdAt).getTime() || 0;
        return tB - tA;
      });
      contentHTML = generateSectionHTML('Transactions', sortedEntries, dualTotals, secondaryCurrency, secondaryValuation, secondaryDirection);
    }

    // Multi-Currency Breakdown Summary Block
    let currencySummaryHTML = '';
    if (hasForeign || currencyBreakdown.length > 1 || secondaryCurrency) {
      const currRows = currencyBreakdown.map(c => {
        const isBase = c.isBase;
        const isSec = secondaryCurrency && c.currency === secondaryCurrency;
        const badge = isBase 
          ? '<span style="font-size: 9px; color: #059669; background: #ECFDF5; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 700;">BASE</span>'
          : (isSec ? '<span style="font-size: 9px; color: #0284C7; background: #F0F9FF; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 700;">SECONDARY</span>' : '');

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #0F172A;">
              ${c.currency} ${badge}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; color: #059669; font-weight: 600;">
              ${formatForeignAmount(c.totalCashInForeign, c.currency)}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; color: #DC2626; font-weight: 600;">
              ${formatForeignAmount(c.totalCashOutForeign, c.currency)}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: ${c.netForeign >= 0 ? '#059669' : '#DC2626'};">
              ${formatForeignAmount(c.netForeign, c.currency)}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; color: #475569; font-family: 'Space Grotesk', monospace;">
              ${c.isBase ? '1.0000' : (isSec && secondaryValuation ? quotationString : `1 ${c.currency} = ${formatExchangeRate(c.effectiveRate)} ${baseCurrency}`)}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: ${c.netBase >= 0 ? '#059669' : '#DC2626'};">
              ${formatCurrency(c.netBase, baseCurrency)}
            </td>
          </tr>
        `;
      }).join('');

      currencySummaryHTML = `
        <div style="margin-bottom: 24px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px; page-break-inside: avoid;">
          <div style="font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Multi-Currency Valuation & Conversion Ledger
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 1.5px solid #CBD5E1;">
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: left;">Currency</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Inflow</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Outflow</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Net Balance</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Valuation Rate</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Valuation (${baseCurrency})</th>
              </tr>
            </thead>
            <tbody>
              ${currRows}
            </tbody>
          </table>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${safeEntity.name || 'spndy'} - Financial Statement</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              background-color: #FFFFFF;
              font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #0F172A;
              -webkit-print-color-adjust: exact;
            }

            body {
              padding: 28px 32px;
              font-size: 11px;
              line-height: 1.4;
            }

            .header-card {
              background: #0F172A;
              color: #FFFFFF;
              border-radius: 12px;
              padding: 18px 22px;
              margin-bottom: 18px;
              position: relative;
              border-top: 4px solid #10B981;
            }

            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
            }

            .brand-badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #10B981;
              background: rgba(16, 185, 129, 0.15);
              padding: 2px 8px;
              border-radius: 6px;
              margin-bottom: 4px;
            }

            .entity-title {
              font-size: 20px;
              font-weight: 800;
              letter-spacing: -0.5px;
              margin: 0;
              color: #FFFFFF;
            }

            .entity-subtitle {
              font-size: 11px;
              color: #94A3B8;
              margin: 2px 0 0 0;
              font-weight: 500;
            }

            .meta-block {
              text-align: right;
            }

            .meta-label {
              font-size: 9px;
              color: #94A3B8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }

            .meta-value {
              font-size: 11px;
              font-weight: 700;
              color: #F8FAFC;
              margin-top: 1px;
            }

            .rate-pill {
              display: inline-block;
              font-size: 10px;
              font-weight: 700;
              color: #38BDF8;
              background: rgba(56, 189, 248, 0.12);
              padding: 3px 8px;
              border-radius: 6px;
              margin-top: 4px;
            }

            .kpi-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }

            .kpi-card {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              padding: 10px 12px;
            }

            .kpi-label {
              font-size: 9px;
              color: #64748B;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }

            .kpi-value-primary {
              font-size: 15px;
              font-weight: 800;
              letter-spacing: -0.3px;
              margin: 0;
            }

            .kpi-value-secondary {
              font-size: 11px;
              font-weight: 700;
              color: #64748B;
              margin-top: 2px;
            }

            .footer-note {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9px;
              color: #94A3B8;
            }

            @media print {
              body {
                padding: 12mm !important;
              }
              .header-card, .kpi-row {
                page-break-inside: avoid !important;
              }
              table {
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-card">
            <div class="header-top">
              <div>
                <div class="brand-badge">SPNDY • DUAL-CURRENCY FINANCIAL LEDGER</div>
                <h1 class="entity-title">${safeEntity.name || 'Statement'}</h1>
                <p class="entity-subtitle">
                  ${entityTypeLabel} Statement • Primary Currency: <strong>${baseCurrency}</strong>
                  ${secondaryCurrency ? ` • Secondary Currency: <strong>${secondaryCurrency}</strong>` : ''}
                </p>
                ${quotationString ? `<div class="rate-pill">Rate: ${quotationString}</div>` : ''}
              </div>
              <div class="meta-block">
                <div class="meta-label">Generated On</div>
                <div class="meta-value">${generationDate}</div>
                <div class="meta-label" style="margin-top: 6px;">Filter Window</div>
                <div class="meta-value">${rangeLabel}</div>
              </div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-label">Closing Net Balance</div>
              <div class="kpi-value-primary" style="color: ${displayBalanceBase >= 0 ? '#059669' : '#DC2626'};">
                ${formatCurrency(displayBalanceBase, baseCurrency)}
              </div>
              ${secondaryCurrency && displayBalanceSec !== null ? `
                <div class="kpi-value-secondary" style="color: ${displayBalanceSec >= 0 ? '#059669' : '#DC2626'};">
                  ${formatCurrency(displayBalanceSec, secondaryCurrency)}
                </div>
              ` : ''}
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Total Cash In</div>
              <div class="kpi-value-primary" style="color: #059669;">
                +${formatCurrency(dualTotals.cashIn, baseCurrency)}
              </div>
              ${secondaryCurrency ? `
                <div class="kpi-value-secondary" style="color: #059669;">
                  +${formatCurrency(dualTotals.cashInSecondary, secondaryCurrency)}
                </div>
              ` : ''}
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Total Cash Out</div>
              <div class="kpi-value-primary" style="color: #DC2626;">
                -${formatCurrency(dualTotals.cashOut, baseCurrency)}
              </div>
              ${secondaryCurrency ? `
                <div class="kpi-value-secondary" style="color: #DC2626;">
                  -${formatCurrency(dualTotals.cashOutSecondary, secondaryCurrency)}
                </div>
              ` : ''}
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Ledger Telemetry</div>
              <div class="kpi-value-primary" style="color: #0F172A;">
                ${safeEntries.length} <span style="font-size: 11px; font-weight: 600; color: #64748B;">Items</span>
              </div>
              <div class="kpi-value-secondary">
                ${baseCurrency}${secondaryCurrency ? ` & ${secondaryCurrency}` : ''}
              </div>
            </div>
          </div>

          ${currencySummaryHTML}

          <div>
            ${contentHTML}
          </div>

          <div class="footer-note">
            <div>${safeEntity.name || 'spndy'} • Executive Multi-Currency Ledger</div>
            <div>Generated securely by spndy</div>
          </div>
        </body>
      </html>
    `;

    const defaultName = `${sanitizeFileName(safeEntity.name)}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileName = (options && options.fileName)
      ? (options.fileName.endsWith('.pdf') ? sanitizeFileName(options.fileName) : `${sanitizeFileName(options.fileName)}.pdf`)
      : defaultName;

    const printOptions = {
      html,
      base64: Platform.OS === 'web'
    };

    const result = await Print.printToFileAsync(printOptions);

    // Platform-specific dispatch: Web vs Native Phone
    if (Platform.OS === 'web') {
      let downloadUrl = result?.uri;
      let shouldRevoke = false;

      if ((!downloadUrl || downloadUrl.startsWith('http')) && result?.base64) {
        try {
          const byteCharacters = atob(result.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          downloadUrl = URL.createObjectURL(blob);
          shouldRevoke = true;
        } catch (e) {
          console.warn('Manual blob conversion fallback:', e);
          downloadUrl = null;
        }
      }

      if (downloadUrl) {
        triggerWebDownload(downloadUrl, fileName, false);
        if (shouldRevoke) {
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 200);
        }
      } else {
        await Print.printAsync({ html });
      }
      return { success: true };
    } else {
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const separator = (cacheDir && cacheDir.endsWith('/')) ? '' : '/';
      const targetUri = `${cacheDir}${separator}${fileName}`;

      try {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      } catch {}

      await FileSystem.copyAsync({
        from: result.uri,
        to: targetUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export PDF Statement',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Export Complete', `PDF statement saved to:\n${targetUri}`);
      }
      return { success: true, uri: targetUri };
    }
  } catch (err) {
    console.error('PDF export error:', err);
    Alert.alert('Export Failed', 'Could not generate PDF statement. Please try again.');
    return { success: false, error: err.message };
  }
};

// Enhanced CSV Export with Dual Currencies & Cross-Platform Support (Web + iOS + Android)
export const exportToCSV = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'spndy_export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const secondaryCurrency = safeEntity.settings?.secondaryCurrency
      ? safeEntity.settings.secondaryCurrency.toUpperCase()
      : (options.secondaryCurrency ? options.secondaryCurrency.toUpperCase() : null);
    const secondaryValuation = typeof safeEntity.settings?.secondaryCurrencyValuation === 'number' && safeEntity.settings.secondaryCurrencyValuation > 0
      ? safeEntity.settings.secondaryCurrencyValuation
      : (typeof options.secondaryCurrencyValuation === 'number' ? options.secondaryCurrencyValuation : null);
    const secondaryDirection = safeEntity.settings?.preferredQuotationDirection || options.preferredQuotationDirection || 'base_to_quote';

    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);
    const dualTotals = calculateDualGroupTotals(safeEntries, baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection);

    const headers = [
      'Type',
      'Date',
      'Description',
      'Category',
      'Payment Mode',
      `Amount (${baseCurrency})`,
    ];

    if (secondaryCurrency) {
      headers.push(`Amount (${secondaryCurrency})`);
      headers.push('Display Rate');
      headers.push('Quotation');
    }

    if (hasForeign) {
      headers.push('Original Amount');
      headers.push('Original Currency');
      headers.push('Exchange Rate');
      headers.push('Rate Type');
    }

    if (!isBusiness) {
      headers.push(`Running Balance (${baseCurrency})`);
      if (secondaryCurrency) {
        headers.push(`Running Balance (${secondaryCurrency})`);
      }
    }

    if (isBusiness) {
      headers.push('Book');
    }

    headers.push('Created At');

    const metaLines = [
      ['Entity Type', isBusiness ? 'Business' : 'Book'],
      ['Entity Name', safeEntity.name || 'N/A'],
      ['Base Primary Currency', baseCurrency],
      ['Secondary Currency', secondaryCurrency || 'None'],
    ];

    if (secondaryCurrency && secondaryValuation) {
      metaLines.push(['Valuation Rate', formatQuotation(baseCurrency, secondaryCurrency, secondaryValuation, secondaryDirection)]);
    }

    metaLines.push(
      ['Total Entries', String(safeEntries.length)],
      [`Total Cash In (${baseCurrency})`, formatCurrency(dualTotals.cashIn, baseCurrency)],
      [`Total Cash Out (${baseCurrency})`, formatCurrency(dualTotals.cashOut, baseCurrency)],
      [`Net Balance (${baseCurrency})`, formatCurrency(dualTotals.net, baseCurrency)]
    );

    if (secondaryCurrency && secondaryValuation) {
      metaLines.push(
        [`Total Cash In (${secondaryCurrency})`, formatCurrency(dualTotals.cashInSecondary, secondaryCurrency)],
        [`Total Cash Out (${secondaryCurrency})`, formatCurrency(dualTotals.cashOutSecondary, secondaryCurrency)],
        [`Net Balance (${secondaryCurrency})`, formatCurrency(dualTotals.netSecondary, secondaryCurrency)]
      );
    }

    metaLines.push(
      ['Report Period', options.rangeLabel || 'All Time'],
      ['Generated At', new Date().toLocaleString()],
      []
    );

    const rows = safeEntries.map(entry => {
      const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
      const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
        ? entry.originalAmount
        : Number(entry.amount) || 0;
      const baseAmt = Number(entry.amount) || 0;
      const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
        ? entry.exchangeRate
        : (origAmt > 0 ? (baseAmt / origAmt) : 1.0);

      let secAmt = null;
      if (secondaryCurrency) {
        if (origCurr === secondaryCurrency) {
          secAmt = origAmt;
        } else if (secondaryValuation) {
          secAmt = convertBaseToSecondary(baseAmt, secondaryValuation, secondaryDirection);
        }
      }

      const rowValues = [
        entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : 'N/A'),
        entry.description || 'N/A',
        entry.category || '',
        entry.paymentMode || '',
        baseAmt,
      ];

      if (secondaryCurrency) {
        rowValues.push(secAmt !== null ? secAmt : '');
        rowValues.push(entry.displayRate || secondaryValuation || '');
        rowValues.push(formatQuotation(
          baseCurrency,
          secondaryCurrency,
          entry.displayRate || secondaryValuation,
          entry.rateQuotationDirection || secondaryDirection
        ));
      }

      if (hasForeign) {
        rowValues.push(origAmt);
        rowValues.push(origCurr);
        rowValues.push(formatExchangeRate(rate));
        rowValues.push(entry.isCustomRate ? 'Custom' : (origCurr === baseCurrency ? 'Base' : 'Market'));
      }

      if (!isBusiness) {
        rowValues.push(Number(entry.displayBalance) || 0);
        if (secondaryCurrency && secondaryValuation) {
          rowValues.push(convertBaseToSecondary(Number(entry.displayBalance) || 0, secondaryValuation, secondaryDirection));
        }
      }

      if (isBusiness) {
        rowValues.push(entry.bookName || '');
      }

      rowValues.push(formatDate(entry.createdAt));
      return rowValues.map(escapeCSV);
    });

    const csvContent = [
      ...metaLines.map(l => l.map(escapeCSV).join(',')),
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const defaultName = `${sanitizeFileName(safeEntity.name)}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    const fileName = (options && options.fileName)
      ? (options.fileName.endsWith('.csv') ? sanitizeFileName(options.fileName) : `${sanitizeFileName(options.fileName)}.csv`)
      : defaultName;

    // Platform-specific dispatch: Web vs Native Phone
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      triggerWebDownload(blob, fileName, true);
      return { success: true };
    } else {
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const separator = (cacheDir && cacheDir.endsWith('/')) ? '' : '/';
      const fileUri = `${cacheDir}${separator}${fileName}`;

      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch {}

      const utf8Encoding = (FileSystem.EncodingType && FileSystem.EncodingType.UTF8)
        ? FileSystem.EncodingType.UTF8
        : 'utf8';

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: utf8Encoding });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export CSV Register',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Export Complete', `CSV register saved to:\n${fileUri}`);
      }

      return { success: true, uri: fileUri };
    }
  } catch (err) {
    console.error('CSV export error:', err);
    Alert.alert('Export Failed', 'Could not generate CSV file. Please try again.');
    return { success: false, error: err.message };
  }
};