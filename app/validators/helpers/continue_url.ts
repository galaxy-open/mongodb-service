export function validateContinueUrl(url: string | undefined): string | null {
  if (!url) return null

  // Handle relative URLs (internal redirects)
  if (url.startsWith('/')) {
    // Basic validation for relative URLs
    try {
      // Use a dummy base to validate the relative URL structure
      new URL(url, 'http://dummy.com')
      return url
    } catch {
      return null // Invalid relative URL
    }
  }

  // Handle absolute URLs
  try {
    const parsed = new URL(url)

    // Get allowed domains from environment or use safe defaults
    const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',') || [
      'localhost',
      '127.0.0.1',
    ]
    return allowedDomains.includes(parsed.hostname) ? url : null
  } catch {
    return null // Invalid URL
  }
}

export function sanitizeContinueUrl(url: string | undefined): string | null {
  const validated = validateContinueUrl(url)
  if (!validated) return null

  try {
    // For relative URLs, use a dummy base for parsing
    const parsed = validated.startsWith('/')
      ? new URL(validated, 'http://dummy.com')
      : new URL(validated)

    const dangerousParams = ['javascript:', 'data:', 'vbscript:']

    for (const param of dangerousParams) {
      if (parsed.href.toLowerCase().includes(param)) {
        return null
      }
    }

    return validated
  } catch {
    return null
  }
}
