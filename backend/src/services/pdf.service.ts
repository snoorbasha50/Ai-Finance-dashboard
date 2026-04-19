import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext: { canvas: ReturnType<typeof createCanvas>; context: unknown }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: { canvas: ReturnType<typeof createCanvas> }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractWithOCR(buffer: Buffer): Promise<string> {
  logger.info('Falling back to OCR (tesseract.js) for scanned PDF...');

  const canvasFactory = new NodeCanvasFactory();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), canvasFactory });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  logger.info({ totalPages }, 'Starting OCR on PDF pages...');

  const worker = await createWorker('eng');
  const allText: string[] = [];

  for (let pageNum = 1; pageNum <= Math.min(totalPages, 10); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    }).promise;

    const imageBuffer = (canvasAndContext.canvas as ReturnType<typeof createCanvas>).toBuffer('image/png');
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
  try {
    const text = await extractWithPdfParse(buffer);
    if (text && text.length > 50) {
      logger.info({ chars: text.length }, 'PDF text extracted (text-based)');
      return text;
    }
  } catch (err) {
    logger.warn({ err }, 'pdf-parse failed, switching to OCR...');
  }

  const ocrText = await extractWithOCR(buffer);

  if (!ocrText || ocrText.length < 50) {
    throw new Error('Could not extract text from this PDF. Try downloading the statement directly from your bank portal.');
  }

  return ocrText;
}
