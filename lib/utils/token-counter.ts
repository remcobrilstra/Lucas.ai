import { getEncoding } from 'js-tiktoken'

/**
 * Count tokens in text using tiktoken
 * Default to cl100k_base encoding (used by GPT-4, GPT-3.5-turbo)
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
  try {
    const encodingName = model.startsWith("gpt-4") || model.startsWith("gpt-3.5")
      ? "cl100k_base"
      : "cl100k_base"
    const encoding = getEncoding(encodingName)
    const tokens = encoding.encode(text)
    if ("free" in encoding) {
      (encoding as { free?: () => void }).free?.()
    }
    return tokens.length
  } catch (error) {
    console.error('Error counting tokens:', error)
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4)
  }
}

/**
 * Estimate tokens for array of messages
 */
export function countMessagesTokens(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4'
): number {
  let totalTokens = 0

  for (const message of messages) {
    // Account for message formatting tokens
    totalTokens += 4 // Every message follows <im_start>{role/name}\n{content}<im_end>\n
    totalTokens += countTokens(message.role, model)
    totalTokens += countTokens(message.content, model)
  }

  totalTokens += 2 // Every reply is primed with <im_start>assistant

  return totalTokens
}
