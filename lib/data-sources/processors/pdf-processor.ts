import type { DocumentProcessor, FileType } from "../types"
import fs from "fs/promises"

/**
 * PDF Processor
 * Extracts text from PDF files
 */
export class PDFProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    const data = new Uint8Array(buffer)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const workerSrc = (import.meta as ImportMeta & { resolve?: (specifier: string) => string })
      .resolve?.("pdfjs-dist/legacy/build/pdf.worker.mjs")
    if (workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
    }
    const doc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .filter((text) => text.length > 0)
        .join(" ")
      pages.push(pageText)
    }

    return pages.join("\n\n")
  }

  getSupportedTypes(): FileType[] {
    return ["pdf"]
  }
}
