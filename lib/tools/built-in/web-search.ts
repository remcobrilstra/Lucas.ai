/**
 * Web search tool using Tavily API
 * Note: Requires TAVILY_API_KEY environment variable
 */
interface TavilyResult {
  title: string
  url: string
  content: string
}

interface WebSearchResponse {
  results: Array<{ title: string; url: string; snippet: string }>
}

export async function webSearch(query: string): Promise<WebSearchResponse | { error: string }> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    return {
      error: "Web search is not configured. Please add TAVILY_API_KEY to environment variables.",
    }
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to search")
    }

    const data = (await response.json()) as { results?: TavilyResult[] }

    return {
      results: data.results?.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
      })) || [],
    }
  } catch (error) {
    console.error("Web search error:", error)
    return {
      error: "Failed to perform web search",
    }
  }
}
