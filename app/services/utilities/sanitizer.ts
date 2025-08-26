/**
 * Utility for sanitizing sensitive information for logging purposes.
 * Handles both URI and parameter sanitization in one unified class.
 */
export default class Sanitizer {
  /**
   * Sanitize MongoDB connection URI by replacing passwords with asterisks.
   * Handles standard MongoDB URI formats: mongodb://username:password@host
   */
  static sanitizeURI(connectionUri: string): string {
    // Replace password in URI format
    return connectionUri.replace(/:([^:@]+)@/, ':***@')
  }

  /**
   * Generic method to sanitize any object by replacing specified sensitive fields.
   */
  static sanitizeObject(
    obj: any,
    sensitiveFields: string[] = ['password', 'adminPassword', 'monitorPassword', 'backupPassword']
  ): any {
    const sanitized = { ...obj }

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***'
      }
    }

    return sanitized
  }
}
