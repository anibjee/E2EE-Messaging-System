import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useChatStore } from '../../store/useChatStore';

// Hardcoded identities for our Tracer Bullet test
const MY_USER_ID = 'Agent007';
const TARGET_USER_ID = 'Agent008'; 

export function HomeScreen() {
  const { messages, connect, sendMessage, isConnected } = useChatStore();
  const [inputText, setInputText] = useState('');

  // Connect to the Java backend when the screen loads
  useEffect(() => {
    connect(MY_USER_ID);
  }, [connect]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    sendMessage({
      id: Date.now().toString(),
      senderId: MY_USER_ID,
      recipientId: TARGET_USER_ID,
      ciphertext: inputText, 
    });

    setInputText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          E2EE Chat {isConnected ? '🟢 (Online)' : '🔴 (Offline)'}
        </Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item.id + index.toString()}
        contentContainerStyle={styles.chatArea}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble, 
            item.senderId === MY_USER_ID ? styles.myBubble : styles.theirBubble
          ]}>
            <Text style={styles.senderName}>{item.senderId}</Text>
            <Text style={styles.messageText}>{item.ciphertext}</Text>
          </View>
        )}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', height: '100vh' },
  header: { padding: 20, backgroundColor: '#1e1e1e', borderBottomWidth: 1, borderColor: '#333' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  chatArea: { padding: 15, paddingBottom: 40 },
  bubble: { padding: 12, borderRadius: 8, marginBottom: 10, maxWidth: '80%' },
  myBubble: { backgroundColor: '#007aff', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: '#333', alignSelf: 'flex-start' },
  senderName: { color: '#ccc', fontSize: 10, marginBottom: 4 },
  messageText: { color: '#fff', fontSize: 16 },
  inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#1e1e1e', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#333', color: '#fff', padding: 12, borderRadius: 8, marginRight: 10 },
  sendButton: { backgroundColor: '#007aff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});
