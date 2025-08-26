import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'

export interface RetryOptions {
  maxAttempts: number
  delayMs: number
  operation: string
  onRetry?: (attempt: number, maxAttempts: number, error: any) => void
  onSuccess?: (attempt: number, totalTimeMs: number) => void
}

/**
 * Generic retry utility to avoid code duplication across the codebase.
 * Provides consistent retry logic with logging and error handling.
 */
@inject()
export default class RetryHelper {
  constructor(private logger: Logger) {}

  /**
   * Execute an operation with retry logic.
   *
   * @param operation - The async operation to retry
   * @param options - Retry configuration options
   * @returns Promise that resolves with the operation result
   * @throws Error if all retry attempts fail
   */
  async execute<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    const { maxAttempts, delayMs, operation: operationName, onRetry, onSuccess } = options
    let lastError: any
    const startTime = Date.now()

    this.logger.info(`Starting ${operationName} with retry (max ${maxAttempts} attempts)`)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`${operationName} attempt ${attempt}/${maxAttempts}`)

        const result = await operation()

        const totalTimeMs = Date.now() - startTime
        this.logger.info({ attempts: attempt, totalTimeMs }, `${operationName} succeeded`)

        onSuccess?.(attempt, totalTimeMs)
        return result
      } catch (error: any) {
        lastError = error

        this.logger.warn(
          { attempt, maxAttempts, error: error.message },
          `${operationName} attempt ${attempt} failed`
        )

        onRetry?.(attempt, maxAttempts, error)

        if (attempt < maxAttempts) {
          this.logger.info(`Waiting ${delayMs / 1000} seconds before retry...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    const totalTimeMs = Date.now() - startTime
    this.logger.error(
      { maxAttempts, totalTimeMs, error: lastError.message },
      `${operationName} failed after all retry attempts`
    )

    throw new Error(`${operationName} failed after ${maxAttempts} attempts: ${lastError.message}`)
  }

  /**
   * Execute an operation with simple retry - no custom callbacks.
   */
  async executeSimple<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = 3,
    delayMs: number = 10000
  ): Promise<T> {
    return this.execute(operation, {
      maxAttempts,
      delayMs,
      operation: operationName,
    })
  }
}
