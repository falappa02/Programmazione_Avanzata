import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const keysDir = path.resolve(process.cwd(), 'keys');
const privateKeyPath = path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY_PATH || 'keys/jwt_private.pem');
const publicKeyPath = path.resolve(process.cwd(), process.env.JWT_PUBLIC_KEY_PATH || 'keys/jwt_public.pem');

/**
 * Singleton / Helper: Ensures RSA RS256 key pair exists or auto-generates key pair on initialization.
 */
export function getRsaKeys(): { privateKey: string; publicKey: string } {
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log('[KEYS] RSA key pair missing. Generating new 2048-bit RSA keys for RS256 JWT...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
    fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
    console.log('[KEYS] RSA key pair successfully generated and saved.');
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

  return { privateKey, publicKey };
}
