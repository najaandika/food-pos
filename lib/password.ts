import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

const keyLength = 64;
const cost = 16384;
const blockSize = 8;
const parallelization = 1;

function deriveKey(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return { valid: password === storedHash, needsRehash: true };
  }

  const [, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] = parts;
  if (!costValue || !blockSizeValue || !parallelizationValue || !saltValue || !hashValue) {
    return { valid: false, needsRehash: false };
  }
  const parsedCost = Number(costValue);
  const parsedBlockSize = Number(blockSizeValue);
  const parsedParallelization = Number(parallelizationValue);
  if (!Number.isInteger(parsedCost) || !Number.isInteger(parsedBlockSize) || !Number.isInteger(parsedParallelization)) {
    return { valid: false, needsRehash: false };
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedHash = Buffer.from(hashValue, 'base64url');
  const derivedKey = await deriveKey(password, salt, expectedHash.length, {
    N: parsedCost,
    r: parsedBlockSize,
    p: parsedParallelization,
  });

  return {
    valid: derivedKey.length === expectedHash.length && timingSafeEqual(derivedKey, expectedHash),
    needsRehash: false,
  };
}
