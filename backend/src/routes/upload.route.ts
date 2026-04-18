import { FastifyInstance } from 'fastify';
import { uploadPDF } from '../controllers/upload.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post('/pdf', { preHandler: [authMiddleware] }, uploadPDF);
}
