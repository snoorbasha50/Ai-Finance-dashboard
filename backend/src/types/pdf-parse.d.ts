declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  export = parse;
}
