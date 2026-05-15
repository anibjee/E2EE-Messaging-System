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
  addMessage: (message: Message) => void;
  setKeys: (keys: { publicKey: string, privateKey: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  stompClient: null,
  isConnected: false,
  myKeys: null,

  setKeys: (keys) => set({ myKeys: keys }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  connect: (userId: string) => {
    const socket = new SockJS('http://localhost:8080/ws-chat');
    const client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      onConnect: () => {
        set({ isConnected: true });
        console.log('Connected to Spring Boot WebSocket!');

        client.subscribe(`/user/${userId}/queue/messages`, async (msg) => {
          const received: Message = JSON.parse(msg.body);
          const { myKeys } = get();

          try {
            if (myKeys) {
              console.log(`🔓 Attempting to decrypt message from ${received.senderId}...`);
              const senderPubKey = await fetchPublicKey(received.senderId);
              const plain = decryptMessage(received.ciphertext, senderPubKey, myKeys.privateKey);
              received.ciphertext = plain.text;
              console.log("✅ Decryption successful!");
            }
          } catch (e) {
            console.error("❌ Decryption failed. Key mismatch likely.", e);
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
      stompClient.publish({
        destination: '/app/chat.private',
        body: JSON.stringify(message),
      });
    } else {
      console.error('Cannot send message: WebSocket is not connected.');
    }
  },
}));
