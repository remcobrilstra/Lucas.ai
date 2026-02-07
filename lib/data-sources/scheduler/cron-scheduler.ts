/**
 * Crawl Scheduler
 *
 * Automatically schedules and triggers website re-crawling based on
 * the crawlFrequency setting of website-type DataSources.
 *
 * Uses node-cron to run checks every hour.
 */

import cron from 'node-cron'
import { prisma } from '@/lib/db/prisma'
import { dataSourcePipeline } from '../pipeline'

export class CrawlScheduler {
  private cronJob: cron.ScheduledTask | null = null

  /**
   * Start the scheduler
   * Runs every hour to check for DataSources that need re-crawling
   */
  start(): void {
    if (this.cronJob) {
      console.log('[CrawlScheduler] Scheduler already running')
      return
    }

    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('[CrawlScheduler] Checking for DataSources to re-crawl...')
      await this.checkAndScheduleCrawls()
    })

    console.log('[CrawlScheduler] Scheduler started (runs every hour)')

    // Also run immediately on startup
    this.checkAndScheduleCrawls()
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
      console.log('[CrawlScheduler] Scheduler stopped')
    }
  }

  /**
   * Check all website DataSources and schedule crawls if needed
   */
  async checkAndScheduleCrawls(): Promise<void> {
    try {
      const now = new Date()

      // Find all website-type DataSources with a crawl frequency set
      const dataSources = await prisma.dataSource.findMany({
        where: {
          type: 'website',
          crawlFrequency: {
            not: null,
          },
        },
      })

      console.log(`[CrawlScheduler] Found ${dataSources.length} website DataSources with crawl frequency`)

      for (const dataSource of dataSources) {
        if (this.shouldCrawl(dataSource, now)) {
          console.log(`[CrawlScheduler] Scheduling crawl for: ${dataSource.name}`)
          await this.scheduleCrawl(dataSource.id)
        }
      }
    } catch (error) {
      console.error('[CrawlScheduler] Error checking crawls:', error)
    }
  }

  /**
   * Determine if a DataSource should be crawled now
   */
  private shouldCrawl(dataSource: { lastCrawledAt: Date | null; crawlFrequency: string | null }, now: Date): boolean {
    // If never crawled, crawl now
    if (!dataSource.lastCrawledAt) {
      return true
    }

    const lastCrawled = new Date(dataSource.lastCrawledAt)
    const timeSinceLastCrawl = now.getTime() - lastCrawled.getTime()

    // Calculate required time based on frequency
    const requiredTime = this.getRequiredTimeBetweenCrawls(dataSource.crawlFrequency)

    return timeSinceLastCrawl >= requiredTime
  }

  /**
   * Get required time between crawls in milliseconds
   */
  private getRequiredTimeBetweenCrawls(frequency: string | null): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000 // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000 // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000 // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000 // 30 days
      default:
        return Infinity // Never auto-crawl
    }
  }

  /**
   * Schedule a crawl for a specific DataSource
   * Runs the crawl in the background
   */
  async scheduleCrawl(dataSourceId: string): Promise<void> {
    try {
      // Check if there's already a running crawl job for this DataSource
      const existingJob = await prisma.crawlJob.findFirst({
        where: {
          dataSourceId,
          status: {
            in: ['pending', 'running'],
          },
        },
      })

      if (existingJob) {
        console.log(`[CrawlScheduler] Crawl already in progress for ${dataSourceId}`)
        return
      }

      // Trigger the crawl asynchronously
      // Don't await - let it run in the background
      dataSourcePipeline.processWebsite(dataSourceId).catch((error) => {
        console.error(`[CrawlScheduler] Background crawl failed for ${dataSourceId}:`, error)
      })

      console.log(`[CrawlScheduler] Crawl triggered for ${dataSourceId}`)
    } catch (error) {
      console.error(`[CrawlScheduler] Error scheduling crawl for ${dataSourceId}:`, error)
    }
  }

  /**
   * Manually trigger a crawl for a DataSource
   * (useful for API endpoints)
   */
  async triggerManualCrawl(dataSourceId: string): Promise<void> {
    await this.scheduleCrawl(dataSourceId)
  }
}

// Export singleton instance
export const crawlScheduler = new CrawlScheduler()
