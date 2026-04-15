import axios from 'axios';

// In dev, Vite proxy forwards /api → localhost:5000. In prod, set VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

export async function sendMessage({ sessionId, message, disease, patientName, location }) {
  const res = await api.post('/chat', { sessionId, message, disease, patientName, location });
  return res.data;
}

export async function getSession(sessionId) {
  const res = await api.get(`/sessions/${sessionId}`);
  return res.data;
}

export async function clearSession(sessionId) {
  await api.delete(`/sessions/${sessionId}`);
}
