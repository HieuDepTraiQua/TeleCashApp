export type TxType = "INCOME" | "EXPENSE";

export interface Tx {
  id: string;
  code: string;
  type: TxType;
  amount: number;
  content: string;
  date: string;
  note: string | null;
  categoryId: string | null;
  category: { name: string; icon: string | null } | null;
}

export interface DaySummary {
  date: string;
  income: number;
  expense: number;
  balance: number;
  prevExpense: number;
  expenseDiff: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: TxType;
}

export interface CategoryWithKeywords extends Category {
  keywords: { id: string; text: string }[];
}

export interface Me {
  id: string;
  firstName: string | null;
  username: string | null;
  googleConnected: boolean;
  createdAt: string;
}

export interface ReportSeries {
  label: string;
  income: number;
  expense: number;
}

export interface ReportCategory {
  name: string;
  icon: string | null;
  amount: number;
  percent: number;
}

export interface ReportData {
  period: { label: string; start: string; end: string };
  totals: { income: number; expense: number; balance: number };
  prevExpense: number;
  expenseDiff: number;
  series: ReportSeries[];
  byCategory: ReportCategory[];
  transactions: Array<{
    id: string;
    code: string;
    type: TxType;
    amount: number;
    content: string;
    date: string;
    category: { name: string; icon: string | null } | null;
  }>;
}
