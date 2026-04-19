import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionCategory } from '../models/transaction.model';
import { redisService } from '../services/redis.service';
import { publishTransaction } from '../kafka/producer';
import { emitToAll } from '../services/socket.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const MOCK_TRANSACTIONS = [
  { description: 'SWIGGY ORDER', cleanDescription: 'Swiggy Food Order', amount: 349, type: 'debit', category: 'Food & Dining' },
  { description: 'UBER TRIP', cleanDescription: 'Uber Cab Ride', amount: 187, type: 'debit', category: 'Transport' },
  { description: 'AMAZON PURCHASE', cleanDescription: 'Amazon Shopping', amount: 1299, type: 'debit', category: 'Shopping' },
  { description: 'NETFLIX SUBSCRIPTION', cleanDescription: 'Netflix Monthly', amount: 649, type: 'debit', category: 'Entertainment' },
  { description: 'SALARY CREDIT NEOKRED', cleanDescription: 'Monthly Salary', amount: 85000, type: 'credit', category: 'Income' },
  { description: 'ZOMATO ORDER', cleanDescription: 'Zomato Food Order', amount: 420, type: 'debit', category: 'Food & Dining' },
  { description: 'JIO RECHARGE', cleanDescription: 'Jio Mobile Recharge', amount: 299, type: 'debit', category: 'Utilities' },
  { description: 'ZERODHA SIP', cleanDescription: 'Mutual Fund SIP', amount: 5000, type: 'debit', category: 'Investment' },
  { description: 'APOLLO PHARMACY', cleanDescription: 'Apollo Pharmacy', amount: 560, type: 'debit', category: 'Healthcare' },
  { description: 'OLA RIDE', cleanDescription: 'Ola Cab Ride', amount: 145, type: 'debit', category: 'Transport' },
];

// GET /api/transactions
export async function getTransactions(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const {
    page = 1,
    limit = 20,
    category,
    type,
    startDate,
    endDate,
    search,
  } = request.query as {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };

  const cacheKey = `transactions:${userId}:${page}:${limit}:${category}:${type}:${startDate}:${endDate}:${search}`;
  const cached = await redisService.get(cacheKey);
  if (cached) return reply.send(cached);

  const filter: Record<string, unknown> = { userId };
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (search) filter.description = { $regex: search, $options: 'i' };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate);
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum).lean(),
    Transaction.countDocuments(filter),
  ]);

  const result = {
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };

  await redisService.set(cacheKey, result, 300);
  return reply.send(result);
}

// GET /api/transactions/summary
export async function getSummary(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const cacheKey = `summary:${userId}`;
  const cached = await redisService.get(cacheKey);
  if (cached) return reply.send(cached);

  const transactions = await Transaction.find({ userId }).lean();

  const totalIncome = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory = transactions
    .filter((t) => t.type === 'debit')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const result = {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netSavings: Math.round((totalIncome - totalExpense) * 100) / 100,
    transactionCount: transactions.length,
    categoryBreakdown,
  };

  await redisService.set(cacheKey, result, 300);
  return reply.send(result);
}

// GET /api/transactions/monthly
export async function getMonthly(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const cacheKey = `monthly:${userId}`;
  const cached = await redisService.get(cacheKey);
  if (cached) return reply.send(cached);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await Transaction.find({
    userId,
    date: { $gte: sixMonthsAgo },
  }).lean();

  const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};

  transactions.forEach((t) => {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
    const monthLabel = new Date(t.year, t.month - 1).toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    });

    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: monthLabel, income: 0, expense: 0 };
    }

    if (t.type === 'credit') monthlyMap[key].income += t.amount;
    else monthlyMap[key].expense += t.amount;
  });

  const result = Object.values(monthlyMap).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  await redisService.set(cacheKey, result, 300);
  return reply.send(result);
}

// POST /api/transactions/mock
export async function createMock(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const random = MOCK_TRANSACTIONS[Math.floor(Math.random() * MOCK_TRANSACTIONS.length)];
  const now = new Date();

  const transaction = {
    id: uuidv4(),
    userId,
    date: now,
    description: random.description,
    cleanDescription: random.cleanDescription,
    amount: random.amount,
    type: random.type as 'credit' | 'debit',
    category: random.category as TransactionCategory,
    source: 'kafka' as const,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  if (config.kafka.enabled) {
    await publishTransaction({ ...transaction, userId: userId.toString() });
  } else {
    await Transaction.create(transaction);
    emitToAll('new-transaction', { ...transaction, userId: userId.toString() });
  }

  await redisService.deletePattern(`*:${userId}*`);

  logger.info({ id: transaction.id }, 'Mock transaction created');
  return reply.code(201).send({ message: 'Mock transaction created', transaction });
}

// DELETE /api/transactions/:id
export async function deleteTransaction(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user!.userId;
  const { id } = request.params;

  const deleted = await Transaction.findOneAndDelete({ id, userId });
  if (!deleted) {
    return reply.code(404).send({ error: 'Transaction not found' });
  }

  await redisService.deletePattern(`*:${userId}*`);
  return reply.send({ message: 'Transaction deleted' });
}
