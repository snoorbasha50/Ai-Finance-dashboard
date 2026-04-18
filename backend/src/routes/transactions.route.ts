import { FastifyInstance } from 'fastify';
import {
  getTransactions,
  getSummary,
  getMonthly,
  createMock,
  deleteTransaction,
} from '../controllers/transactions.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function transactionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', getTransactions);
  fastify.get('/summary', getSummary);
  fastify.get('/monthly', getMonthly);
  fastify.post('/mock', createMock);
  fastify.delete('/:id', deleteTransaction);
}
