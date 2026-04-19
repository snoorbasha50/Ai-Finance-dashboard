import { MercuriusContext } from 'mercurius';
import { Transaction } from '../models/transaction.model';
import { redisService } from '../services/redis.service';

declare module 'mercurius' {
  interface MercuriusContext {
    userId: string;
  }
}

type GqlContext = MercuriusContext;

interface TransactionsArgs {
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
}

export const resolvers = {
  Query: {
    transactions: async (_: unknown, args: TransactionsArgs, ctx: GqlContext) => {
      const { page = 1, limit = 20, category, type } = args;
      const userId = ctx.userId;
      const cacheKey = `gql:transactions:${userId}:${page}:${limit}:${category}:${type}`;

      const cached = await redisService.get(cacheKey);
      if (cached) return cached;

      const filter: Record<string, unknown> = { userId };
      if (category) filter.category = category;
      if (type) filter.type = type;

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        Transaction.countDocuments(filter),
      ]);

      const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };
      await redisService.set(cacheKey, result, 300);
      return result;
    },

    summary: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const userId = ctx.userId;
      const cacheKey = `gql:summary:${userId}`;

      const cached = await redisService.get(cacheKey);
      if (cached) return cached;

      const transactions = await Transaction.find({ userId }).lean();

      const totalIncome = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const totalExpense = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

      const byCategory = transactions
        .filter((t) => t.type === 'debit')
        .reduce<Record<string, number>>((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {});

      const result = {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        netSavings: Math.round((totalIncome - totalExpense) * 100) / 100,
        transactionCount: transactions.length,
        categoryBreakdown: Object.entries(byCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
      };

      await redisService.set(cacheKey, result, 300);
      return result;
    },

    monthlyBreakdown: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const userId = ctx.userId;
      const cacheKey = `gql:monthly:${userId}`;

      const cached = await redisService.get(cacheKey);
      if (cached) return cached;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const transactions = await Transaction.find({ userId, date: { $gte: sixMonthsAgo } }).lean();

      const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};

      transactions.forEach((t) => {
        const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
        const monthLabel = new Date(t.year, t.month - 1).toLocaleString('default', {
          month: 'short', year: 'numeric',
        });
        if (!monthlyMap[key]) monthlyMap[key] = { month: monthLabel, income: 0, expense: 0 };
        if (t.type === 'credit') monthlyMap[key].income += t.amount;
        else monthlyMap[key].expense += t.amount;
      });

      const result = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
      await redisService.set(cacheKey, result, 300);
      return result;
    },
  },
};
