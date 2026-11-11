// Vercel serverless: GET /api/health — қай қызметтер қосулы екенін көрсетеді (кілттерді көрсетпейді)
import { health } from '../backend/providers.js';
export default function handler(req, res) {
  const out = health();
  res.status(out.status).json(out.body);
}
