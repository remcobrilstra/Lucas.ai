import { Model } from '@prisma/client'

/**
 * Calculate cost for LLM usage
 * Prices are per 1M tokens, so we divide by 1M
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: Model
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerM
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerM
  return inputCost + outputCost
}

/**
 * Format cost as USD currency
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(cost)
}

/**
 * Estimate cost for a given text and model
 */
export function estimateCost(
  text: string,
  model: Model,
  isInput: boolean = true
): number {
  // Rough token estimate: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(text.length / 4)

  if (isInput) {
    return (estimatedTokens / 1_000_000) * model.inputPricePerM
  } else {
    return (estimatedTokens / 1_000_000) * model.outputPricePerM
  }
}
