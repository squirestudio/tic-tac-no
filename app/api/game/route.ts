import { Redis } from '@upstash/redis';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const anthropic = new Anthropic();

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D'];
const GAME_TTL = 60 * 30;

type MpPlayer = { uuid: string; gamertag: string; avatarUrl: string; slot: number; color: string };
type Cell = { object: string; owner: number } | null;
type LastMove = {
  slot: number;
  action: string;
  type: 'placement' | 'battle';
  battleNarrative?: string;
  challenger?: string;
  challengerOwner?: number;
  defenderObject?: string;
  defenderOwner?: number;
  battleWinner?: string;
};
type GameState = {
  code: string;
  phase: 'waiting' | 'playing' | 'gameOver';
  players: MpPlayer[];
  board: Cell[];
  currentSlot: number;
  winner: number | null;
  lastMove: LastMove | null;
  hostUUID: string;
  updatedAt: number;
};

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board: Cell[]): number | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[b] && board[c] &&
        board[a]!.owner === board[b]!.owner &&
        board[b]!.owner === board[c]!.owner) {
      return board[a]!.owner;
    }
  }
  return null;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function gameKey(code: string) { return `mp:${code.toUpperCase()}`; }
function lockKey(code: string) { return `mp:lock:${code.toUpperCase()}`; }

async function getState(code: string): Promise<GameState | null> {
  if (!redis) return null;
  const raw = await redis.get<string | object>(gameKey(code));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw as GameState;
}

async function setState(state: GameState): Promise<void> {
  if (!redis) return;
  await redis.set(gameKey(state.code), JSON.stringify(state), { ex: GAME_TTL });
}

async function resolveBattle(challenger: string, defender: string): Promise<{ winner: string; narrative: string }> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: 'You are a battle referee and epic narrator. There are no ties — every battle has exactly one winner. First line must be exactly "WINNER: " followed by whichever word wins (copy it exactly). Then write a vivid 2-sentence battle narrative. Be creative — any concept can battle any other. Consider the nature of each thing literally and imaginatively.',
      messages: [{ role: 'user', content: `Battle: "${challenger}" vs "${defender}". Who wins? Declare the winner and narrate dramatically.` }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const lines = text.trim().split('\n');
    const match = lines[0].match(/^WINNER:\s*(.+)$/i);
    const winner = match ? match[1].trim() : challenger;
    const narrative = lines.slice(1).join('\n').trim();
    return { winner, narrative };
  } catch {
    return { winner: challenger, narrative: 'The battle raged, and a victor emerged from the chaos.' };
  }
}

