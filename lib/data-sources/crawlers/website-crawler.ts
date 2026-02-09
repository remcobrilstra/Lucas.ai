/**
 * Website Crawler
 *
 * Crawls websites and converts HTML to markdown for indexing.
 * Features:
 * - Breadth-first crawl with depth limit
 * - Robots.txt compliance with crawl-delay respect
 * - Same-domain filtering
 * - HTML to Markdown conversion
 * - Link extraction and normalization
 * - SSRF protection (blocks private IPs)
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import robotsParser from 'robots-parser'
import type { CrawlResult } from '../types'

interface CrawlOptions {
  maxPages: number
  maxDepth: number
  respectRobotsTxt?: boolean
  userAgent?: string
  timeout?: number
}

export class WebsiteCrawler {
  private visited = new Set<string>()
  private queue: Array<{ url: string; depth: number }> = []
  private results: CrawlResult[] = []
  private robots: { isAllowed: (url: string, userAgent: string) => boolean } | null = null
  private crawlDelay = 0
  private lastCrawlTime = 0
  private baseUrl: string = ''
  private baseDomain: string = ''

  private options: Required<CrawlOptions>

  constructor(options: CrawlOptions) {
    this.options = {
      respectRobotsTxt: true,
      userAgent: 'Lucas.ai Bot (https://lucas.ai)',
      timeout: 30000,
      ...options,
    }
  }

  /**
   * Main crawl method - starts crawling from the given URL
   */
  async crawl(startUrl: string): Promise<CrawlResult[]> {
    try {
      // Normalize and validate URL
      const url = this.normalizeUrl(startUrl)
      if (!this.isValidUrl(url)) {
        throw new Error(`Invalid URL: ${url}`)
      }

      // Check for SSRF protection
      if (!this.isPublicUrl(url)) {
        throw new Error(`URL is not publicly accessible: ${url}`)
      }

      this.baseUrl = url
      this.baseDomain = new URL(url).hostname

      // Check robots.txt if enabled
      if (this.options.respectRobotsTxt) {
        await this.loadRobotsTxt(url)
      }

      // Initialize queue with start URL
      this.queue.push({ url, depth: 0 })

      // Process queue (breadth-first)
      while (this.queue.length > 0 && this.results.length < this.options.maxPages) {
        const { url: currentUrl, depth } = this.queue.shift()!

        // Skip if already visited
        if (this.visited.has(currentUrl)) {
          continue
        }

        // Skip if depth exceeded
        if (depth > this.options.maxDepth) {
          continue
        }

        // Check robots.txt
        if (this.robots && !this.robots.isAllowed(currentUrl, this.options.userAgent)) {
          console.log(`Blocked by robots.txt: ${currentUrl}`)
          continue
        }

        // Respect crawl delay
        await this.respectCrawlDelay()

        // Crawl the page
        try {
          const result = await this.crawlPage(currentUrl, depth)
          this.results.push(result)

          // Add links to queue if we haven't hit max depth
          if (depth < this.options.maxDepth) {
            for (const link of result.links) {
              if (!this.visited.has(link) && this.isSameDomain(link)) {
                this.queue.push({ url: link, depth: depth + 1 })
              }
            }
          }
        } catch (error) {
          console.error(`Error crawling ${currentUrl}:`, error)
          // Continue with other pages even if one fails
        } finally {
          this.visited.add(currentUrl)
        }

        this.lastCrawlTime = Date.now()
      }

      return this.results
    } catch (error) {
      throw new Error(`Crawl failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(url: string, depth: number): Promise<CrawlResult> {
    try {
      // Fetch HTML
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
        },
        maxRedirects: 5,
      })

      const html = response.data
      const $ = cheerio.load(html)

      // Extract title
      const title = $('title').text().trim() || new URL(url).pathname

      // Extract all links before stripping navigation elements
      const links: string[] = []
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).href
            const normalizedUrl = this.normalizeUrl(absoluteUrl)
            if (this.isValidUrl(normalizedUrl) && this.isSameDomain(normalizedUrl)) {
              links.push(normalizedUrl)
            }
          } catch {
            // Invalid URL, skip
          }
        }
      })

      // Remove script, style, and navigation elements
      $('script, style, nav, header, footer, aside').remove()

      // Convert HTML to Markdown
      const bodyHtml = $('body').html() || html
      const markdown = NodeHtmlMarkdown.translate(bodyHtml, {
        useLinkReferenceDefinitions: false,
        useInlineLinks: true,
      })

      return {
        url,
        title,
        content: markdown.trim(),
        depth,
        links: [...new Set(links)], // Deduplicate
      }
    } catch (error) {
      throw new Error(`Failed to crawl page: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Load and parse robots.txt
   */
  private async loadRobotsTxt(url: string): Promise<void> {
    try {
      const robotsUrl = new URL('/robots.txt', url).href
      const response = await axios.get(robotsUrl, {
        timeout: 10000,
        validateStatus: (status) => status === 200,
      })

      this.robots = robotsParser(robotsUrl, response.data)

      // Extract crawl delay if specified
      const crawlDelayMatch = response.data.match(/Crawl-delay:\s*(\d+)/i)
      if (crawlDelayMatch) {
        this.crawlDelay = parseInt(crawlDelayMatch[1], 10) * 1000
      }
    } catch {
      // If robots.txt doesn't exist or can't be fetched, allow all
      this.robots = null
    }
  }

  /**
   * Respect crawl delay between requests
   */
  private async respectCrawlDelay(): Promise<void> {
    const minDelay = Math.max(this.crawlDelay, 1000) // Minimum 1 second between requests
    const timeSinceLastCrawl = Date.now() - this.lastCrawlTime
    if (timeSinceLastCrawl < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - timeSinceLastCrawl))
    }
  }

  /**
   * Normalize URL (remove fragments, trailing slashes, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove fragment
      parsed.hash = ''
      // Remove trailing slash (except for root)
      if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1)
      }
      return parsed.href
    } catch {
      return url
    }
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Check if URL is same domain as base URL
   */
  private isSameDomain(url: string): boolean {
    try {
      const parsed = new URL(url)
      return this.normalizeHostname(parsed.hostname) === this.normalizeHostname(this.baseDomain)
    } catch {
      return false
    }
  }

  /**
   * Normalize hostnames to treat www-prefixed hosts as equivalent.
   */
  private normalizeHostname(hostname: string): string {
    return hostname.toLowerCase().replace(/^www\./, '')
  }

  /**
   * SSRF Protection: Check if URL is publicly accessible
   * Blocks private IPs and localhost
   */
  private isPublicUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname.toLowerCase()

      // Check for localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return false
      }

      // Check for private IP ranges
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return false
      }

      // Check for link-local addresses
      if (hostname.startsWith('169.254.')) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Get crawl statistics
   */
  getStats() {
    return {
      pagesVisited: this.visited.size,
      pagesQueued: this.queue.length,
      pagesFound: this.results.length,
    }
  }
}
