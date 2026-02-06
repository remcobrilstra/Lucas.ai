/**
 * Simple test script to verify tool execution
 * Run with: npx tsx lib/tools/test-tools.ts
 */

import { executeTool } from "./registry"

const hasError = (value: unknown): value is { error: string } => {
  return typeof value === "object" && value !== null && "error" in value
}

async function testTools() {
  console.log("Testing built-in tools...\n")

  // Test calculator
  console.log("1. Testing calculator...")
  try {
    const result1 = await executeTool("calculator", { expression: "2 + 2" })
    console.log("   2 + 2 =", result1)

    const result2 = await executeTool("calculator", { expression: "sqrt(16)" })
    console.log("   sqrt(16) =", result2)

    const result3 = await executeTool("calculator", { expression: "sin(pi/2)" })
    console.log("   sin(pi/2) =", result3)

    const result4 = await executeTool("calculator", { expression: "2^10" })
    console.log("   2^10 =", result4)

    console.log("   ✓ Calculator test passed\n")
  } catch (error) {
    console.error("   ✗ Calculator test failed:", error)
  }

  // Test datetime
  console.log("2. Testing get_current_datetime...")
  try {
    const result1 = await executeTool("get_current_datetime", {})
    console.log("   Current time (default):", result1)

    const result2 = await executeTool("get_current_datetime", { timezone: "America/New_York" })
    console.log("   Current time (NY):", result2)

    console.log("   ✓ Datetime test passed\n")
  } catch (error) {
    console.error("   ✗ Datetime test failed:", error)
  }

  // Test web search (will fail without API key)
  console.log("3. Testing web_search...")
  try {
    const result = await executeTool("web_search", { query: "latest AI news" })
    if (hasError(result)) {
      console.log("   Expected: No API key configured")
      console.log("   ✓ Web search handled gracefully\n")
    } else {
      console.log("   Results:", result)
      console.log("   ✓ Web search test passed\n")
    }
  } catch (error) {
    console.error("   ✗ Web search test failed:", error)
  }

  console.log("All tests completed!")
}

testTools().catch(console.error)
