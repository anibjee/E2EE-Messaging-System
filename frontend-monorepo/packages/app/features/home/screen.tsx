import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useChatStore } from '../../store/useChatStore';
import { encryptMessage } from '../../utils/crypto';
import { fetchPublicKey } from '../../utils/api';

export function HomeScreen() {
  const { userId, messages, initializeSession, sendMessage, addMessage, isConnected, myKeys, loadSecureHistory, directory, refreshDirectory, typingUsers, sendTypingEvent, stompClient } = useChatStore();
  const [usernameInput, setUsernameInput] = useState('');
  const [activeTarget, setActiveTarget] = useState(''); 
  const [inputText, setInputText] = useState('');

  // 1. WhatsApp-style Date Header Formatter (e.g., "17/05/2026")
  const formatDateHeader = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 2. WhatsApp-style Message Time Formatter (e.g., "10:46 pm")
  const formatTime = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    }).toLowerCase(); // Lowers "PM" to "pm" to match WhatsApp perfectly
  };

  // Fetch the directory when the chat screen loads
  useEffect(() => {
    if (userId) {
      refreshDirectory();
    }
  }, [userId, refreshDirectory]);

  // Trigger whenever the chat target switches or locks in
  useEffect(() => {
    if (userId && activeTarget) {
      loadSecureHistory(activeTarget);
    }
  }, [activeTarget, userId, loadSecureHistory]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (usernameInput.trim()) {
      initializeSession(usernameInput);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !myKeys || !activeTarget) return;

    try {
      // 1. Fetch target's lock and encrypt the payload
      const recipientPubKey = await fetchPublicKey(activeTarget);
      const encrypted = encryptMessage({ text: inputText }, recipientPubKey, myKeys.privateKey);

      // 2. Build the payload for the Java Server
      const serverPayload = {
        id: Date.now().toString(), // Temp ID
        senderId: userId as string,
        recipientId: activeTarget,
        ciphertext: encrypted,
      };

      // 3. Send encrypted payload down the WebSocket
      sendMessage(serverPayload);

      // 4. 🟢 FIX: Update your OWN screen immediately with PLAINTEXT
      useChatStore.setState((state) => ({
        messages: [...state.messages, { ...serverPayload, ciphertext: inputText }]
      }));

      setInputText('');
    } catch (e) {
      console.error("Failed to encrypt/send message:", e);
    }
  };

  // --- VIEW 1: LOGIN SPLASH SCREEN ---
  if (!userId) {
    return (
      <div style={{ 
        backgroundColor: '#0B0F19', 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: '#E2E8F0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background glow effect */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, rgba(11,15,25,0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }} />

        <form 
          onSubmit={handleLogin} 
          style={{ 
            backgroundColor: '#111827', 
            padding: '3rem 2.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)', 
            border: '1px solid #1E293B',
            width: '100%',
            maxWidth: '380px',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem', background: '#0F172A', padding: '1rem', borderRadius: '50%', border: '1px solid #1E293B' }}>
            🔐
          </div>
          
          <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC' }}>
            Secure E2EE Access
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
            Initialize your local cryptographic vault.
          </p>

          <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Identity Handle
            </label>
            <input
              type="text"
              placeholder="e.g. Agent007"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.85rem 1rem', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                backgroundColor: '#0F172A', 
                color: '#F8FAFC',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0EA5E9';
                e.target.style.boxShadow = '0 0 0 1px #0EA5E9';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '0.85rem', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)',
              transition: 'transform 0.1s ease, filter 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Initialize Key Vault
          </button>
        </form>
      </div>
    );
  }

  // --- VIEW 2: ACTIVE CHAT SCREEN ---
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0B0F19', color: '#E2E8F0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 🟢 LEFT SIDEBAR */}
      <div style={{ width: '280px', borderRight: '1px solid #1E293B', display: 'flex', flexDirection: 'column', backgroundColor: '#111827' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1E293B' }}>
          <h3 style={{ margin: 0, color: '#64748B', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>LOGGED IN AS</h3>
          <h2 style={{ margin: '0.25rem 0 0 0', color: '#38BDF8', fontSize: '1.5rem', fontWeight: 700 }}>{userId}</h2>
        </div>
        
        {/* Contact list wrapper */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          <h4 style={{ margin: '0.5rem 0 1rem 0.5rem', color: '#475569', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>SECURE CONTACTS</h4>
          
          {directory
            .filter((name) => name !== userId)
            .map((contactName) => (
              <div 
                key={contactName}
                onClick={() => {
                  setActiveTarget(contactName);
                  useChatStore.getState().loadSecureHistory(contactName);
                }}
                style={{
                  padding: '0.85rem 1rem',
                  marginBottom: '0.35rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: activeTarget === contactName ? '#0EA5E9' : 'transparent',
                  color: activeTarget === contactName ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease',
                  fontWeight: activeTarget === contactName ? '600' : '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
                onMouseEnter={(e) => {
                  if (activeTarget !== contactName) e.currentTarget.style.backgroundColor = '#1F2937';
                }}
                onMouseLeave={(e) => {
                  if (activeTarget !== contactName) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{activeTarget === contactName ? '🔓' : '🔐'}</span>
                {contactName}
              </div>
          ))}
        </div>

        {/* ⚙️ SIDEBAR FOOTER: CONTROL PANEL */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid #1E293B', backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          {/* 🔒 STANDARD LOG OUT */}
          <button
            onClick={() => useChatStore.getState().logout()}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#1E293B',
              color: '#E2E8F0',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1E293B'}
          >
            Sign Out
          </button>

          {/* 🔴 NUCLEAR SELF-DESTRUCT */}
          <button
            onClick={() => {
              const check = confirm(
                "🚨 CRITICAL WARNING:\n\nThis will permanently destroy your cryptographic keys on this machine. You will lose access to all current message archives permanently. Execute self-destruct?"
              );
              if (check) useChatStore.getState().destroySession();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #EF4444',
              backgroundColor: 'transparent',
              color: '#EF4444',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#EF4444';
            }}
          >
            💥 Self-Destruct Session
          </button>
        </div>
      </div>

      {/* 🔵 RIGHT MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0B0F19' }}>
        {activeTarget ? (
          <>
            {/* Header */}
            <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1E293B', backgroundColor: '#111827', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                backgroundColor: isConnected ? '#10B981' : '#EF4444', 
                boxShadow: `0 0 8px ${isConnected ? '#10B981' : '#EF4444'}` 
              }} />
              <h3 style={{ margin: 0, fontWeight: 500, color: '#E2E8F0', fontSize: '1.1rem' }}>
                Encrypted Session with <span style={{ color: '#38BDF8', fontWeight: 600 }}>{activeTarget}</span>
              </h3>
            </header>

            {/* Chat History List */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                // Tracking variable to detect date shifts between messages
                let lastDateString = "";

                return useChatStore.getState().messages.map((msg: any, idx) => {
                  const isMe = msg.senderId === userId;
                  
                  // Calculate date strings for comparison
                  const currentDateString = formatDateHeader(msg.timestamp);
                  const showDateHeader = currentDateString !== lastDateString;
                  
                  // Update tracking reference for the next loop iteration
                  lastDateString = currentDateString;

                  return (
                    <React.Fragment key={idx}>
                      
                      {/* 🟢 WHATSAPP-STYLE CENTERED DATE HEADER PILL */}
                      {showDateHeader && (
                        <div style={{
                          alignSelf: 'center',
                          backgroundColor: '#1F2937', // Slightly lighter slate gray for the pill
                          color: '#94A3B8',
                          padding: '0.45rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          margin: '1rem 0',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          border: '1px solid #374151',
                          letterSpacing: '0.05em'
                        }}>
                          {currentDateString}
                        </div>
                      )}

                      {/* THE STANDARD MESSAGE BUBBLE */}
                      <div style={{ 
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' : '#1E293B',
                        color: '#F8FAFC',
                        padding: '0.85rem 1.25rem',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        maxWidth: '65%',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        {/* Sender Label */}
                        <div style={{ fontSize: '0.7rem', color: isMe ? '#BAE6FD' : '#94A3B8', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {msg.senderId}
                        </div>
                        
                        {/* Decrypted Payload */}
                        <div style={{ fontSize: '0.95rem' }}>{msg.ciphertext}</div>
                        
                        {/* 🟢 WHATSAPP-STYLE INLINE TIMESTAMP */}
                        <div style={{ 
                          fontSize: '0.65rem', 
                          color: isMe ? '#BAE6FD' : '#64748B', 
                          textAlign: 'right',
                          marginTop: '4px',
                          fontWeight: 500
                        }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>

                    </React.Fragment>
                  );
                });
              })()}

              {/* 🟢 NEW: The Typing Indicator Animation */}
              {activeTarget && typingUsers[activeTarget] && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#1E293B', borderRadius: '18px', width: 'fit-content', opacity: 0.7 }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>{activeTarget} is typing...</span>
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #1E293B', backgroundColor: '#111827' }}>
               <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '1200px', margin: '0 auto' }}>
                 <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (activeTarget) sendTypingEvent(activeTarget); // 🟢 Broadcast typing event!
                    }}
                    placeholder="Type an encrypted message..."
                    style={{ 
                      flex: 1, 
                      padding: '1rem 1.25rem', 
                      borderRadius: '24px', 
                      border: '1px solid #334155', 
                      backgroundColor: '#0F172A', 
                      color: '#F8FAFC',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0EA5E9'}
                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 />
                 <button 
                  onClick={handleSend} 
                  style={{ 
                    padding: '0 1.75rem', 
                    borderRadius: '24px', 
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                 >
                   Send
                 </button>
               </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#475569', flexDirection: 'column', backgroundColor: '#0B0F19' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.8 }}>🛡️</div>
            <h2 style={{ color: '#E2E8F0', fontWeight: 600, marginBottom: '0.5rem' }}>End-to-End Encrypted</h2>
            <p style={{ color: '#94A3B8' }}>Select a contact from the sidebar to establish a secure channel.</p>
          </div>
        )}
      </div>
    </div>
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
