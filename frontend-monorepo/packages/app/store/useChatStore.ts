import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { decryptMessage, getOrCreateKeysForUser } from '../utils/crypto';
import { fetchPublicKey, registerUserOnServer } from '../utils/api';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
}

interface ChatState {
  userId: string | null;
  myKeys: { publicKey: string; privateKey: string } | null;
  isConnected: boolean;
  messages: Message[];
  stompClient: Client | null;
  initializeSession: (username: string) => Promise<void>;
  connect: (userId: string) => void;
  sendMessage: (message: Message) => void;
  addMessage: (message: Message) => void;
  setKeys: (keys: { publicKey: string, privateKey: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  userId: null,
  myKeys: null,
  isConnected: false,
  messages: [],
  stompClient: null,

  setKeys: (keys) => set({ myKeys: keys }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  initializeSession: async (username: string) => {
    const cleanUsername = username.trim();
    
    // 1. Get persistent or brand new keys
    const keys = getOrCreateKeysForUser(cleanUsername);
    
    set({ userId: cleanUsername, myKeys: keys });

    // 2. Register the public key with the Spring Boot server
    try {
      await registerUserOnServer(cleanUsername, keys.publicKey);
      console.log(`✅ ${cleanUsername} successfully synchronized with server phonebook.`);
    } catch (error) {
      console.error("Failed to register identity with backend", error);
    }

    // 3. Kick off the WebSocket connection
    get().connect(cleanUsername);
  },

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
