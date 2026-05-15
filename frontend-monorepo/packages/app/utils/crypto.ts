import nacl from 'tweetnacl';
import { encode, decode } from 'base64-js';

export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encode(keyPair.publicKey),
    privateKey: encode(keyPair.secretKey),
  };
};

export const encryptMessage = (jsonMessage: any, recipientPublicKey: string, myPrivateKey: string) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(JSON.stringify(jsonMessage));
  
  const encrypted = nacl.box(
    messageUint8,
    nonce,
    decode(recipientPublicKey),
    decode(myPrivateKey)
  );

  // We return the nonce + the encrypted data so the receiver can decrypt it
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return encode(fullMessage);
};

export const decryptMessage = (messageBase64: string, senderPublicKey: string, myPrivateKey: string) => {
  const fullMessage = decode(messageBase64);
  
  // Extract nonce and ciphertext
  const nonce = fullMessage.slice(0, nacl.box.nonceLength);
  const encrypted = fullMessage.slice(nacl.box.nonceLength);

  const decrypted = nacl.box.open(
    encrypted,
    nonce,
    decode(senderPublicKey),
    decode(myPrivateKey)
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt message: Decryption error or invalid keys.');
  }

  return JSON.parse(new TextDecoder().decode(decrypted));
};
