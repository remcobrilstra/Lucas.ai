import { z } from 'zod'

// ============================================
// Agent Validation Schemas
// ============================================

export const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  modelId: z.string().min(1, 'Model is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(128000).optional(),
  topP: z.number().min(0).max(1).optional(),
  avatar: z.string().optional(),
})

export type AgentInput = z.infer<typeof agentSchema>

// ============================================
// Data Source Validation Schemas
// ============================================

export const dataSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['file', 'web', 'api']),
  fileType: z.enum(['pdf', 'docx', 'txt', 'md']).optional(),
  chunkingStrategy: z.enum(['fixed-size', 'sentence', 'recursive', 'semantic']).default('fixed-size'),
  chunkSize: z.number().min(100).max(5000).default(1000),
  chunkOverlap: z.number().min(0).max(1000).default(200),
  indexingStrategy: z.enum(['vector', 'bm25', 'hybrid']).default('vector'),
  embeddingModel: z.string().default('text-embedding-3-small'),
})

export type DataSourceInput = z.infer<typeof dataSourceSchema>

// ============================================
// File Upload Validation
// ============================================

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    }
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MD',
    }
  }

  return { valid: true }
}

// ============================================
// User Authentication Schemas
// ============================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ============================================
// Organization Schemas
// ============================================

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
})

export type OrganizationInput = z.infer<typeof organizationSchema>

// ============================================
// Provider Configuration Schemas
// ============================================

export const providerConfigSchema = z.object({
  providerId: z.string().min(1, 'Provider is required'),
  apiKey: z.string().min(1, 'API key is required'),
})

export type ProviderConfigInput = z.infer<typeof providerConfigSchema>
