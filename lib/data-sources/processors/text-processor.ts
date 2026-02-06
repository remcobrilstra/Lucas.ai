import type { DocumentProcessor, FileType } from "../types"
import fs from "fs/promises"

/**
 * Text Processor
 * Handles plain text files (.txt, .md)
 */
export class TextProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    return buffer.toString("utf-8")
  }

  getSupportedTypes(): FileType[] {
    return ["txt", "md"]
  }
}
