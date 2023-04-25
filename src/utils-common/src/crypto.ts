import { createCipheriv, createDecipheriv, createHash } from 'crypto';

import { Json } from './json';
import { SHA256 } from './string';
import { getEnv } from './env';

export function encrypt(text: string, keyString: string, ivString: string, algorithm: string = 'aes-256-cbc') {
  const key = createHash('sha256').update(keyString).digest('base64').substring(0, 32);
  const cipher = createCipheriv(algorithm, key, ivString);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

export function decrypt(textHex: string, keyString: string, ivString: string, algorithm: string = 'aes-256-cbc') {
  const key = createHash('sha256').update(keyString).digest('base64').substring(0, 32);
  const text = Buffer.from(textHex, 'hex');
  const decipher = createDecipheriv(algorithm, key, ivString);
  let decrypted = decipher.update(text);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export function createDataHash(data: Json, publicKey?: string, privateKey?: string) {
  publicKey = publicKey ?? (getEnv('PLEXI_PUBLIC_KEY') as string | undefined) ?? '';
  privateKey = privateKey ?? (getEnv('PLEXI_PRIVATE_KEY') as string | undefined) ?? '';
  const text = JSON.stringify(data);
  const encryptedText = encrypt(text, privateKey, publicKey.substring(0, 16));
  return SHA256(encryptedText);
}

export function verifyDataHash(data: Json, hash: string, publicKey?: string, privateKey?: string) {
  return createDataHash(data, publicKey, privateKey) === hash;
}
