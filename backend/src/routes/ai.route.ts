import { FastifyInstance } from 'fastify';
import { chat, insights } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);
  fastify.post('/chat', chat);
  fastify.get('/insights', insights);
}
