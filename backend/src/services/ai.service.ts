import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ParsedTransaction } from '../types/index';

// Groq uses the same OpenAI SDK — just a different baseURL and API key
const groq = new OpenAI({
  apiKey: config.groq.apiKey,
  baseURL: config.groq.baseURL,
});

const SYSTEM_PROMPT = `You are a bank statement parser for Indian bank accounts. Extract ALL transactions from the provided bank statement text.

Return a JSON object with a "transactions" array. Each transaction must have:
- date: ISO date string (YYYY-MM-DD). If year is missing, assume 2025.
- description: original bank description exactly as found
- cleanDescription: short human-readable label (e.g. "Swiggy Food Order", "Uber Ride", "Amazon Purchase")
- amount: positive number only (no currency symbols, no commas)
- type: "credit" if money came IN to account, "debit" if money went OUT
- category: exactly one from this list:
  "Food & Dining" | "Transport" | "Shopping" | "Entertainment" | "Utilities" | "Healthcare" | "Income" | "Investment" | "Education" | "Other"

Category rules:
- Food & Dining: Swiggy, Zomato, restaurants, cafes, groceries, BigBasket, Blinkit, Dunzo
- Transport: Uber, Ola, Rapido, fuel, petrol, diesel, metro, bus, IRCTC, train
- Shopping: Amazon, Flipkart, Myntra, Meesho, Ajio, retail stores
- Entertainment: Netflix, Hotstar, Spotify, Prime Video, YouTube, games, movies, PVR
- Utilities: electricity, internet, broadband, mobile recharge, water, gas, BESCOM, Jio, Airtel, BSNL
- Healthcare: pharmacy, hospital, clinic, doctor, diagnostic, lab, Apollo, MedPlus
- Income: salary, freelance payment, transfer received, interest credited, dividend, refund, cashback
- Investment: mutual fund, SIP, stocks, Zerodha, Groww, insurance premium, PPF, FD
- Education: courses, Udemy, books, school fees, college fees, coaching
- Other: anything that does not clearly fit above

IMPORTANT — Amount extraction rule:
Indian bank statements show each row as: DESCRIPTION  TRANSACTION_AMOUNT  RUNNING_BALANCE
Example: "SURESH V 20.00 12,623.97" → transaction amount is 20.00, running balance is 12,623.97
Always use the FIRST number as amount, NOT the last number (which is the running balance).
If amount is 0 or unclear, skip that row entirely.

Return ONLY valid JSON. No markdown, no code blocks, no explanation. Extract every transaction found.`;

async function categorizeChunk(chunk: string, chunkIndex: number): Promise<ParsedTransaction[]> {
  const response = await groq.chat.completions.create({
    model: config.groq.fastModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse all transactions from this bank statement section:\n\n${chunk}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as { transactions: ParsedTransaction[] };
  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  logger.info({ chunkIndex, count: transactions.length }, 'Chunk categorized');
  return transactions;
}

export async function categorizeTransactions(rawText: string): Promise<ParsedTransaction[]> {
  // Split into 2500 char chunks — keeps each request well under 6000 TPM free limit
  const CHUNK_SIZE = 2500;
  const chunks: string[] = [];

  for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
    chunks.push(rawText.slice(i, i + CHUNK_SIZE));
  }

  logger.info({ totalChunks: chunks.length }, 'Sending to Groq in chunks...');

  const allTransactions: ParsedTransaction[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const transactions = await categorizeChunk(chunks[i], i + 1);
      allTransactions.push(...transactions);

      // Small delay between chunks to respect TPM rate limits
      if (i < chunks.length - 1) {
        await new Promise((res) => setTimeout(res, 3000));
      }
    } catch (err: unknown) {
      const error = err as { status?: number; headers?: { 'retry-after'?: string } };
      if (error?.status === 413 || error?.status === 429) {
        const retryAfter = parseInt(error?.headers?.['retry-after'] || '20') * 1000;
        logger.warn({ chunkIndex: i + 1, retryAfter }, 'Rate limited — waiting before retry...');
        await new Promise((res) => setTimeout(res, retryAfter));
        const transactions = await categorizeChunk(chunks[i], i + 1);
        allTransactions.push(...transactions);
      } else {
        throw err;
      }
    }
  }

  logger.info({ count: allTransactions.length }, 'All transactions categorized by Groq');
  return allTransactions;
}

export async function generateInsights(transactionSummary: string): Promise<string> {
  logger.info('Generating spending insights with Groq...');

  const response = await groq.chat.completions.create({
    model: config.groq.model,
    messages: [
      {
        role: 'system',
        content: `You are a personal finance advisor for Indian users. Analyse the transaction data and provide actionable insights. Return a JSON object with:
- topCategories: array of {category, amount, percentage} for top 5 spending categories
- savingsTips: array of 3 specific saving tips based on actual spending patterns
- anomalies: array of unusual transactions or spending patterns noticed
- monthlySummary: one paragraph summary of financial health`,
      },
      {
        role: 'user',
        content: `Analyse these transactions and give insights:\n\n${transactionSummary}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '{}';
}

export async function ragChat(question: string, context: string, chatHistory: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  logger.info('Generating RAG chat response with Groq...');

  const response = await groq.chat.completions.create({
    model: config.groq.model,
    messages: [
      {
        role: 'system',
        content: `You are a personal finance assistant. Answer questions about the user's spending based ONLY on the transaction data provided. Be specific with amounts and dates. If the data doesn't contain enough information, say so clearly. Format numbers in Indian currency style (₹).`,
      },
      ...chatHistory,
      {
        role: 'user',
        content: `Based on these transactions:\n\n${context}\n\nAnswer this question: ${question}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || 'I could not generate a response.';
}

export { groq };
