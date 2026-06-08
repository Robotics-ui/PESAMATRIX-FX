// filename: src/lib/crypto.ts
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf-8'); 
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (ENCRYPTION_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes long');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (ENCRYPTION_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes long');
  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted text format');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
