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
      'You are a content moderator for a family-friendly word battle game. Players name objects, animals, and concepts that fight each other. Reply YES for any real word or phrase that is not itself profanity, a slur, or explicit sexual/graphic content. Common animals, objects, and natural phenomena should always be YES even if they could theoretically be misused in other contexts. Reply NO only for actual slurs, explicit profanity, or overtly sexual/violent phrases.',
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
