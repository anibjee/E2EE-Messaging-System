import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
  connect: (userId: string) => void;
  sendMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  stompClient: null,
  isConnected: false,

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
        client.subscribe(`/user/${userId}/queue/messages`, (msg) => {
          const receivedMessage: Message = JSON.parse(msg.body);
          set((state) => ({ messages: [...state.messages, receivedMessage] }));
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
