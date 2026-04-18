import { Transaction } from '../models/transaction.model';
import { ragChat, generateInsights } from './ai.service';
import { logger } from '../utils/logger';

interface TransactionDoc {
  text: string;
  tokens: Set<string>;
  metadata: Record<string, unknown>;
}

let vectorStore: TransactionDoc[] = [];
let lastBuiltForUserId = '';

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[₹,.\-/]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// BM25-style keyword overlap scoring — no API needed, completely free
function relevanceScore(questionTokens: Set<string>, docTokens: Set<string>): number {
  let matches = 0;
  for (const token of questionTokens) {
    if (docTokens.has(token)) matches++;
  }
  return matches / Math.max(questionTokens.size, 1);
}

function transactionToText(t: Record<string, unknown>): string {
  const date = new Date(t.date as string).toDateString();
  const direction = t.type === 'debit' ? 'spent' : 'received';
  return `On ${date}, ${direction} ₹${t.amount} for ${t.cleanDescription || t.description} (category: ${t.category})`;
}

export async function buildVectorStore(userId: string): Promise<void> {
  const transactions = await Transaction.find({ userId }).lean();
  if (transactions.length === 0) return;

  vectorStore = transactions.map((t) => {
    const text = transactionToText(t as unknown as Record<string, unknown>);
    return {
      text,
      tokens: tokenize(text),
      metadata: t as unknown as Record<string, unknown>,
    };
  });

  lastBuiltForUserId = userId;
  logger.info({ count: vectorStore.length }, 'RAG store built (keyword-based)');
}

export async function retrieveRelevantTransactions(
  question: string,
  userId: string,
  topK = 15
): Promise<string> {
  if (lastBuiltForUserId !== userId || vectorStore.length === 0) {
    await buildVectorStore(userId);
  }

  if (vectorStore.length === 0) return 'No transaction data available.';

  const questionTokens = tokenize(question);

  // Score all docs and pick top K
  const scored = vectorStore
    .map((doc) => ({ text: doc.text, score: relevanceScore(questionTokens, doc.tokens) }))
    .sort((a, b) => b.score - a.score);

  // Always include top K by relevance; if scores are all 0, return recent transactions
  const topDocs = scored.slice(0, topK).map((d) => d.text);

  return topDocs.join('\n');
}

export async function askRAG(
  question: string,
  userId: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const context = await retrieveRelevantTransactions(question, userId);
  return ragChat(question, context, chatHistory);
}

export async function getInsights(userId: string): Promise<unknown> {
  const transactions = await Transaction.find({ userId }).lean();

  if (transactions.length === 0) {
    return { error: 'No transactions found. Upload a bank statement first.' };
  }

  const summary = transactions
    .slice(0, 60)
    .map((t) => transactionToText(t as unknown as Record<string, unknown>))
    .join('\n');

  const raw = await generateInsights(summary);
  return JSON.parse(raw);
}

export function invalidateVectorStore(): void {
  vectorStore = [];
  lastBuiltForUserId = '';
}
