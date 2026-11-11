// Vercel serverless: POST /api/chat — AI физика көмекшісі (кілт Vercel Environment Variables ішінде)
import { handleChat } from '../backend/providers.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const out = await handleChat(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  res.status(out.status).json(out.body);
}
