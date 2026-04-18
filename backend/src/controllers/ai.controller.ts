import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { askRAG, getInsights } from '../services/rag.service';
import { redisService } from '../services/redis.service';
import { logger } from '../utils/logger';

const chatSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function chat(request: FastifyRequest, reply: FastifyReply) {
  const result = chatSchema.safeParse(request.body);
  if (!result.success) {
    return reply.code(400).send({ error: result.error.errors[0].message });
  }

  const { question, chatHistory } = result.data;
  const userId = request.user!.userId;

  logger.info({ question }, 'RAG chat request');

  try {
    const answer = await askRAG(question, userId, chatHistory.slice(-10));
    return reply.send({ answer, question });
  } catch (err) {
    logger.error({ err }, 'RAG chat failed');
    return reply.code(502).send({
      error: 'AI chat failed. Make sure HUGGINGFACE_API_KEY and GROQ_API_KEY are set.',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

export async function insights(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const cacheKey = `insights:${userId}`;

  const cached = await redisService.get(cacheKey);
  if (cached) return reply.send(cached);

  try {
    const data = await getInsights(userId);
    await redisService.set(cacheKey, data, 600); // cache 10 mins
    return reply.send(data);
  } catch (err) {
    logger.error({ err }, 'Insights generation failed');
    return reply.code(502).send({
      error: 'Insights generation failed.',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
