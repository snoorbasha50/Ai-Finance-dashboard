export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionFilters {
  category?: string;
  type?: 'credit' | 'debit';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  cleanDescription: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
}
