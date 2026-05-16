import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useChatStore } from '../../store/useChatStore';
import { encryptMessage } from '../../utils/crypto';
import { fetchPublicKey } from '../../utils/api';

export function HomeScreen() {
  const { userId, messages, initializeSession, sendMessage, addMessage, isConnected, myKeys } = useChatStore();
  const [usernameInput, setUsernameInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [activeTarget, setActiveTarget] = useState(''); 
  const [inputText, setInputText] = useState('');

  const handleLogin = () => {
    if (usernameInput.trim()) {
      initializeSession(usernameInput);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !myKeys || !activeTarget) return;

    try {
      // 1. Ask the Java "Phonebook" for the other person's Public Key
      const recipientPubKey = await fetchPublicKey(activeTarget);

      // 2. Encrypt the message using THEIR Public Key + OUR Private Key
      const encrypted = encryptMessage({ text: inputText }, recipientPubKey, myKeys.privateKey);

      const newMessage = {
        id: Date.now().toString(),
        senderId: userId || 'unknown',
        recipientId: activeTarget,
        ciphertext: inputText, // SHOW PLAINTEXT LOCALLY
      };

      // 3. Send the ENCRYPTED version to the server
      sendMessage({ ...newMessage, ciphertext: encrypted });
      
      // 4. Add the PLAINTEXT version to your local screen
      addMessage(newMessage);

      setInputText('');
    } catch (e) {
      console.error("Encryption failed: Recipient probably hasn't registered yet.", e);
    }
  };

  // --- VIEW 1: LOGIN SPLASH SCREEN ---
  if (!userId) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>Secure E2EE Access</Text>
          <TextInput
            style={styles.loginInput}
            placeholder="Enter identity handle (e.g. Agent007)"
            placeholderTextColor="#888"
            value={usernameInput}
            onChangeText={setUsernameInput}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Initialize Key Vault</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- VIEW 2: ACTIVE CHAT SCREEN ---
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top Status Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          E2EE Chat — Identity: <Text style={{ color: '#0070f3' }}>{userId}</Text> {isConnected ? '🟢 (Online)' : '🔴 (Offline)'}
        </Text>
        
        {/* Recipient Target Configurator */}
        <View style={styles.targetArea}>
          <TextInput 
            placeholder="Target Recipient ID" 
            placeholderTextColor="#888"
            value={targetInput} 
            onChangeText={setTargetInput}
            style={styles.targetInput}
          />
          <TouchableOpacity 
            onPress={() => setActiveTarget(targetInput)}
            style={styles.targetButton}
          >
            <Text style={styles.targetButtonText}>Set Target</Text>
          </TouchableOpacity>
        </View>
        {activeTarget ? (
          <Text style={styles.targetStatus}>Locking payloads for: 🔐 {activeTarget}</Text>
        ) : null}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item.id + index.toString()}
        contentContainerStyle={styles.chatArea}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble, 
            item.senderId === userId ? styles.myBubble : styles.theirBubble
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
          placeholder={activeTarget ? "Type a message..." : "Set target first"}
          placeholderTextColor="#888"
          editable={!!activeTarget}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !activeTarget && { backgroundColor: '#444' }]} 
          onPress={handleSend}
          disabled={!activeTarget}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loginContainer: { 
    flex: 1, 
    backgroundColor: '#121212', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loginCard: { 
    backgroundColor: '#1e1e1e', 
    padding: 32, 
    borderRadius: 8, 
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8
  },
  loginTitle: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  loginInput: { 
    width: '100%', 
    padding: 12, 
    marginBottom: 16, 
    borderRadius: 4, 
    borderWidth: 1, 
    borderColor: '#333', 
    backgroundColor: '#2a2a2a', 
    color: '#fff' 
  },
  loginButton: { 
    width: '100%', 
    padding: 12, 
    borderRadius: 4, 
    backgroundColor: '#0070f3', 
    alignItems: 'center' 
  },
  loginButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  header: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderColor: '#222', 
    alignItems: 'center' 
  },
  headerText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  targetArea: { 
    flexDirection: 'row', 
    marginTop: 8, 
    alignItems: 'center' 
  },
  targetInput: { 
    padding: 8, 
    backgroundColor: '#222', 
    color: '#fff', 
    borderWidth: 1, 
    borderColor: '#444', 
    borderRadius: 4,
    width: 150,
    marginRight: 8
  },
  targetButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    backgroundColor: '#333', 
    borderRadius: 4 
  },
  targetButtonText: { 
    color: '#fff', 
    fontSize: 14 
  },
  targetStatus: { 
    fontSize: 12, 
    color: '#aaa', 
    marginTop: 4 
  },
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
