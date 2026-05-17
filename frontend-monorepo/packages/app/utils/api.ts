const API_URL = 'http://localhost:8080/api/v1';

export const registerUserOnServer = async (username: string, publicKey: string) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, publicKey }),
  });
  return response.json();
};

export const fetchPublicKey = async (username: string) => {
  const cacheKey = `e2ee_public_key_${username.toLowerCase().trim()}`;
  
  // 1. Try to read from local cache first (Self-healing E2EE recovery gate)
  if (typeof window !== 'undefined') {
    const cachedKey = localStorage.getItem(cacheKey);
    if (cachedKey) {
      console.log(`🔑 Recovered public key for target [${username}] from local browser cache.`);
      return cachedKey;
    }
  }

  // 2. Fallback to server registry fetch
  const response = await fetch(`${API_URL}/auth/user/${username}/key`);
  if (!response.ok) throw new Error("User not found");
  const data = await response.json();
  
  // 3. Cache the newly discovered public key and contact name in local storage
  if (typeof window !== 'undefined' && data.publicKey) {
    localStorage.setItem(cacheKey, data.publicKey);
    console.log(`💾 Cached newly discovered public key for [${username}] in browser storage.`);
    
    try {
      const cachedContactsRaw = localStorage.getItem('e2ee_contacts');
      let cachedContacts: string[] = [];
      if (cachedContactsRaw) {
        cachedContacts = JSON.parse(cachedContactsRaw);
      }
      if (!cachedContacts.includes(username)) {
        cachedContacts.push(username);
        localStorage.setItem('e2ee_contacts', JSON.stringify(cachedContacts));
      }
    } catch (e) {
      console.error("Failed to update e2ee_contacts cache:", e);
    }
  }

  return data.publicKey;
};

export const fetchChatHistory = async (user1: string, user2: string) => {
  const response = await fetch(`${API_URL}/messages/history?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);
  if (!response.ok) {
    throw new Error('Failed to retrieve historical archives.');
  }
  return await response.json(); // Array of Message objects
};

export const fetchAllUsers = async (): Promise<string[]> => {
  const response = await fetch('http://localhost:8080/api/v1/auth/users');
  if (!response.ok) {
    throw new Error('Failed to retrieve user directory.');
  }
  return await response.json();
};
