import { getRsaKeys } from '../config/keys';

console.log('--- Generating / Verifying RSA RS256 Keypair ---');
const keys = getRsaKeys();
if (keys.privateKey && keys.publicKey) {
  console.log(' RSA RS256 Keys verified successfully in ./keys directory.');
} else {
  console.error('❌ Failed to verify RSA RS256 Keys.');
  process.exit(1);
}
