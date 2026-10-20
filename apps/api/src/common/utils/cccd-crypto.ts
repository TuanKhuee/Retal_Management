import * as crypto from 'crypto';

export class CccdCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // Standard 96-bit IV for GCM
  private static readonly AUTH_TAG_LENGTH = 16;

  private static getKey(): Buffer {
    const rawKey =
      process.env.ENCRYPTION_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    // Ensure key is 32 bytes
    if (rawKey.length === 64) {
      return Buffer.from(rawKey, 'hex');
    }
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plain CCCD string using AES-256-GCM.
   * Returns: iv:authTag:ciphertext (base64 encoded)
   */
  static encrypt(plainText: string): string {
    if (!plainText) return '';
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = this.getKey();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM encrypted string.
   */
  static decrypt(cipherBundle: string): string {
    if (!cipherBundle) return '';
    const parts = cipherBundle.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted CCCD payload format');
    }

    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const key = this.getKey();

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Extracts last 4 digits of CCCD.
   */
  static extractLast4(cccd: string): string {
    if (!cccd) return '';
    const clean = cccd.replace(/\s+/g, '');
    return clean.slice(-4);
  }

  /**
   * Masks CCCD showing only last 4 digits (e.g., '********1234').
   */
  static maskCccd(cccd: string): string {
    if (!cccd) return '';
    const clean = cccd.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return '*'.repeat(clean.length - 4) + clean.slice(-4);
  }
}
