import { RecurrenceFrequency, RecurringRule, BookEntry } from '@/types';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses a YYYY-MM-DD string into a Date object at midnight local time
 */
export function parseDateString(dateStr: string): Date {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
}

/**
 * Formats a Date object as YYYY-MM-DD
 */
export function formatDateToString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Safely adds months to a date preserving end-of-month bounds.
 * (e.g. Jan 31 + 1 month -> Feb 28/29, NOT Mar 2 or 3)
 */
export function addMonthsSafe(date: Date, months: number): Date {
  const target = new Date(date.getTime());
  const expectedMonth = (target.getMonth() + months) % 12;
  const originalDay = date.getDate();

  target.setMonth(target.getMonth() + months);

  // If day rolled over to the next month, adjust to last day of expected month
  if (target.getMonth() !== (expectedMonth < 0 ? expectedMonth + 12 : expectedMonth)) {
    target.setDate(0); // Sets to last day of previous month
  } else if (originalDay > target.getDate()) {
    // If the original date was e.g. 31 and current month has only 30 days
    target.setDate(0);
  }

  return target;
}

/**
 * Calculates the next due date following a given due date and recurrence frequency.
 */
export function calculateNextDueDate(
  currentDueDateStr: string,
  frequency: RecurrenceFrequency,
  interval: number = 1
): string {
  const date = parseDateString(currentDueDateStr);
  const safeInterval = Math.max(1, interval || 1);

  switch (frequency) {
    case 'daily': {
      date.setDate(date.getDate() + safeInterval);
      break;
    }
    case 'weekly': {
      date.setDate(date.getDate() + 7 * safeInterval);
      break;
    }
    case 'biweekly': {
      date.setDate(date.getDate() + 14 * safeInterval);
      break;
    }
    case 'monthly': {
      const newDate = addMonthsSafe(date, 1 * safeInterval);
      return formatDateToString(newDate);
    }
    case 'quarterly': {
      const newDate = addMonthsSafe(date, 3 * safeInterval);
      return formatDateToString(newDate);
    }
    case 'yearly': {
      const newDate = addMonthsSafe(date, 12 * safeInterval);
      return formatDateToString(newDate);
    }
    default: {
      date.setDate(date.getDate() + 7);
      break;
    }
  }

  return formatDateToString(date);
}

/**
 * Checks if a rule is due for execution today or overdue
 */
export function isRuleDue(nextDueDateStr: string, todayStr: string = getTodayString()): boolean {
  return nextDueDateStr <= todayStr;
}

/**
 * Returns human-readable label for recurrence frequency
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency, interval: number = 1): string {
  if (interval > 1) {
    switch (frequency) {
      case 'daily':
        return `Every ${interval} days`;
      case 'weekly':
        return `Every ${interval} weeks`;
      case 'biweekly':
        return `Every ${interval * 2} weeks`;
      case 'monthly':
        return `Every ${interval} months`;
      case 'quarterly':
        return `Every ${interval * 3} months`;
      case 'yearly':
        return `Every ${interval} years`;
    }
  }

  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Recurring';
  }
}

/**
 * Returns human-readable relative time until due date
 */
export function formatDueBadge(nextDueDateStr: string, todayStr: string = getTodayString()): {
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
} {
  if (nextDueDateStr === todayStr) {
    return { label: 'Due Today', isOverdue: false, isDueToday: true };
  }
  if (nextDueDateStr < todayStr) {
    const due = parseDateString(nextDueDateStr);
    const today = parseDateString(todayStr);
    const diffDays = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: `${diffDays}d overdue`,
      isOverdue: true,
      isDueToday: false,
    };
  }

  const due = parseDateString(nextDueDateStr);
  const today = parseDateString(todayStr);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { label: 'Due tomorrow', isOverdue: false, isDueToday: false };
  }
  return { label: `In ${diffDays} days`, isOverdue: false, isDueToday: false };
}

/**
 * Builds a BookEntry object payload from a RecurringRule
 */
export function buildEntryFromRecurringRule(
  rule: RecurringRule,
  executionDate: string = getTodayString()
): Omit<BookEntry, 'id' | 'createdAt' | 'userId'> {
  return {
    bookId: rule.bookId,
    businessId: rule.businessId,
    type: rule.type,
    amount: rule.amount,
    date: executionDate,
    description: rule.description,
    category: rule.category,
    paymentMode: rule.paymentMode,
    partyId: rule.partyId,
    originalCurrency: rule.originalCurrency,
    originalAmount: rule.originalAmount,
    exchangeRate: rule.exchangeRate,
    isCustomRate: rule.isCustomRate,
    recurringRuleId: rule.id,
  };
}
