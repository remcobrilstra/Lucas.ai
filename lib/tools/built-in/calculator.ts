/**
 * Calculate mathematical expressions
 * Supports: +, -, *, /, ^, sqrt, sin, cos, tan, log, ln, abs, ceil, floor, round
 */
export function calculator(expression: string): number {
  try {
    // Create a safe math context with common functions
    const mathContext = {
      sqrt: Math.sqrt,
      pow: Math.pow,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      log: Math.log10,
      ln: Math.log,
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      pi: Math.PI,
      e: Math.E,
    }

    // Replace common patterns
    const sanitized = expression
      .toLowerCase()
      .replace(/\s+/g, "") // Remove whitespace
      .replace(/\^/g, "**") // Convert ^ to **
      .replace(/√/g, "sqrt") // Convert √ to sqrt

    // Build safe function string
    const functionString = `
      const { sqrt, pow, sin, cos, tan, log, ln, abs, ceil, floor, round, pi, e } = context;
      return ${sanitized};
    `

    // Evaluate with context
    const safeEval = new Function("context", functionString)
    const result = safeEval(mathContext)

    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Invalid result")
    }

    return result
  } catch (error) {
    throw new Error(
      `Failed to calculate: ${expression}. ${error instanceof Error ? error.message : ""}`
    )
  }
}
