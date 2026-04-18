import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractWithOCR(buffer: Buffer): Promise<string> {
  logger.info('Falling back to OCR (tesseract.js) for scanned PDF...');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  logger.info({ totalPages }, 'Starting OCR on PDF pages...');

  const worker = await createWorker('eng');
  const allText: string[] = [];

  // Process max 10 pages to avoid timeout
  for (let pageNum = 1; pageNum <= Math.min(totalPages, 10); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvasContext: context as any,
      viewport,
    }).promise;

    const imageBuffer = canvas.toBuffer('image/png');
    const { data: { text } } = await worker.recognize(imageBuffer);
    allText.push(text);

    logger.info({ pageNum, totalPages }, 'OCR page done');
  }

  await worker.terminate();

  const fullText = allText.join('\n').trim();
  logger.info({ chars: fullText.length }, 'OCR complete');
  return fullText;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Try text-based first (fast, free, accurate)
  try {
    const text = await extractWithPdfParse(buffer);
    if (text && text.length > 50) {
      logger.info({ chars: text.length }, 'PDF text extracted (text-based)');
      return text;
    }
  } catch (err) {
    logger.warn({ err }, 'pdf-parse failed, switching to OCR...');
  }

  // OCR fallback for scanned PDFs
  const ocrText = await extractWithOCR(buffer);

  if (!ocrText || ocrText.length < 50) {
    throw new Error('Could not extract text from this PDF. Try downloading the statement directly from your bank portal.');
  }

  return ocrText;
}
