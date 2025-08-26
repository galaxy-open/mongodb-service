export default class DockerJsonParserService {
  parse(stdout: string): Record<string, any> | Record<string, any>[] | null {
    if (!stdout.trim()) {
      return null
    }

    try {
      // First, try parsing as complete JSON (for commands like inspect)
      return JSON.parse(stdout.trim()) as Record<string, any> | Record<string, any>[]
    } catch (error) {
      // If that fails, try parsing as JSON lines (for commands like ps, ls)
      try {
        const lines = stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim())

        if (lines.length === 0) {
          return null
        }

        if (lines.length === 1) {
          return JSON.parse(lines[0]) as Record<string, any>
        }

        // Multiple lines - parse each and filter out failures
        const parsedLines: Record<string, any>[] = lines
          .map((line, index) => {
            try {
              return JSON.parse(line) as Record<string, any>
            } catch (parseError) {
              console.warn(`Failed to parse line ${index + 1}: "${line}"`, parseError)
              return null
            }
          })
          .filter((item): item is Record<string, any> => item !== null)

        return parsedLines.length > 0 ? parsedLines : null
      } catch (linesError) {
        throw new Error(`Failed to parse Docker JSON output: ${error.message}`)
      }
    }
  }

  parseAsArray(stdout: string): Record<string, any>[] {
    const result = this.parse(stdout)

    if (!result) {
      return []
    }

    // Always return as array
    return Array.isArray(result) ? result : [result]
  }
}
