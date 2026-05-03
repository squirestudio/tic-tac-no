import { Redis } from '@upstash/redis';

export const maxDuration = 10;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const PLAYERS_SET = 'lb:players';
const playerKey = (name: string) => `lb:${name}`;

export async function POST(req: Request) {
  if (!redis) return Response.json({});

  const body = await req.json() as { action: 'fetch' } | { action: 'update'; name: string; won: boolean; points: number };

  if (body.action === 'fetch') {
    const names = await redis.smembers<string[]>(PLAYERS_SET);
    if (!names || names.length === 0) return Response.json({});

    const entries = await Promise.all(
      names.map(async name => {
        const data = await redis!.hgetall(playerKey(name));
        if (!data) return null;
        return {
          name,
          wins: parseInt(String(data.wins ?? '0')),
          gamesPlayed: parseInt(String(data.gamesPlayed ?? '0')),
          totalPoints: parseInt(String(data.totalPoints ?? '0')),
        };
      })
    );

    const result: Record<string, { wins: number; gamesPlayed: number; totalPoints: number }> = {};
    for (const entry of entries) {
      if (entry && entry.gamesPlayed > 0) result[entry.name] = entry;
    }
    return Response.json(result);
  }

  if (body.action === 'update') {
    const { name, won, points } = body;
    if (!name || typeof won !== 'boolean' || typeof points !== 'number') {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    const key = playerKey(name);
    await Promise.all([
      redis.sadd(PLAYERS_SET, name),
      redis.hincrby(key, 'gamesPlayed', 1),
      won ? redis.hincrby(key, 'wins', 1) : Promise.resolve(0),
      won ? redis.hincrby(key, 'totalPoints', points) : Promise.resolve(0),
    ]);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
