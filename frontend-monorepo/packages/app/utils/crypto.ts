import nacl from 'tweetnacl';
import { fromByteArray, toByteArray } from 'base64-js';

interface KeyPairStrings {
  publicKey: string;
  privateKey: string;
}

/**
 * Generates a Curve25519 keypair for E2EE.
 */
export const generateKeyPair = (): KeyPairStrings => {
  const keyPair = nacl.box.keyPair();
  return {
    // fromByteArray converts Uint8Array to a Base64 string
    publicKey: fromByteArray(keyPair.publicKey),
    privateKey: fromByteArray(keyPair.secretKey),
  };
};

/**
 * Retrieves existing keys from localStorage or generates new ones if not found.
 */
export const getOrCreateKeysForUser = (username: string): KeyPairStrings => {
  if (typeof window === 'undefined') {
    return { publicKey: '', privateKey: '' }; // SSR safety check for Next.js
  }

  const storageKey = `e2ee_keys_${username.toLowerCase().trim()}`;
  const existingKeys = localStorage.getItem(storageKey);

  if (existingKeys) {
    console.log(`🔑 Retrieved cached E2EE keys for [${username}] from local storage.`);
    return JSON.parse(existingKeys);
  }

  // No keys found, generate a fresh cryptographic pair
  const freshKeys = generateKeyPair(); 
  localStorage.setItem(storageKey, JSON.stringify(freshKeys));
  console.log(`✨ Generated and cached fresh E2EE keys for new user [${username}].`);
  return freshKeys;
};

/**
 * Encrypts a message for a specific recipient.
 */
export const encryptMessage = (jsonMessage: any, recipientPublicKey: string, myPrivateKey: string) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(JSON.stringify(jsonMessage));
  
  const encrypted = nacl.box(
    messageUint8,
    nonce,
    toByteArray(recipientPublicKey), // toByteArray converts Base64 back to binary
    toByteArray(myPrivateKey)
  );

  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return fromByteArray(fullMessage);
};

/**
 * Decrypts a message from a sender.
 */
export const decryptMessage = (messageBase64: string, senderPublicKey: string, myPrivateKey: string) => {
  const fullMessage = toByteArray(messageBase64);
  
  const nonce = fullMessage.slice(0, nacl.box.nonceLength);
  const encrypted = fullMessage.slice(nacl.box.nonceLength);

  const decrypted = nacl.box.open(
    encrypted,
    nonce,
    toByteArray(senderPublicKey),
    toByteArray(myPrivateKey)
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt message: Decryption error or invalid keys.');
  }

  return JSON.parse(new TextDecoder().decode(decrypted));
};
