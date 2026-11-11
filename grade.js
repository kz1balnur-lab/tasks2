// Vercel serverless: POST /api/grade — еркін жауаптарды дескриптор бойынша AI арқылы алдын ала бағалау
import { handleGrade } from '../backend/providers.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const out = await handleGrade(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  res.status(out.status).json(out.body);
}
