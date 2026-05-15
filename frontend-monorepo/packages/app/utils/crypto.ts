import nacl from 'tweetnacl';
import { fromByteArray, toByteArray } from 'base64-js';

/**
 * Generates a Curve25519 keypair for E2EE.
 */
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    // fromByteArray converts Uint8Array to a Base64 string
    publicKey: fromByteArray(keyPair.publicKey),
    privateKey: fromByteArray(keyPair.secretKey),
  };
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
