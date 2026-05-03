import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

const client = new Anthropic();

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

export async function POST(req: Request) {
  const { word } = await req.json();
  const key = `val:${word.toLowerCase().trim()}`;

  // Check Redis cache first — validated words never need re-checking
  if (redis) {
    const cached = await redis.get<string>(key);
    if (cached !== null) return Response.json({ ok: cached === '1' });
  }

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 5,
    system:
      'You are checking if a word or short phrase contains explicit profanity or graphic sexual content. Reply YES if the text is acceptable, NO only if it contains an actual swear word or explicit sexual phrase. Animals, objects, places, foods, weather, scientific terms, and all common dictionary words are always YES regardless of any secondary meanings they might have. When in doubt, reply YES.',
    messages: [{ role: 'user', content: word }],
  });

  const ok =
    msg.content[0].type === 'text' &&
    msg.content[0].text.trim().toUpperCase().startsWith('Y');

  if (redis && ok) await redis.set(key, '1');

  return Response.json({ ok });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
