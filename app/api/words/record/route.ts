import { Redis } from '@upstash/redis';

export const revalidate = 0;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

export async function POST(req: Request) {
  if (!redis) return Response.json({ error: 'no redis' }, { status: 503 });

  const { winner, loser } = await req.json();
  if (!winner || !loser) return Response.json({ error: 'missing fields' }, { status: 400 });

  const w = winner.toLowerCase().trim();
  const l = loser.toLowerCase().trim();

  await Promise.all([
    redis.hincrby('word:plays', w, 1),
    redis.hincrby('word:plays', l, 1),
    redis.hincrby('word:wins', w, 1),
  ]);

  return Response.json({ ok: true });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
