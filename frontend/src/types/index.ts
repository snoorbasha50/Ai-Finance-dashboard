export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  description: string;
  cleanDescription: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  source: string;
  month: number;
  year: number;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
  categoryBreakdown: { category: string; amount: number }[];
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
