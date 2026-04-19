import axios from 'axios';
import { PaginatedTransactions, Summary, MonthlyData, ChatMessage } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Transactions
export const transactionsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<PaginatedTransactions>('/transactions', { params }),
  getSummary: () => api.get<Summary>('/transactions/summary'),
  getMonthly: () => api.get<MonthlyData[]>('/transactions/monthly'),
  createMock: () => api.post('/transactions/mock'),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

// Upload
export const uploadApi = {
  uploadPDF: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
  },
};

// AI
export const aiApi = {
  chat: (question: string, chatHistory: ChatMessage[]) =>
    api.post<{ answer: string }>('/ai/chat', { question, chatHistory }),
  insights: () => api.get('/ai/insights'),
};

export default api;
