import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import mercurius from 'mercurius';
import { config } from './config';
import { authRoutes } from './routes/auth.route';
import { uploadRoutes } from './routes/upload.route';
import { transactionRoutes } from './routes/transactions.route';
import { aiRoutes } from './routes/ai.route';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import jwt from "jsonwebtoken";

export async function buildApp() {

const fastify = Fastify({ logger: false });


  await fastify.register(cors, { origin: config.clientUrl, credentials: true });
  await fastify.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  // GraphQL via mercurius — context injects userId from JWT header
  await fastify.register(mercurius, {
    schema,
    resolvers,
    graphiql: true,
    context: (request) => {
      const auth = request.headers.authorization;
      if (!auth) return { userId: '' };
      try {
        const decoded = jwt.verify(auth.replace("Bearer ", ""),config.jwt.secret) as { userId: string };
        return { userId: decoded.userId };
      } catch {
        return { userId: '' };
      }
    },
  });

  // REST routes
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(uploadRoutes, { prefix: '/api/upload' });
  fastify.register(transactionRoutes, { prefix: '/api/transactions' });
  fastify.register(aiRoutes, { prefix: '/api/ai' });

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  }));


return fastify

}