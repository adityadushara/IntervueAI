import crypto from 'crypto';

/**
 * Computes a deterministic SHA-256 hash of an invitation token.
 * Requirement: The raw token is NEVER stored in the database.
 * Only this 64-character lowercase hex digest is persisted server-side.
 */
export function hashInvitationToken(rawToken: string): string {
  const normalized = rawToken.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Constant-time comparison to verify incoming raw token against stored token_hash.
 * Prevents timing side-channel attacks.
 */
export function verifyInvitationToken(rawToken: string, storedHash: string): boolean {
  try {
    const computed = hashInvitationToken(rawToken);
    const bufA = Buffer.from(computed, 'utf8');
    const bufB = Buffer.from(storedHash.trim().toLowerCase(), 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
