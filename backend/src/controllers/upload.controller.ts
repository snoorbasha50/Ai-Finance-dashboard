import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF } from '../services/pdf.service';
import { categorizeTransactions } from '../services/ai.service';
import { uploadPDFToS3 } from '../services/s3.service';
import { publishTransaction } from '../kafka/producer';
import { emitToAll } from '../services/socket.service';
import { redisService } from '../services/redis.service';
import { Transaction } from '../models/transaction.model';
import { logger } from '../utils/logger';
import { config } from '../config';

export async function uploadPDF(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();

  if (!file) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  if (file.mimetype !== 'application/pdf') {
    return reply.code(400).send({ error: 'Only PDF files are accepted' });
  }

  const buffer = await file.toBuffer();
  const userId = request.user!.userId;

  logger.info({ fileName: file.filename, size: buffer.length }, 'PDF received');

  // Check Groq key early
  if (!config.groq.apiKey || config.groq.apiKey === '') {
    return reply.code(500).send({ error: 'GROQ_API_KEY is not configured in .env' });
  }

  // Upload to S3 (non-blocking — skip if not configured)
  let s3Url = '';
  try {
    s3Url = await uploadPDFToS3(buffer, file.filename);
  } catch (err) {
    logger.warn({ err }, 'S3 upload failed — continuing without S3 storage');
  }

  // Extract text from PDF with timeout
  logger.info('Extracting text from PDF...');
  let rawText: string;
  try {
    rawText = await Promise.race([
      extractTextFromPDF(buffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('pdf-parse timed out after 30s')), 30000)
      ),
    ]);
  } catch (err) {
    logger.error({ err }, 'PDF text extraction failed');
    return reply.code(422).send({
      error: 'Could not extract text from this PDF. Make sure it is a text-based PDF, not a scanned image.',
    });
  }

  logger.info({ chars: rawText.length }, 'PDF text extracted, sending to Groq...');

  // Categorize with Groq with timeout
  let parsed;
  try {
    parsed = await Promise.race([
      categorizeTransactions(rawText),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Groq timed out after 5 minutes')), 300000)
      ),
    ]);
  } catch (err) {
    logger.error({ err }, 'Groq categorization failed');
    return reply.code(502).send({
      error: 'AI categorization failed. Check your GROQ_API_KEY in .env.',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  if (!parsed || parsed.length === 0) {
    return reply.code(422).send({ error: 'No transactions found in the PDF' });
  }

  logger.info({ count: parsed.length }, 'Saving transactions to MongoDB...');

  // Save to MongoDB + publish to Kafka
  const savedTransactions = [];

  for (const t of parsed) {
    try {
      const date = new Date(t.date);
      const validDate = isNaN(date.getTime()) ? new Date() : date;

      const transaction = {
        id: uuidv4(),
        userId,
        date: validDate,
        description: t.description,
        cleanDescription: t.cleanDescription,
        amount: Math.abs(Number(t.amount) || 0),
        type: t.type === 'credit' ? ('credit' as const) : ('debit' as const),
        category: t.category || 'Other',
        source: 'upload' as const,
        month: validDate.getMonth() + 1,
        year: validDate.getFullYear(),
      };

      await Transaction.create(transaction);
      if (config.kafka.enabled) {
        await publishTransaction({ ...transaction, userId: userId.toString() });
      } else {
        emitToAll('new-transaction', { ...transaction, userId: userId.toString() });
      }
      savedTransactions.push(transaction);
    } catch (err) {
      logger.warn({ err, description: t.description }, 'Skipped one transaction');
    }
  }

  await redisService.deletePattern(`*:${userId}*`);

  logger.info({ count: savedTransactions.length, s3Url }, 'Upload complete');

  return reply.code(201).send({
    message: `Successfully parsed ${savedTransactions.length} transactions`,
    count: savedTransactions.length,
    transactions: savedTransactions,
    s3Url,
  });
}