export async function POST(req: Request) {
  if (!redis) return Response.json({ error: 'no_db' }, { status: 500 });

  const body = await req.json() as {
    action: string;
    code?: string;
    uuid?: string;
    gamertag?: string;
    avatarUrl?: string;
    slot?: number;
    index?: number;
    object?: string;
  };

  // ── create ─────────────────────────────────────────────────────────────────
  if (body.action === 'create') {
    const { uuid, gamertag, avatarUrl = '' } = body;
    if (!uuid || !gamertag) return Response.json({ error: 'invalid' }, { status: 400 });

    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      if (!(await redis.get(gameKey(code)))) break;
      code = generateCode();
    }

    const state: GameState = {
      code,
      phase: 'waiting',
      players: [{ uuid, gamertag, avatarUrl, slot: 0, color: COLORS[0] }],
      board: Array(9).fill(null),
      currentSlot: 0,
      winner: null,
      lastMove: null,
      hostUUID: uuid,
      updatedAt: Date.now(),
    };
    await setState(state);
    return Response.json({ code, slot: 0, color: COLORS[0] });
  }

  // ── join ───────────────────────────────────────────────────────────────────
  if (body.action === 'join') {
    const { code, uuid, gamertag, avatarUrl = '' } = body;
    if (!code || !uuid || !gamertag) return Response.json({ error: 'invalid' }, { status: 400 });

    const state = await getState(code);
    if (!state) return Response.json({ error: 'not_found' }, { status: 404 });
    if (state.phase !== 'waiting') return Response.json({ error: 'game_started' }, { status: 409 });
    if (state.players.length >= 3) return Response.json({ error: 'room_full' }, { status: 409 });

    const existing = state.players.find(p => p.uuid === uuid);
    if (existing) return Response.json({ code, slot: existing.slot, color: existing.color });

    const slot = state.players.length;
    state.players.push({ uuid, gamertag, avatarUrl, slot, color: COLORS[slot] });
    state.updatedAt = Date.now();
    await setState(state);
    return Response.json({ code, slot, color: COLORS[slot] });
  }

  // ── poll ───────────────────────────────────────────────────────────────────
  if (body.action === 'poll') {
    const { code } = body;
    if (!code) return Response.json({ error: 'invalid' }, { status: 400 });
    const state = await getState(code);
    if (!state) return Response.json({ error: 'not_found' }, { status: 404 });
    return Response.json(state);
  }

  // ── start ──────────────────────────────────────────────────────────────────
  if (body.action === 'start') {
    const { code, uuid } = body;
    if (!code || !uuid) return Response.json({ error: 'invalid' }, { status: 400 });

    const state = await getState(code);
    if (!state) return Response.json({ error: 'not_found' }, { status: 404 });
    if (state.hostUUID !== uuid) return Response.json({ error: 'not_host' }, { status: 403 });
    if (state.players.length < 2) return Response.json({ error: 'need_more_players' }, { status: 400 });
    if (state.phase !== 'waiting') return Response.json({ error: 'already_started' }, { status: 409 });

    state.phase = 'playing';
    state.updatedAt = Date.now();
    await setState(state);
    return Response.json({ ok: true });
  }

  // ── move ───────────────────────────────────────────────────────────────────
  if (body.action === 'move') {
    const { code, uuid, slot, index, object } = body;
    if (!code || !uuid || typeof slot !== 'number' || typeof index !== 'number' || !object) {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    if (slot < 0 || slot > 2 || index < 0 || index > 8) {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }

    // Acquire per-room lock to prevent concurrent move race conditions
    const acquired = await redis.set(lockKey(code), '1', { nx: true, ex: 10 });
    if (!acquired) return Response.json({ error: 'try_again' }, { status: 409 });

    try {
      const state = await getState(code);
      if (!state) return Response.json({ error: 'not_found' }, { status: 404 });
      if (state.phase !== 'playing') return Response.json({ error: 'not_playing' }, { status: 409 });
      if (state.currentSlot !== slot) return Response.json({ error: 'not_your_turn' }, { status: 403 });
      if (state.players[slot]?.uuid !== uuid) return Response.json({ error: 'unauthorized' }, { status: 403 });

      const board = [...state.board];
      const newCell: Cell = { object, owner: slot };
      let lastMove: LastMove;

      if (board[index] === null) {
        board[index] = newCell;
        lastMove = { slot, action: `Placed "${object}" on square ${index + 1}`, type: 'placement' };
      } else {
        const existing = board[index]!;
        const { winner: battleWinner, narrative } = await resolveBattle(object, existing.object);
        const challengerWon = battleWinner.toLowerCase() === object.toLowerCase();
        if (challengerWon) board[index] = newCell;
        lastMove = {
          slot,
          action: `"${object}" ${challengerWon ? 'defeated' : 'lost to'} "${existing.object}"`,
          type: 'battle',
          battleNarrative: narrative,
          challenger: object,
          challengerOwner: slot,
          defenderObject: existing.object,
          defenderOwner: existing.owner,
          battleWinner,
        };
      }

      const gameWinner = checkWinner(board);
      state.board = board;
      state.lastMove = lastMove;
      state.winner = gameWinner;
      state.phase = gameWinner !== null ? 'gameOver' : 'playing';
      state.currentSlot = gameWinner !== null ? state.currentSlot : (slot + 1) % state.players.length;
      state.updatedAt = Date.now();
      await setState(state);
      return Response.json({ ok: true, state });
    } finally {
      await redis.del(lockKey(code));
    }
  }

  // ── rematch ────────────────────────────────────────────────────────────────
  if (body.action === 'rematch') {
    const { code, uuid } = body;
    if (!code || !uuid) return Response.json({ error: 'invalid' }, { status: 400 });

    const state = await getState(code);
    if (!state) return Response.json({ error: 'not_found' }, { status: 404 });
    if (state.hostUUID !== uuid) return Response.json({ error: 'not_host' }, { status: 403 });
    if (state.phase !== 'gameOver') return Response.json({ error: 'not_game_over' }, { status: 409 });

    state.board = Array(9).fill(null);
    state.winner = null;
    state.currentSlot = 0;
    state.lastMove = null;
    state.phase = 'waiting';
    state.updatedAt = Date.now();
    await setState(state);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
