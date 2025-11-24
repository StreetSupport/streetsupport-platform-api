import crypto from 'crypto';

/**
 * Email encryption/decryption utilities
 * Matches the C# implementation using AES encryption
 * Key: 16 bytes (128-bit encryption)
 * IV: 16 bytes
 * Padding: PKCS7
 */

const ENCRYPTION_KEY = Buffer.alloc(16, 0); // 16 bytes for 128-bit encryption
const IV = Buffer.alloc(16, 0); // 16-byte IV

/**
 * Encrypt a plain text string to a Buffer
 * @param plainText - The text to encrypt
 * @returns Encrypted Buffer
 */
export function encryptEmail(plainText: string): Buffer {
  if (!plainText) {
    return Buffer.alloc(0);
  }
  
  const cipher = crypto.createCipheriv('aes-128-cbc', ENCRYPTION_KEY, IV);
  cipher.setAutoPadding(true); // PKCS7 padding
  
  let encrypted = cipher.update(plainText, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return encrypted;
}

/**
 * Decrypt a Buffer to a plain text string
 * @param encrypted - The encrypted Buffer
 * @returns Decrypted string or null if decryption fails
 */
export function decryptEmail(encrypted: Buffer | { type: string; data: number[] } | { buffer: Buffer } | string | any): string | null {
  try {
    if (!encrypted) {
      return null;
    }

    let buffer: Buffer;

    // Handle different input formats
    if (typeof encrypted === 'string') {
      // If it's already a plain string, return it
      return encrypted;
    } else if (Buffer.isBuffer(encrypted)) {
      buffer = encrypted;
    } else if (encrypted.buffer && Buffer.isBuffer(encrypted.buffer)) {
      // Handle BSON Binary format with buffer property
      buffer = encrypted.buffer;
    } else if (encrypted.type === 'Buffer' && Array.isArray(encrypted.data)) {
      // Handle MongoDB Binary format
      buffer = Buffer.from(encrypted.data);
    } else {
      console.error('Invalid encrypted email format:', typeof encrypted);
      return null;
    }

    if (buffer.length === 0) {
      return null;
    }

    const decipher = crypto.createDecipheriv('aes-128-cbc', ENCRYPTION_KEY, IV);
    decipher.setAutoPadding(true); // PKCS7 padding
    
    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error decrypting email:', error);
    return null;
  }
}

/**
 * Decrypt email from a user object
 * Handles different email field formats
 */
export function decryptUserEmail(emailField: Buffer | { type: string; data: number[] } | { buffer: Buffer } | string | any): string | null {
  return decryptEmail(emailField);
}
