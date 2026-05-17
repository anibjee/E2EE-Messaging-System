import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { decryptMessage, getOrCreateKeysForUser } from '../utils/crypto';
import { fetchPublicKey, registerUserOnServer, fetchChatHistory, fetchAllUsers } from '../utils/api';

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
  stompClient: any | null;
  typingUsers: Record<string, boolean>; // Maps usernames to true/false
  sendTypingEvent: (recipientId: string) => void;
  initializeSession: (username: string) => Promise<void>;
  connect: (userId: string) => void;
  sendMessage: (message: Message) => void;
  addMessage: (message: Message) => void;
  setKeys: (keys: { publicKey: string, privateKey: string }) => void;
  loadSecureHistory: (targetId: string) => Promise<void>;
  directory: string[];
  refreshDirectory: () => Promise<void>;
  destroySession: () => void;
  logout: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  userId: null,
  myKeys: null,
  isConnected: false,
  messages: [],
  stompClient: null,
  typingUsers: {},
  
  logout: () => {
    const { stompClient } = get();

    // Disconnect the active WebSocket thread cleanly
    if (stompClient) {
      try {
        stompClient.deactivate();
      } catch (err) {
        console.error("Error deactivating socket:", err);
      }
    }

    // Clear runtime UI state ONLY (Preserves localStorage cryptographic key vault)
    set({
      userId: null,
      messages: [],
      activeTarget: null,
      isConnected: false,
      stompClient: null,
      directory: [],
      typingUsers: {}
    } as any);

    console.log("🔒 Standard logout executed. Cryptographic vault remains locked on disk.");
  },
  
  destroySession: () => {
    const { stompClient, userId } = get();

    // 1. Cleanly deactivate the live WebSocket pipe
    if (stompClient) {
      try {
        stompClient.deactivate();
      } catch (err) {
        console.error("Error shutting down STOMP stream connection gracefully:", err);
      }
    }

    // 2. Target the active user's key strings directly
    if (userId) {
      localStorage.removeItem(`e2ee_keys_${userId}`);
      localStorage.removeItem(`e2ee_keys_${userId.toLowerCase()}`);
    }

    // 3. 💥 THE COMPLETE PURGE: Loop through ALL keys and burn anything prefixed with 'e2ee_'
    try {
      Object.keys(localStorage).forEach((storageKey) => {
        if (storageKey.startsWith('e2ee_')) {
          localStorage.removeItem(storageKey);
        }
      });
    } catch (e) {
      console.error("Failed to run full storage sweep:", e);
    }

    // 4. Reset memory states to default values
    set({
      userId: null,
      myKeys: null,
      messages: [],
      activeTarget: null,
      isConnected: false,
      stompClient: null,
      directory: [],
      typingUsers: {}
    } as any);

    console.log("🔥 THE BURNER PROTOCOL COMPLETED: All cryptographic namespaces systematically vaporized.");
  },
  
  sendTypingEvent: (recipientId: string) => {
    const { stompClient, userId } = get();
    if (stompClient?.connected && userId) {
      stompClient.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ senderId: userId, recipientId })
      });
    }
  },
  directory: [],

  refreshDirectory: async () => {
    try {
      const users = await fetchAllUsers(); 
      set({ directory: users });
    } catch (error) {
      console.error("Failed to load user directory", error);
    }
  },

  setKeys: (keys) => set({ myKeys: keys }),

  loadSecureHistory: async (targetId: string) => {
    const { userId, myKeys } = get();
    if (!userId || !myKeys) return;

    try {
      // 1. Fetch the raw encrypted archive from Spring Boot
      const historicalPayloads = await fetchChatHistory(userId, targetId);
      
      // 2. Fetch the TARGET'S public key ONCE (This is the missing magic key)
      const targetPubKey = await fetchPublicKey(targetId);

      // 3. Process every message
      const decryptedMessages = await Promise.all(
        historicalPayloads.map(async (msg: any) => {
          try {
            // Whether I sent it or they sent it, the shared secret uses MY private key and THEIR public key
            const plain = decryptMessage(msg.ciphertext, targetPubKey, myKeys.privateKey);
            
            // Swap the ciphertext for the translated plaintext
            return { ...msg, ciphertext: plain.text }; 
          } catch (decryptionError) {
            console.warn(`Could not decrypt message ${msg.id}. Keeping ciphertext.`);
            return msg; // Fallback to gibberish if keys don't match
          }
        })
      );

      set({ messages: decryptedMessages });
    } catch (err) {
      console.error("Could not populate archive stream", err);
    }
  },

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
    
    // We need an external variable to track the timeout so it resets correctly
    let typingTimeouts: Record<string, NodeJS.Timeout> = {};

    const client = new Client({
      webSocketFactory: () => socket as any,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      onConnect: () => {
        set({ isConnected: true, stompClient: client }); // 🟢 Save client to state
        console.log("🟢 Connected to Spring Boot WebSocket!");

        // 1. Existing Message Subscription
        client.subscribe(`/queue/chat/${userId}`, async (msg) => {
          const received = JSON.parse(msg.body);
          const { myKeys } = get();

          console.log("📥 LIVE PACKET ARRIVED:", received);

          if (myKeys) {
            try {
              // Fetch the sender's public key
              const senderPubKey = await fetchPublicKey(received.senderId);
              console.log(`🔑 Fetched Sender (${received.senderId}) PubKey:`, senderPubKey);
              
              // Attempt to unlock it
              const plain = decryptMessage(received.ciphertext, senderPubKey, myKeys.privateKey);
              received.ciphertext = plain.text; 
              console.log("✅ Live Decryption Success!");

            } catch (e) {
              // 🔴 THE SMOKING GUN: This will print EXACTLY why it failed
              console.error("❌ Live decryption failed! Details:", e);
              console.error("Ciphertext length:", received.ciphertext?.length);
            }
          }

          // Update the screen for the recipient
          set((state) => {
            // Prevent duplicate messages if the sender is also listening to the same queue
            const exists = state.messages.find(m => m.id === received.id);
            if (exists) return state;
            return { messages: [...state.messages, received] };
          });
        });

        // 2. 🟢 NEW: Typing Event Subscription
        client.subscribe(`/queue/typing/${userId}`, (msg) => {
          const { senderId } = JSON.parse(msg.body);
          
          // Set user as typing
          set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));

          // Clear previous timeout if they typed again quickly
          if (typingTimeouts[senderId]) clearTimeout(typingTimeouts[senderId]);

          // Automatically clear typing status after 2 seconds of silence
          typingTimeouts[senderId] = setTimeout(() => {
            set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: false } }));
          }, 2000);
        });
      },
      onDisconnect: () => {
        set({ isConnected: false });
        console.log('Disconnected from WebSocket.');
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
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
