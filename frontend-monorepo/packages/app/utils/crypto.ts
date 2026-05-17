import nacl from 'tweetnacl';
import { fromByteArray, toByteArray } from 'base64-js';

export const encodeBase64 = (arr: Uint8Array): string => fromByteArray(arr);
export const decodeBase64 = (s: string): Uint8Array => toByteArray(s);

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

// 1. Encrypt raw binary file using Hybrid Cryptography
export const encryptFilePayload = async (
  file: File,
  recipientPubKeyBase64: string,
  myPrivateKeyBase64: string
): Promise<string> => {
  // Convert inputs from Base64 strings to byte arrays
  const recipientPubKey = decodeBase64(recipientPubKeyBase64);
  const myPrivateKey = decodeBase64(myPrivateKeyBase64);

  // Read file bytes
  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);

  // STEP 1: Generate random symmetric key and nonce for the file
  const symmetricKey = nacl.randomBytes(nacl.secretbox.keyLength); // 32 bytes
  const fileNonce = nacl.randomBytes(nacl.secretbox.nonceLength);  // 24 bytes

  // STEP 2: Encrypt file data symmetrically
  const fileCiphertext = nacl.secretbox(fileBytes, fileNonce, symmetricKey);

  // STEP 3: Encrypt the symmetric key asymmetrically for the target recipient
  const boxNonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes
  const encryptedSymmetricKey = nacl.box(symmetricKey, boxNonce, recipientPubKey, myPrivateKey);

  // STEP 4: Package everything into a zero-knowledge transport payload string
  const payload = {
    isMedia: true,
    fileName: file.name,
    mimeType: file.type,
    fileNonce: encodeBase64(fileNonce),
    boxNonce: encodeBase64(boxNonce),
    encryptedKey: encodeBase64(encryptedSymmetricKey),
    fileData: encodeBase64(fileCiphertext),
  };

  return btoa(JSON.stringify(payload)); // Return as unified base64 packet
};

// 2. Decrypt a hybrid binary payload back into a viewable Data URI url
export const decryptFilePayload = (
  packedPayloadBase64: string,
  senderPubKeyBase64: string,
  myPrivateKeyBase64: string
): { url: string; fileName: string; mimeType: string } => {
  const rawJson = atob(packedPayloadBase64);
  const payload = JSON.parse(rawJson);

  const senderPubKey = decodeBase64(senderPubKeyBase64);
  const myPrivateKey = decodeBase64(myPrivateKeyBase64);
  
  const boxNonce = decodeBase64(payload.boxNonce);
  const encryptedKey = decodeBase64(payload.encryptedKey);
  const fileNonce = decodeBase64(payload.fileNonce);
  const fileData = decodeBase64(payload.fileData);

  // STEP 1: Open asymmetric wrapper to extract the one-time symmetric key
  const symmetricKey = nacl.box.open(encryptedKey, boxNonce, senderPubKey, myPrivateKey);
  if (!symmetricKey) throw new Error("Asymmetric key handshake decryption failed.");

  // STEP 2: Open symmetric lock to decrypt the raw file bytes
  const decryptedFileBytes = nacl.secretbox.open(fileData, fileNonce, symmetricKey);
  if (!decryptedFileBytes) throw new Error("Symmetric file decryption failed. Content corrupted.");

  // STEP 3: Reconstruct file object into a local blob URL for image rendering
  const blob = new Blob([decryptedFileBytes], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);

  return { url, fileName: payload.fileName, mimeType: payload.mimeType };
};
