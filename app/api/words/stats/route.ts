import { Redis } from '@upstash/redis';

export const revalidate = 0;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

export async function GET(req: Request) {
  if (!redis) return Response.json({ error: 'no redis' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const minPlays = parseInt(searchParams.get('minPlays') ?? '10', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const [plays, wins] = await Promise.all([
    redis.hgetall('word:plays'),
    redis.hgetall('word:wins'),
  ]);

  if (!plays) return Response.json({ stats: [] });

  const stats = Object.entries(plays)
    .map(([word, playsVal]) => {
      const p = Number(playsVal);
      const w = Number((wins as Record<string, string> | null)?.[word] ?? 0);
      return { word, plays: p, wins: w, winRate: p > 0 ? Math.round((w / p) * 1000) / 10 : 0 };
    })
    .filter(s => s.plays >= minPlays)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);

  return Response.json({ stats });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
