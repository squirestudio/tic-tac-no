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
      'You are a content moderator for a family-friendly word battle game where players name objects, animals, forces of nature, and concepts that fight each other. Reply YES unless the word or phrase is itself explicit profanity, a racial or ethnic slur, or describes graphic sexual or torture content. Do not reject words because they have slang meanings — only reject them if the primary, literal meaning is offensive. Common nouns like animals, materials, weather, food, and physical objects are always YES.',
    messages: [{ role: 'user', content: word }],
  });

  const ok =
    msg.content[0].type === 'text' &&
    msg.content[0].text.trim().toUpperCase().startsWith('Y');

  if (redis) await redis.set(key, ok ? '1' : '0');

  return Response.json({ ok });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
