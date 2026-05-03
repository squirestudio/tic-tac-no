import { Redis } from '@upstash/redis';

export const maxDuration = 10;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const PLAYERS_SET = 'lb:players';
const playerKey  = (uuid: string) => `lb:${uuid}`;
const tagKey     = (tag: string)  => `lb:tag:${tag.toLowerCase()}`;
const rlKey      = (tag: string)  => `rl:signin:${tag.toLowerCase()}`;

const AI_RP = { easy: 50, medium: 200, hard: 450 } as const;

function calcRPChange(won: boolean, myRP: number, opponentRPs: number[]): number {
  if (opponentRPs.length === 0) return won ? 20 : -15;
  const avg = opponentRPs.reduce((a, b) => a + b, 0) / opponentRPs.length;
  const diff = avg - myRP;
  if (won) return Math.max(10, Math.min(60, Math.round(25 + diff / 10)));
  return -Math.max(5, Math.min(50, Math.round(20 - diff / 10)));
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ':' + salt);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: Request) {
  if (!redis) return Response.json({ error: 'no_db' }, { status: 500 });

  const body = await req.json() as
    | { action: 'fetch' }
    | { action: 'register'; uuid: string; gamertag: string; avatarUrl: string; pin: string }
    | { action: 'signin';   gamertag: string; pin: string }
    | { action: 'update';   uuid: string; gamertag: string; avatarUrl: string; won: boolean; opponentIds: ({ uuid: string } | { ai: 'easy' | 'medium' | 'hard' })[] };

  // ── fetch ──────────────────────────────────────────────────────────────────
  if (body.action === 'fetch') {
    const uuids = await redis.smembers<string[]>(PLAYERS_SET);
    if (!uuids || uuids.length === 0) return Response.json({});
    const entries = await Promise.all(uuids.map(async uuid => {
      const d = await redis!.hgetall(playerKey(uuid));
      if (!d) return null;
      return {
        uuid,
        gamertag:    String(d.gamertag    ?? ''),
        avatarUrl:   String(d.avatarUrl   ?? ''),
        wins:        parseInt(String(d.wins        ?? '0')),
        gamesPlayed: parseInt(String(d.gamesPlayed ?? '0')),
        rp:          parseInt(String(d.rp          ?? '0')) || 0,
      };
    }));
    const result: Record<string, object> = {};
    for (const e of entries) {
      if (e && e.gamesPlayed > 0) result[e.uuid] = e;
    }
    return Response.json(result);
  }

  // ── register ───────────────────────────────────────────────────────────────
  if (body.action === 'register') {
    const { uuid, gamertag, avatarUrl, pin } = body;
    if (!uuid || !gamertag || !pin) return Response.json({ error: 'invalid' }, { status: 400 });

    // Atomically claim the gamertag — SET NX prevents two concurrent registrations
    // from both passing a read-then-write uniqueness check.
    const claimed = await redis.set(tagKey(gamertag), uuid, { nx: true });
    if (!claimed) {
      // Key already exists — allow only if it belongs to this UUID (re-registration)
      const existingUUID = await redis.get<string>(tagKey(gamertag));
      if (existingUUID !== uuid) {
        return Response.json({ error: 'gamertag_taken' }, { status: 409 });
      }
    }

    const salt = generateSalt();
    const pinHash = await hashPin(pin, salt);
    await Promise.all([
      redis.sadd(PLAYERS_SET, uuid),
      redis.hset(playerKey(uuid), { gamertag, avatarUrl, pinHash, pinSalt: salt }),
    ]);
    return Response.json({ ok: true });
  }

  // ── signin ─────────────────────────────────────────────────────────────────
  if (body.action === 'signin') {
    const { gamertag, pin } = body;
    if (!gamertag || !pin) return Response.json({ error: 'invalid' }, { status: 400 });

    const attempts = await redis.get<number>(rlKey(gamertag));
    if (attempts !== null && attempts >= 5) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }

    const uuid = await redis.get<string>(tagKey(gamertag));
    if (!uuid) return Response.json({ error: 'not_found' }, { status: 404 });

    const d = await redis.hgetall(playerKey(uuid));
    if (!d) return Response.json({ error: 'not_found' }, { status: 404 });

    // Support both salted (new) and UUID-salted (legacy) hashes
    const salt = d.pinSalt ? String(d.pinSalt) : uuid;
    const pinHash = await hashPin(pin, salt);
    if (pinHash !== String(d.pinHash ?? '')) {
      const count = await redis.incr(rlKey(gamertag));
      if (count === 1) await redis.expire(rlKey(gamertag), 15 * 60);
      return Response.json({ error: 'wrong_pin' }, { status: 401 });
    }

    await redis.del(rlKey(gamertag));
    return Response.json({
      uuid,
      gamertag:  String(d.gamertag  ?? gamertag),
      avatarUrl: String(d.avatarUrl ?? ''),
    });
  }

  // ── update (stats) ─────────────────────────────────────────────────────────
  if (body.action === 'update') {
    const { uuid, gamertag, avatarUrl, won, opponentIds } = body;
    if (!uuid || !gamertag || typeof won !== 'boolean' || !Array.isArray(opponentIds)) {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    const key = playerKey(uuid);
    const current = await redis.hgetall(key);
    const currentRP = parseInt(String((current as Record<string, unknown>)?.rp ?? '0')) || 0;

    // Resolve opponent RPs server-side — never trust client-computed values
    const opponentRPs = await Promise.all(opponentIds.map(async opp => {
      if ('ai' in opp) return AI_RP[opp.ai];
      const d = await redis!.hgetall(playerKey(opp.uuid));
      return parseInt(String((d as Record<string, unknown>)?.rp ?? '0')) || 0;
    }));
    const rpChange = calcRPChange(won, currentRP, opponentRPs);
    const newRP = Math.max(0, currentRP + rpChange);

    await Promise.all([
      redis.sadd(PLAYERS_SET, uuid),
      redis.hset(key, { gamertag, avatarUrl, rp: newRP }),
      redis.hincrby(key, 'gamesPlayed', 1),
      won ? redis.hincrby(key, 'wins', 1) : Promise.resolve(0),
    ]);
    return Response.json({ ok: true, rp: newRP, rpChange });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
