import type { DocumentProcessor, FileType } from "../types"
import fs from "fs/promises"
import mammoth from "mammoth"

/**
 * DOCX Processor
 * Extracts text from Microsoft Word documents
 */
export class DOCXProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  getSupportedTypes(): FileType[] {
    return ["docx"]
  }
}
