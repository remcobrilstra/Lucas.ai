/**
 * Get current date and time
 */
export function getCurrentDateTime(timezone?: string): string {
  try {
    const now = new Date()

    if (timezone) {
      return now.toLocaleString("en-US", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "long",
      })
    }

    return now.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "long",
    })
  } catch {
    // Fallback to ISO string if timezone is invalid
    return new Date().toISOString()
  }
}

/**
 * Format a date string
 */
export function formatDate(dateString: string, format?: string): string {
  try {
    const date = new Date(dateString)

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date")
    }

    // Simple format mapping
    const formats: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: "short" },
      medium: { dateStyle: "medium" },
      long: { dateStyle: "long" },
      full: { dateStyle: "full" },
    }

    const options = formats[format || "medium"] || formats.medium

    return date.toLocaleString("en-US", options)
  } catch {
    throw new Error(`Failed to format date: ${dateString}`)
  }
}
