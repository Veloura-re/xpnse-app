import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { Alert } from 'react-native';

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

// Helper function to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
    const entryDate = new Date(entry.date);
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
    if (entry.type === 'cash_in') {
      acc.cashIn += entry.amount;
    } else {
      acc.cashOut += entry.amount;
    }
    acc.net = acc.cashIn - acc.cashOut;
    return acc;
  }, { cashIn: 0, cashOut: 0, net: 0 });
};

// Enhanced Excel Export with Balance column
export const exportToExcel = async (book, entries, options = {}) => {
  try {
    const mainData = entries.map(entry => {
      return {
        Type: entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        Amount: entry.amount,
        Date: entry.date,
        Description: entry.description,
        'Payment Mode': entry.paymentMode || '',
        Category: entry.category || '',
        Balance: entry.displayBalance || 0, // Use pre-calculated balance
        'Created At': formatDate(entry.createdAt)
      };
    });

    // Group entries by period for summary sheets
    const grouped = groupEntriesByPeriod(entries);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Main entries sheet
    const mainWs = XLSX.utils.json_to_sheet(mainData);

    // Set column widths
    mainWs['!cols'] = [
      { width: 12 },  // Type
      { width: 15 },  // Amount
      { width: 12 },  // Date
      { width: 30 },  // Description
      { width: 15 },  // Payment Mode
      { width: 15 },  // Category
      { width: 15 },  // Balance
      { width: 15 }   // Created At
    ];

    XLSX.utils.book_append_sheet(wb, mainWs, 'All Entries');

    // Meta sheet
    const metaData = [
      { Label: 'Book', Value: book.name },
      { Label: 'Generated At', Value: new Date().toLocaleString() },
      { Label: 'Balance', Value: formatCurrency(book.netBalance, book.currency) },
      { Label: 'Total Entries', Value: entries.length },
    ];
    const metaWs = XLSX.utils.json_to_sheet(metaData);
    metaWs['!cols'] = [{ width: 20 }, { width: 40 }];
    XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

    // Summary sheet
    const summaryData = [
      { Period: 'Book Overview', 'Cash In': book.totalCashIn, 'Cash Out': book.totalCashOut, 'Net Balance': book.netBalance, 'Entry Count': entries.length },
      { Period: '', 'Cash In': '', 'Cash Out': '', 'Net Balance': '', 'Entry Count': '' },
      { Period: 'Today', ...calculateGroupTotals(grouped.today), 'Entry Count': grouped.today.length },
      { Period: 'This Week (excl. today)', ...calculateGroupTotals(grouped.thisWeek), 'Entry Count': grouped.thisWeek.length },
      { Period: 'This Month (excl. this week)', ...calculateGroupTotals(grouped.thisMonth), 'Entry Count': grouped.thisMonth.length },
      { Period: 'Older', ...calculateGroupTotals(grouped.older), 'Entry Count': grouped.older.length }
    ];

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [
      { width: 25 },  // Period
      { width: 15 },  // Cash In
      { width: 15 },  // Cash Out
      { width: 15 },  // Net Balance
      { width: 12 }   // Entry Count
    ];

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Add individual period sheets if they have entries  
    Object.entries(grouped).forEach(([period, periodEntries]) => {
      if (periodEntries.length > 0) {
        const periodData = periodEntries.map(entry => ({
          Type: entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
          Amount: entry.amount,
          Date: entry.date,
          Description: entry.description,
          'Payment Mode': entry.paymentMode || '',
          Category: entry.category || ''
        }));

        const periodWs = XLSX.utils.json_to_sheet(periodData);
        periodWs['!cols'] = [
          { width: 12 }, { width: 15 }, { width: 12 },
          { width: 30 }, { width: 15 }, { width: 15 }
        ];

        const sheetName = period === 'thisWeek' ? 'This Week' :
          period === 'thisMonth' ? 'This Month' :
            period.charAt(0).toUpperCase() + period.slice(1);
        XLSX.utils.book_append_sheet(wb, periodWs, sheetName);
      }
    });

    // Write and save
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const defaultName = `${book.name.replace(/[^a-zA-Z0-9]/g, '_')}_entries_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileName = (options && options.fileName) ? (options.fileName.endsWith('.xlsx') ? options.fileName : `${options.fileName}.xlsx`) : defaultName;
    const fileUri = FileSystem.cacheDirectory + fileName;

    const base64Encoding = (FileSystem.EncodingType && FileSystem.EncodingType.Base64) ? FileSystem.EncodingType.Base64 : 'base64';
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: base64Encoding
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Excel File'
      });
    } else {
      Alert.alert('Export Successful', `Excel file saved to: ${fileUri}`);
    }

    return { success: true, uri: fileUri };
  } catch (err) {
    console.error('Excel export error:', err);
    Alert.alert('Export Failed', 'Could not generate Excel file. Please try again.');
    return { success: false, error: err.message };
  }
};

// Enhanced PDF Export  
export const exportToPDF = async (book, entries, options = {}) => {
  try {
    const grouped = groupEntriesByPeriod(entries);
    const bookTotals = calculateGroupTotals(entries);

    // Create detailed HTML report
    const generateSectionHTML = (title, periodEntries, totals) => {
      if (periodEntries.length === 0) return '';

      const rows = periodEntries
        .slice(0, 50) // Limit to avoid PDF size issues
        .map(entry => {
          return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">
              ${entry.type === 'cash_in' ? '↗️ Cash In' : '↘️ Cash Out'}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px; text-align: right; font-weight: bold; color: ${entry.type === 'cash_in' ? '#10b981' : '#ef4444'};">
              ${formatCurrency(entry.amount, book.currency)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">
              ${formatDate(entry.date)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; max-width: 200px;">
              ${entry.description || 'N/A'}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">
              ${entry.paymentMode || 'N/A'}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">
              ${entry.category || 'N/A'}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px; text-align: right; font-weight: bold;">
              ${formatCurrency(entry.displayBalance || 0, book.currency)}
            </td>
          </tr>
        `;
        }).join('');

      return `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #10b981; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #10b981; padding-bottom: 5px;">
            ${title} (${periodEntries.length} entries)
          </h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 12px; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #6b7280;">Cash In</div>
              <div style="font-size: 14px; font-weight: bold; color: #10b981;">${formatCurrency(totals.cashIn, book.currency)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #6b7280;">Cash Out</div>
              <div style="font-size: 14px; font-weight: bold; color: #ef4444;">${formatCurrency(totals.cashOut, book.currency)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #6b7280;">Net</div>
              <div style="font-size: 14px; font-weight: bold; color: ${totals.net >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(totals.net, book.currency)}</div>
            </div>
          </div>
          ${periodEntries.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280;">Type</th>
                  <th style="padding: 10px; text-align: right; font-size: 11px; color: #6b7280;">Amount</th>
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280;">Date</th>
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280;">Description</th>
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280;">Payment</th>
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280;">Category</th>
                  <th style="padding: 10px; text-align: right; font-size: 11px; color: #6b7280;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          ` : '<p style="color: #6b7280; font-style: italic;">No entries in this period</p>'}
        </div>
      `;
    };

    const rangeLabel = options.rangeLabel ? `Range: ${options.rangeLabel}` : '';
    const balanceColor = book.netBalance >= 0 ? '#10b981' : '#ef4444';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${book.name} - Financial Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.5;
              color: #374151;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px; 
              border-bottom: 3px solid #10b981;
            }
            .header h1 { 
              color: #1f2937; 
              margin: 0; 
              font-size: 24px; 
              font-weight: 700;
            }
            .header .subtitle { 
              color: #6b7280; 
              margin: 8px 0; 
              font-size: 14px;
            }
            .overview { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin-bottom: 40px;
            }
            .overview-card { 
              background: white; 
              padding: 20px; 
              border-radius: 12px; 
              text-align: center; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border: 1px solid #e5e7eb;
            }
            .overview-card h3 { 
              margin: 0 0 8px 0; 
              font-size: 14px; 
              color: #6b7280; 
              font-weight: 500;
            }
            .overview-card .value { 
              font-size: 20px; 
              font-weight: 700; 
              margin: 0;
            }
            .cash-in { color: #10b981; }
            .cash-out { color: #ef4444; }
            .net-positive { color: #10b981; }
            .net-negative { color: #ef4444; }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px;
            }
            @media print {
              body { margin: 10px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 ${book.name}</h1>
            <div class="subtitle">Financial Report • Generated at ${new Date().toLocaleString()}</div>
            <div class="subtitle">Balance: <span style="color: ${balanceColor}; font-weight: 700;">${formatCurrency(book.netBalance, book.currency)}</span></div>
            <div class="subtitle">Total Entries: ${entries.length}${rangeLabel ? ` • ${rangeLabel}` : ''}</div>
          </div>

          <div class="overview">
            <div class="overview-card">
              <h3>💰 Total Cash In</h3>
              <p class="value cash-in">${formatCurrency(book.totalCashIn, book.currency)}</p>
            </div>
            <div class="overview-card">
              <h3>💸 Total Cash Out</h3>
              <p class="value cash-out">${formatCurrency(book.totalCashOut, book.currency)}</p>
            </div>
            <div class="overview-card">
              <h3>📊 Net Balance</h3>
              <p class="value ${book.netBalance >= 0 ? 'net-positive' : 'net-negative'}">${formatCurrency(book.netBalance, book.currency)}</p>
            </div>
          </div>

          ${generateSectionHTML('📅 Today', grouped.today, calculateGroupTotals(grouped.today))}
          ${generateSectionHTML('📆 This Week', grouped.thisWeek, calculateGroupTotals(grouped.thisWeek))}
          ${generateSectionHTML('🗓️ This Month', grouped.thisMonth, calculateGroupTotals(grouped.thisMonth))}
          ${generateSectionHTML('⏰ Older Entries', grouped.older, calculateGroupTotals(grouped.older))}

          <div class="footer">
            <p>Generated by Business Finance Management App</p>
            <p>For detailed analysis and complete data, please refer to the Excel export.</p>
          </div>
        </body>
      </html>
    `;

    const defaultName = `${book.name.replace(/[^a-zA-Z0-9]/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileName = (options && options.fileName) ? (options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`) : defaultName;
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export PDF Report'
      });
    } else {
      Alert.alert('Export Successful', `PDF report saved to: ${uri}`);
    }

    return { success: true, uri };
  } catch (err) {
    console.error('PDF export error:', err);
    Alert.alert('Export Failed', 'Could not generate PDF report. Please try again.');
    return { success: false, error: err.message };
  }
};

