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
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
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
      { Label: 'Balance', Value: formatCurrency(book.netBalance, book.currency || book.settings?.currency || 'USD') },
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
export const exportToPDF = async (entity, entries, options = {}) => {
  console.log('[exportToPDF] Starting export', { 
    entityName: entity?.name, 
    entryCount: entries?.length, 
    options 
  });

  if (!entity || !entries) {
    console.error('[exportToPDF] Missing entity or entries:', { entity, entryCount: entries?.length });
    throw new Error('Missing business/book data or entries for export.');
  }

  try {
    const isBusiness = options.isBusiness || false;
    const currency = entity.currency || 'USD';
    const entityLabel = isBusiness ? '🏢 Business' : '📚 Ledger Book';
    
    const grouped = groupEntriesByPeriod(entries);
    const totals = calculateGroupTotals(entries);

    // Create detailed HTML report
    const generateSectionHTML = (title, periodEntries, periodTotals) => {
      if (periodEntries.length === 0) return '';

      const rows = periodEntries
        .map(entry => {
          return `
          <tr style="page-break-inside: avoid; page-break-after: auto;">
            <td style="padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">
              ${entry.type === 'cash_in' ? '↙️ IN' : '↗️ OUT'}
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: left; max-width: 280px; word-wrap: break-word;">
              <strong>${entry.description || 'N/A'}</strong><br/>
              <span style="font-size: 11px; color:#6b7280;">
                ${formatDate(entry.date)} 
                ${entry.category ? ' • ' + entry.category : ''} 
                ${entry.paymentMode ? ' • ' + entry.paymentMode : ''}
                ${isBusiness && entry.bookName ? ' • Book: ' + entry.bookName : ''}
              </span>
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 14px; text-align: right; font-weight: 700; color: ${entry.type === 'cash_in' ? '#059669' : '#dc2626'};">
              ${entry.type === 'cash_in' ? '+' : '-'}${formatCurrency(entry.amount, currency)}
            </td>
            ${!isBusiness ? `
            <td style="padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: right; font-weight: 600; color: #4b5563;">
              ${formatCurrency(entry.displayBalance || 0, currency)}
            </td>` : ''}
          </tr>
        `;
        }).join('');

      return `
        <div style="margin-bottom: 40px; page-break-inside: auto;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #059669; padding-bottom: 8px;">
            <h3 style="color: #059669; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
              ${title}
            </h3>
            <span style="color: #6b7280; font-size: 13px; font-weight: 500;">${periodEntries.length} items</span>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cash In</div>
              <div style="font-size: 15px; font-weight: 700; color: #059669;">${formatCurrency(periodTotals.cashIn, currency)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cash Out</div>
              <div style="font-size: 15px; font-weight: 700; color: #dc2626;">${formatCurrency(periodTotals.cashOut, currency)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Net Period</div>
              <div style="font-size: 15px; font-weight: 700; color: ${periodTotals.net >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(periodTotals.net, currency)}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: auto;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px 14px; text-align: left; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Type</th>
                <th style="padding: 12px 14px; text-align: left; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Details</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                ${!isBusiness ? `<th style="padding: 12px 14px; text-align: right; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bal.</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    };

    const rangeLabel = options.rangeLabel ? `Range: ${options.rangeLabel}` : '';
    const displayBalance = isBusiness ? totals.net : entity.netBalance;
    const balanceColor = displayBalance >= 0 ? '#059669' : '#dc2626';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${entity.name} - Financial Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            /* Root Styles */
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              color: #1e293b;
              line-height: 1.6;
              padding: 50px;
            }

            /* Header Section */
            .header { 
              margin-bottom: 50px; 
              padding-bottom: 30px; 
              border-bottom: 4px solid #0f172a;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 25px;
            }
            .header h1 { 
              color: #0f172a; 
              margin: 0; 
              font-size: 38px; 
              font-weight: 800;
              letter-spacing: -1.5px;
            }
            .header h2 {
              color: #64748b;
              margin: 8px 0 0 0;
              font-size: 18px;
              font-weight: 500;
            }
            .meta-box {
              text-align: right;
            }
            .meta-box .label {
              font-size: 13px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .meta-box .value {
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
            }

            /* Financial Status Bar */
            .balance-bar {
              background: #f1f5f9;
              padding: 24px 30px;
              border-radius: 12px;
              margin-bottom: 50px;
              border-left: 6px solid #3b82f6;
            }
            .balance-label {
              font-size: 14px;
              color: #1d4ed8;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .balance-value {
              font-size: 34px;
              font-weight: 800;
              color: ${balanceColor};
            }

            /* Overview Cards */
            .overview { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 30px; 
              margin-bottom: 60px;
            }
            .overview-card { 
              background: #f8fafc; 
              padding: 24px; 
              border-radius: 16px; 
              text-align: left; 
              border: 1px solid #e2e8f0;
            }
            .overview-card h3 { 
              margin: 0 0 10px 0; 
              font-size: 14px; 
              color: #475569; 
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .overview-card .value { 
              font-size: 28px; 
              font-weight: 800; 
              margin: 0;
              letter-spacing: -0.5px;
            }

            /* Table Styles */
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 40px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
            }
            thead {
              display: table-header-group;
              background: #f1f5f9;
            }
            th {
              padding: 16px 20px;
              text-align: left;
              font-size: 13px;
              color: #475569;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 16px 20px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 15px;
            }

            /* Utilities */
            .cash-in { color: #059669; }
            .cash-out { color: #dc2626; }
            .footer { 
              margin-top: 80px; 
              text-align: center; 
              color: #94a3b8; 
              font-size: 13px; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 30px;
            }

            /* Print Fixes for Multi-page */
            @media print {
              html, body {
                height: auto !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body {
                padding: 1.5cm !important; /* Proper print margins */
              }
              .header, .header-top, .overview {
                display: block !important;
                width: 100% !important;
                float: none !important;
              }
              .overview-card {
                display: inline-block !important;
                width: 30% !important;
                margin-right: 3% !important;
                vertical-align: top !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 20px !important;
              }
              table {
                display: table !important;
                width: 100% !important;
                page-break-inside: auto !important;
                break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              .balance-bar {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; display: block; overflow: visible;">
            <div class="header">
              <div class="header-top">
                <div>
                  <h1>${entityLabel}: ${entity.name}</h1>
                  <h2>Comprehensive Financial Statement</h2>
                </div>
                <div class="meta-box">
                  <div class="label">Generated on</div>
                  <div class="value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div style="margin-top: 10px;">
                    <span class="label">Filtered Items:</span>
                    <span class="value">${entries.length}${rangeLabel ? ` (${rangeLabel})` : ''}</span>
                  </div>
                </div>
              </div>
              
              <div class="balance-bar">
                <div class="balance-label">Closing ${isBusiness ? 'Net Difference' : 'Current Balance'}</div>
                <div class="balance-value">${formatCurrency(displayBalance, currency)}</div>
              </div>
            </div>

            <div class="overview">
              <div class="overview-card">
                <h3>Total Inflows</h3>
                <p class="value cash-in">${formatCurrency(totals.cashIn, currency)}</p>
              </div>
              <div class="overview-card">
                <h3>Total Outflows</h3>
                <p class="value cash-out">${formatCurrency(totals.cashOut, currency)}</p>
              </div>
              <div class="overview-card" style="background: ${totals.net >= 0 ? '#ecfdf5' : '#fef2f2'}; border-color: ${totals.net >= 0 ? '#a7f3d0' : '#fecaca'};">
                <h3 style="color: ${totals.net >= 0 ? '#065f46' : '#991b1b'};">Net Movement</h3>
                <p class="value ${totals.net >= 0 ? 'cash-in' : 'cash-out'}">${formatCurrency(totals.net, currency)}</p>
              </div>
            </div>

            <div style="display: block; width: 100%;">
              ${generateSectionHTML('📅 Today', grouped.today, calculateGroupTotals(grouped.today))}
              ${generateSectionHTML('📆 This Week', grouped.thisWeek, calculateGroupTotals(grouped.thisWeek))}
              ${generateSectionHTML('🗓️ This Month', grouped.thisMonth, calculateGroupTotals(grouped.thisMonth))}
              ${generateSectionHTML('⏰ Older Entries', grouped.older, calculateGroupTotals(grouped.older))}
            </div>

            <div class="footer">
              <p><strong>${entity.name}</strong> • ${entityLabel} Financial Report</p>
              <p>Generated securely by spndy App. For full analysis, export as Excel.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const defaultName = `${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileName = (options && options.fileName) ? (options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`) : defaultName;
    
    // Generate PDF
    const printOptions = {
      html,
      base64: Platform.OS === 'web' // For web we need base64 to trigger download effectively
    };

    const result = await Print.printToFileAsync(printOptions);

    if (Platform.OS === 'web') {
      // Browser-based download logic
      // On web, printToFileAsync often returns a blob URI directly
      let downloadUrl = result.uri;
      let shouldRevoke = false;
      
      // Fallback: If no URI but we have base64, create a manual blob
      if ((!downloadUrl || downloadUrl.startsWith('http')) && result.base64) {
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
          console.warn('Manual blob conversion failed, falling back to system print');
          downloadUrl = null;
        }
      }

      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          if (shouldRevoke && downloadUrl.startsWith('blob:')) {
            URL.revokeObjectURL(downloadUrl);
          }
        }, 100);
      } else {
        // Ultimate fallback for web: trigger system print dialog
        // This is extremely robust as it uses the browser's own PDF engine
        await Print.printAsync({ html });
      }
      return { success: true };
    } else {
      // Native mobile logic
      // Ensure path is correctly formatted with a separator
      const cacheDir = FileSystem.cacheDirectory;
      const separator = cacheDir.endsWith('/') ? '' : '/';
      const targetUri = `${cacheDir}${separator}${fileName}`;
      
      await FileSystem.moveAsync({
        from: result.uri,
        to: targetUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export PDF Report'
        });
      } else {
        Alert.alert('Export Successful', `PDF report saved to: ${targetUri}`);
      }
      return { success: true, uri: targetUri };
    }
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
      ['Balance', formatCurrency(book.netBalance, book.currency || book.settings?.currency || 'USD')],
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