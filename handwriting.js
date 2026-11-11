// Vercel serverless: POST /api/handwriting — қолжазбаны тану (Mathpix / Claude / OpenAI)
import { handleHandwriting } from '../backend/providers.js';
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const out = await handleHandwriting(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  res.status(out.status).json(out.body);
}