// Enhanced CSV Export with Balance column
export const exportToCSV = async (book, entries, options = {}) => {
  try {
    const headers = ['Type', 'Amount', 'Date', 'Description', 'Payment Mode', 'Category', 'Balance', 'Created At'];

    // Meta header lines
    const metaLines = [
      ['Book', book.name],
      ['Generated At', new Date().toLocaleString()],
      ['Balance', formatCurrency(book.netBalance, book.currency)],
      ['Total Entries', String(entries.length)],
      []
    ];

    const rows = entries.map(entry => {
      return [
        entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
        entry.amount,
        entry.date,
        entry.description.replace(/,/g, ' '), // Remove commas to avoid CSV issues
        (entry.paymentMode || '').replace(/,/g, ' '),
        (entry.category || '').replace(/,/g, ' '),
        entry.displayBalance || 0, // Use pre-calculated balance
        formatDate(entry.createdAt)
      ];
    });

    const csv = [
      ...metaLines.map(l => l.join(',')),
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const defaultName = `${book.name.replace(/[^a-zA-Z0-9]/g, '_')}_entries_${new Date().toISOString().split('T')[0]}.csv`;
    const fileName = (options && options.fileName) ? (options.fileName.endsWith('.csv') ? options.fileName : `${options.fileName}.csv`) : defaultName;
    const fileUri = FileSystem.cacheDirectory + fileName;

    const utf8Encoding = (FileSystem.EncodingType && FileSystem.EncodingType.UTF8) ? FileSystem.EncodingType.UTF8 : 'utf8';
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: utf8Encoding
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export CSV File'
      });
    } else {
      Alert.alert('Export Successful', `CSV file saved to: ${fileUri}`);
    }

    return { success: true, uri: fileUri };
  } catch (err) {
    console.error('CSV export error:', err);
    Alert.alert('Export Failed', 'Could not generate CSV file. Please try again.');
    return { success: false, error: err.message };
  }
};