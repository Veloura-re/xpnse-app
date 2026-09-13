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

// Helper function to group entries by time period
const groupEntriesByPeriod = (entries) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const groups = {
    today: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  };

  entries.forEach(entry => {
    const entryDate = new Date(entry.date || entry.createdAt);
    if (entryDate >= today) {
      groups.today.push(entry);
    } else if (entryDate >= weekAgo) {
      groups.thisWeek.push(entry);
    } else if (entryDate >= monthAgo) {
      groups.thisMonth.push(entry);
    } else {
      groups.older.push(entry);
    }
  });

  return groups;
};

// Helper function to calculate totals for a group
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

// Enhanced Excel Export with Multi-Currency & Cross-Platform Support (Web + iOS + Android)
export const exportToExcel = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'Ledger_Export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);
    const currencyBreakdown = calculateCurrencyBreakdown(safeEntries, baseCurrency);

    // Main entries sheet data
    const mainData = safeEntries.map(entry => {
      const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
      const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
        ? entry.originalAmount
        : Number(entry.amount) || 0;
      const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
        ? entry.exchangeRate
        : (origAmt > 0 ? (Number(entry.amount) / origAmt) : 1.0);

      const row = {
        Type: entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        Description: entry.description || 'N/A',
        Date: entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : 'N/A'),
        Category: entry.category || '',
        'Payment Mode': entry.paymentMode || '',
      };

      if (hasForeign) {
        row['Original Amount'] = origAmt;
        row['Original Currency'] = origCurr;
        row['Exchange Rate'] = formatExchangeRate(rate);
        row['Rate Type'] = entry.isCustomRate ? 'Custom' : (origCurr === baseCurrency ? 'Base' : 'Market');
      }

      row[`Ledger Amount (${baseCurrency})`] = Number(entry.amount) || 0;

      if (!isBusiness) {
        row[`Running Balance (${baseCurrency})`] = entry.displayBalance || 0;
      }

      if (isBusiness && entry.bookName) {
        row['Ledger Book'] = entry.bookName;
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
    ];
    if (hasForeign) {
      mainCols.push({ width: 16 }); // Original Amount
      mainCols.push({ width: 16 }); // Original Currency
      mainCols.push({ width: 14 }); // Exchange Rate
      mainCols.push({ width: 12 }); // Rate Type
    }
    mainCols.push({ width: 20 }); // Ledger Amount
    if (!isBusiness) {
      mainCols.push({ width: 20 }); // Running Balance
    }
    if (isBusiness) {
      mainCols.push({ width: 22 }); // Ledger Book
    }
    mainCols.push({ width: 16 }); // Created At

    mainWs['!cols'] = mainCols;
    XLSX.utils.book_append_sheet(wb, mainWs, 'Transactions');

    // 2. Multi-Currency Breakdown Sheet (if foreign currencies exist or multi-currency report)
    if (hasForeign || currencyBreakdown.length > 1) {
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

    // 3. Metadata Sheet
    const totals = calculateGroupTotals(safeEntries);
    const metaData = [
      { Field: 'Entity Type', Value: isBusiness ? 'Business Organization' : 'Ledger Book' },
      { Field: 'Entity Name', Value: safeEntity.name || 'N/A' },
      { Field: 'Base Currency', Value: baseCurrency },
      { Field: 'Total Transactions', Value: safeEntries.length },
      { Field: 'Total Cash In', Value: formatCurrency(totals.cashIn, baseCurrency) },
      { Field: 'Total Cash Out', Value: formatCurrency(totals.cashOut, baseCurrency) },
      { Field: 'Net Balance', Value: formatCurrency(totals.net, baseCurrency) },
      { Field: 'Multi-Currency Active', Value: hasForeign ? 'YES' : 'NO' },
      { Field: 'Report Period', Value: options.rangeLabel || 'All Time' },
      { Field: 'Generated At', Value: new Date().toLocaleString() },
    ];
    const metaWs = XLSX.utils.json_to_sheet(metaData);
    metaWs['!cols'] = [{ width: 24 }, { width: 40 }];
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

// Enhanced PDF Export with Executive Financial Styling & Multi-Currency Engine
export const exportToPDF = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'Ledger_Export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const entityTypeLabel = isBusiness ? 'Business Organization' : 'Ledger Book';
    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);
    const currencyBreakdown = calculateCurrencyBreakdown(safeEntries, baseCurrency);

    const grouped = groupEntriesByPeriod(safeEntries);
    const totals = calculateGroupTotals(safeEntries);
    const displayBalance = isBusiness ? totals.net : (typeof safeEntity.netBalance === 'number' ? safeEntity.netBalance : totals.net);
    const rangeLabel = options.rangeLabel ? `Period: ${options.rangeLabel}` : 'Period: All Time';
    const generationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Helper to generate section HTML
    const generateSectionHTML = (sectionTitle, periodEntries, periodTotals) => {
      if (!periodEntries || periodEntries.length === 0) return '';

      const rowsHTML = periodEntries.map(entry => {
        const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
        const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
          ? entry.originalAmount
          : Number(entry.amount) || 0;
        const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
          ? entry.exchangeRate
          : (origAmt > 0 ? (Number(entry.amount) / origAmt) : 1.0);
        const isConverted = origCurr !== baseCurrency;

        const isCashIn = entry.type === 'cash_in';
        const typeBadgeBg = isCashIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        const typeBadgeColor = isCashIn ? '#059669' : '#DC2626';
        const typeLabel = isCashIn ? 'IN' : 'OUT';

        const amountSign = isCashIn ? '+' : '-';
        const amountColor = isCashIn ? '#059669' : '#DC2626';

        return `
          <tr style="border-bottom: 1px solid #E2E8F0; page-break-inside: avoid;">
            <td style="padding: 8px 10px; width: 50px;">
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
                ${entry.paymentMode ? `<span>${entry.paymentMode}</span>` : ''}
                ${isBusiness && entry.bookName ? `<span style="color: #0284C7; font-weight: 600;"> • ${entry.bookName}</span>` : ''}
              </div>
            </td>
            ${hasForeign ? `
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; width: 125px;">
              ${isConverted ? `
                <div style="font-weight: 700; color: #0F172A;">${formatForeignAmount(origAmt, origCurr)}</div>
                <div style="font-size: 9px; color: #64748B; margin-top: 1px;">
                  Rate: ${formatExchangeRate(rate)} ${entry.isCustomRate ? '<span style="color: #D97706; font-weight: 700;">[Custom]</span>' : ''}
                </div>
              ` : `
                <span style="color: #94A3B8; font-size: 11px;">-</span>
              `}
            </td>` : ''}
            <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 700; color: ${amountColor}; width: 110px;">
              ${amountSign}${formatCurrency(Number(entry.amount) || 0, baseCurrency)}
            </td>
            ${!isBusiness ? `
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #334155; width: 95px;">
              ${formatCurrency(Number(entry.displayBalance) || 0, baseCurrency)}
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
              ${periodEntries.length} ${periodEntries.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0;">
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Type</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Date</th>
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Description</th>
                ${hasForeign ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Foreign Input</th>` : ''}
                <th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount (${baseCurrency})</th>
                ${!isBusiness ? `<th style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Balance</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; gap: 16px; font-size: 11px; background: #F8FAFC; padding: 6px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div><span style="color: #64748B;">Inflow:</span> <strong style="color: #059669;">${formatCurrency(periodTotals.cashIn, baseCurrency)}</strong></div>
            <div><span style="color: #64748B;">Outflow:</span> <strong style="color: #DC2626;">${formatCurrency(periodTotals.cashOut, baseCurrency)}</strong></div>
            <div><span style="color: #64748B;">Net:</span> <strong style="color: ${periodTotals.net >= 0 ? '#059669' : '#DC2626'};">${formatCurrency(periodTotals.net, baseCurrency)}</strong></div>
          </div>
        </div>
      `;
    };

    // Multi-Currency Breakdown Summary Block
    let currencySummaryHTML = '';
    if (hasForeign || currencyBreakdown.length > 1) {
      const currRows = currencyBreakdown.map(c => {
        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #0F172A;">
              ${c.currency} ${c.isBase ? '<span style="font-size: 9px; color: #059669; background: #ECFDF5; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">BASE</span>' : ''}
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
              ${c.isBase ? '1.0000' : `1 ${c.currency} = ${formatExchangeRate(c.effectiveRate)} ${baseCurrency}`}
            </td>
            <td style="padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: ${c.netBase >= 0 ? '#059669' : '#DC2626'};">
              ${formatCurrency(c.netBase, baseCurrency)}
            </td>
          </tr>
        `;
      }).join('');

      currencySummaryHTML = `
        <div style="margin-bottom: 24px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px; page-break-inside: avoid;">
          <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Multi-Currency Conversion Breakdown
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 1.5px solid #CBD5E1;">
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: left;">Currency</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Foreign In</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Foreign Out</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Foreign Net</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Effective Rate</th>
                <th style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #475569; text-align: right;">Converted Total (${baseCurrency})</th>
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
          <title>${safeEntity.name || 'Statement'} - Financial Statement</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

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
              border-top: 3px solid #10B981;
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

            .kpi-value {
              font-size: 15px;
              font-weight: 800;
              letter-spacing: -0.3px;
              margin: 0;
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
                padding: 15mm !important;
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
                <div class="brand-badge">SPNDY FINANCIAL OS</div>
                <h1 class="entity-title">${safeEntity.name || 'Statement'}</h1>
                <p class="entity-subtitle">${entityTypeLabel} Statement • ${baseCurrency}</p>
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
              <div class="kpi-value" style="color: ${displayBalance >= 0 ? '#059669' : '#DC2626'};">
                ${formatCurrency(displayBalance, baseCurrency)}
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Cash In</div>
              <div class="kpi-value" style="color: #059669;">
                +${formatCurrency(totals.cashIn, baseCurrency)}
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Cash Out</div>
              <div class="kpi-value" style="color: #DC2626;">
                -${formatCurrency(totals.cashOut, baseCurrency)}
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Items</div>
              <div class="kpi-value" style="color: #0F172A;">
                ${safeEntries.length}
              </div>
            </div>
          </div>

          ${currencySummaryHTML}

          <div>
            ${generateSectionHTML('Today', grouped.today, calculateGroupTotals(grouped.today))}
            ${generateSectionHTML('This Week', grouped.thisWeek, calculateGroupTotals(grouped.thisWeek))}
            ${generateSectionHTML('This Month', grouped.thisMonth, calculateGroupTotals(grouped.thisMonth))}
            ${generateSectionHTML('Older Entries', grouped.older, calculateGroupTotals(grouped.older))}
          </div>

          <div class="footer-note">
            <div>${safeEntity.name || 'Ledger'} • Certified Ledger Record</div>
            <div>Generated by spndy Ledger OS</div>
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

// Enhanced CSV Export with Multi-Currency & Cross-Platform Support (Web + iOS + Android)
export const exportToCSV = async (entity, entries, options = {}) => {
  try {
    const safeEntity = entity || { name: 'Ledger_Export' };
    const safeEntries = Array.isArray(entries) ? entries : [];

    const isBusiness = Boolean(options.isBusiness);
    const baseCurrency = (safeEntity.currency || safeEntity.settings?.currency || 'USD').toUpperCase();
    const hasForeign = hasForeignCurrencyEntries(safeEntries, baseCurrency);

    const headers = [
      'Type',
      'Date',
      'Description',
      'Category',
      'Payment Mode',
    ];

    if (hasForeign) {
      headers.push('Original Amount');
      headers.push('Original Currency');
      headers.push('Exchange Rate');
      headers.push('Rate Type');
    }

    headers.push(`Ledger Amount (${baseCurrency})`);

    if (!isBusiness) {
      headers.push(`Running Balance (${baseCurrency})`);
    }

    if (isBusiness) {
      headers.push('Ledger Book');
    }

    headers.push('Created At');

    const metaLines = [
      ['Entity Type', isBusiness ? 'Business Organization' : 'Ledger Book'],
      ['Entity Name', safeEntity.name || 'N/A'],
      ['Base Currency', baseCurrency],
      ['Total Entries', String(safeEntries.length)],
      ['Multi-Currency Active', hasForeign ? 'YES' : 'NO'],
      ['Generated At', new Date().toLocaleString()],
      []
    ];

    const rows = safeEntries.map(entry => {
      const origCurr = (entry.originalCurrency || baseCurrency).toUpperCase();
      const origAmt = typeof entry.originalAmount === 'number' && entry.originalAmount > 0
        ? entry.originalAmount
        : Number(entry.amount) || 0;
      const rate = typeof entry.exchangeRate === 'number' && entry.exchangeRate > 0
        ? entry.exchangeRate
        : (origAmt > 0 ? (Number(entry.amount) / origAmt) : 1.0);

      const rowValues = [
        entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : 'N/A'),
        entry.description || 'N/A',
        entry.category || '',
        entry.paymentMode || '',
      ];

      if (hasForeign) {
        rowValues.push(origAmt);
        rowValues.push(origCurr);
        rowValues.push(formatExchangeRate(rate));
        rowValues.push(entry.isCustomRate ? 'Custom' : (origCurr === baseCurrency ? 'Base' : 'Market'));
      }

      rowValues.push(Number(entry.amount) || 0);

      if (!isBusiness) {
        rowValues.push(Number(entry.displayBalance) || 0);
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