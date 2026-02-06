import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

/**
 * Local File Storage Service
 * Stores uploaded files in the local filesystem
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")

export class LocalStorage {
  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(UPLOAD_DIR)
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
  }

  /**
   * Save a file to local storage
   */
  async saveFile(file: File): Promise<{ filePath: string; fileSize: number }> {
    await this.ensureUploadDir()

    const fileId = randomUUID()
    const ext = file.name.split(".").pop() || "bin"
    const filename = `${fileId}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Write to disk
    await fs.writeFile(filePath, buffer)

    return {
      filePath,
      fileSize: buffer.length,
    }
  }

  /**
   * Read a file from local storage
   */
  async readFile(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath)
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error)
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string) {
    return await fs.stat(filePath)
  }
}

export const localStorage = new LocalStorage()
