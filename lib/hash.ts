import { createHash } from 'crypto'

/**
 * SHA-256 hash of a UTF-8 string.
 *
 * Used as the cache key for deduplication:
 * same extracted text -> same hash -> cache hit -> skip pipeline.
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
