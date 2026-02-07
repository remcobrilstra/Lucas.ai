/**
 * Server Initialization
 *
 * Initializes background services when the server starts.
 * This should be imported in the root layout or a server component.
 */

import { crawlScheduler } from './data-sources/scheduler/cron-scheduler'

let isInitialized = false

export function initializeServer() {
  if (isInitialized) {
    return
  }

  console.log('[Server] Initializing background services...')

  // Start crawl scheduler
  crawlScheduler.start()

  isInitialized = true
  console.log('[Server] Background services initialized')
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  initializeServer()
}
