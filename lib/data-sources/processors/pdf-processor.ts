import type { DocumentProcessor, FileType } from "../types"
import fs from "fs/promises"
import { createRequire } from "module"

/**
 * PDF Processor
 * Extracts text from PDF files
 */
export class PDFProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    // Lazy-load via Node require to avoid ESM/CJS interop issues.
    const require = createRequire(import.meta.url)
    const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    return data.text
  }

  getSupportedTypes(): FileType[] {
    return ["pdf"]
  }
}
