import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { decryptMessage } from '../utils/crypto';
import { fetchPublicKey } from '../utils/api';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
}

interface ChatState {
  messages: Message[];
  stompClient: Client | null;
  isConnected: boolean;
  myKeys: { publicKey: string, privateKey: string } | null;
  connect: (userId: string) => void;
  sendMessage: (message: Message) => void;
  setKeys: (keys: { publicKey: string, privateKey: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  stompClient: null,
  isConnected: false,
  myKeys: null,

  setKeys: (keys) => set({ myKeys: keys }),

  connect: (userId: string) => {
    // Connect to the Spring Boot SockJS endpoint
    const socket = new SockJS('http://localhost:8080/ws-chat');
    const client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      onConnect: () => {
        set({ isConnected: true });
        console.log('Connected to Spring Boot WebSocket!');

        // Subscribe to the private queue we defined in Java
        client.subscribe(`/user/${userId}/queue/messages`, async (msg) => {
          const received: Message = JSON.parse(msg.body);
          const { myKeys } = get();

          // If we have keys, attempt to decrypt. If not, show ciphertext.
          try {
            if (myKeys) {
              // 1. Fetch the SENDER'S public key from the Java "Phonebook"
              const senderPubKey = await fetchPublicKey(received.senderId);

              // 2. Use OUR Private Key + THEIR Public Key to decrypt
              const plain = decryptMessage(received.ciphertext, senderPubKey, myKeys.privateKey);
              
              // 3. Replace the gibberish with the actual text
              received.ciphertext = plain.text; 
            }
          } catch (e) {
            console.error("Decryption failed. Keeping ciphertext.", e);
          }

          set((state) => ({ messages: [...state.messages, received] }));
        });
      },
      onDisconnect: () => {
        set({ isConnected: false });
        console.log('Disconnected from WebSocket.');
      }
    });

    client.activate();
    set({ stompClient: client });
  },

  sendMessage: (message: Message) => {
    const { stompClient, isConnected } = get();
    if (stompClient && isConnected) {
      // Send the payload to the Java Controller's @MessageMapping
      stompClient.publish({
        destination: '/app/chat.private',
        body: JSON.stringify(message),
      });
      // Optimistically add it to the local UI
      set((state) => ({ messages: [...state.messages, message] }));
    } else {
      console.error('Cannot send message: WebSocket is not connected.');
    }
  },
}));
