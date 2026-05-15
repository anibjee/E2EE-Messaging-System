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
