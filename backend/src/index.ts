import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import mongoose from 'mongoose';
import { Server as SocketServer } from 'socket.io';
import mercurius from 'mercurius';
import { config } from './config';
import { logger } from './utils/logger';
import { authRoutes } from './routes/auth.route';
import { uploadRoutes } from './routes/upload.route';
import { transactionRoutes } from './routes/transactions.route';
import { aiRoutes } from './routes/ai.route';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { setSocketServer } from './services/socket.service';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

const fastify = Fastify({ logger: false });

async function bootstrap() {
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
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(auth.replace('Bearer ', ''), config.jwt.secret) as { userId: string };
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

  await mongoose.connect(config.mongodb.uri);
  logger.info('MongoDB connected');

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`GraphQL playground at http://localhost:${config.port}/graphiql`);

  const io = new SocketServer(fastify.server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  setSocketServer(io);

  io.on('connection', (socket) => {
    logger.info({ id: socket.id }, 'Client connected via Socket.io');
    socket.on('disconnect', () =>
      logger.info({ id: socket.id }, 'Client disconnected from Socket.io')
    );
  });

  await connectProducer();
  await connectConsumer(io);

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await disconnectProducer();
    await disconnectConsumer();
    await mongoose.disconnect();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error(err, 'Fatal error during server startup');
  process.exit(1);
});
