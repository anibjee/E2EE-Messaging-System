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
