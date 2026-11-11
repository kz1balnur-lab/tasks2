// Vercel serverless: POST /api/translate — тапсырма мәтінін орыс/ағылшын тіліне аудару
import { handleTranslate } from '../backend/providers.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const out = await handleTranslate(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  res.status(out.status).json(out.body);
}
