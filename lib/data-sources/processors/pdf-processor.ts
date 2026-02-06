import type { DocumentProcessor, FileType } from "../types"
import fs from "fs/promises"

/**
 * PDF Processor
 * Extracts text from PDF files
 */
export class PDFProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    // Lazy-load to avoid Next.js bundler evaluating pdf-parse during route import.
    const { default: pdfParse } = await import("pdf-parse")
    const data = await pdfParse(buffer)
    return data.text
  }

  getSupportedTypes(): FileType[] {
    return ["pdf"]
  }
}
