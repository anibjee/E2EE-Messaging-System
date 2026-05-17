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
  const response = await fetch(`${API_URL}/auth/user/${username}/key`);
  if (!response.ok) throw new Error("User not found");
  const data = await response.json();
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
