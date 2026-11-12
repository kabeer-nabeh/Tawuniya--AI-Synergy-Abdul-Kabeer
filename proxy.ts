import { next } from '@vercel/functions';
import { demoGate } from './server/demo-gate.js';

export default async function proxy(request: Request) {
  const response = await demoGate(request);
  return response ?? next({ headers: { 'Cache-Control': 'private, no-store' } });
}
