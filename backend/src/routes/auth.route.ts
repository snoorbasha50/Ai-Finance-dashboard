import { FastifyInstance } from 'fastify';
import { register, login, refreshToken, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', register);
  fastify.post('/login', login);
  fastify.post('/refresh', refreshToken);
  fastify.get('/me', { preHandler: [authMiddleware] }, getMe);
}
