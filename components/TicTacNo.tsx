'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, Crown, ArrowLeft, Send } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

// Replace with real AdMob IDs before App Store submission
const ADMOB_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910';

type Player = { id: number; name: string; isAI: boolean; color: string; difficulty: 'easy' | 'medium' | 'hard'; profileUUID?: string; profileAvatarUrl?: string };
type Cell = { object: string; owner: number } | null;
type BattleAnimation = {
  challenger: string;
  challengerOwner: number;
  defenderObject: string;
  defenderOwner: number;
  winner: string;
};
type PlayerStats = { wins: number; gamesPlayed: number; rp: number; gamertag: string; avatarUrl: string };
type LeaderboardData = { [uuid: string]: PlayerStats };
type Profile = { uuid: string; gamertag: string; avatarWord: string; avatarUrl: string; pinSet?: boolean };
type MpPlayer = { uuid: string; gamertag: string; avatarUrl: string; slot: number; color: string };
type RemoteLastMove = { slot: number; action: string; type: 'placement' | 'battle'; battleNarrative?: string; challenger?: string; challengerOwner?: number; defenderObject?: string; defenderOwner?: number; battleWinner?: string };
type RemoteGameState = { code: string; phase: 'waiting' | 'playing' | 'gameOver'; players: MpPlayer[]; board: Cell[]; currentSlot: number; winner: number | null; lastMove: RemoteLastMove | null; hostUUID: string; updatedAt: number };

const AI_NAMES = {
  easy:   ['Kai', 'Tailor', 'Aiko'],
  medium: ['Raiden', 'Cairo', 'Zaire', 'Jaime'],
  hard:   ['Gaia', 'Saint', 'Draith', 'Vail'],
};

const pickAIName = (difficulty: 'easy' | 'medium' | 'hard') => {
  const pool = AI_NAMES[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
};

const AI_WORDS = {
  easy: [
    'feather', 'bubble', 'noodle', 'dandelion', 'tissue', 'cotton', 'puddle',
    'pebble', 'smoke', 'drizzle', 'yawn', 'marshmallow', 'slime', 'snowflake', 'fog',
    'petal', 'leaf', 'dewdrop', 'cobweb', 'candle', 'pillow', 'mitten', 'button',
    'ribbon', 'confetti', 'chalk', 'crayon', 'napkin', 'sponge', 'raindrop',
    'breeze', 'whisper', 'hiccup', 'sneeze', 'giggle', 'pudding', 'lollipop',
    'cupcake', 'sprinkle', 'jellybean', 'daisy', 'butterfly', 'ladybug', 'hamster',
    'goldfish', 'tadpole', 'caterpillar', 'dust bunny', 'yarn', 'toothpick', 'straw',
    'popsicle', 'balloon', 'kite', 'pinwheel', 'moth', 'sparrow', 'snail', 'worm',
    'mushroom', 'acorn', 'twig', 'ice cube', 'snowball', 'mist', 'dew', 'steam',
    'cookie', 'crumb', 'fluff', 'wisp', 'soap', 'cotton candy', 'paper clip',
    'rubber band', 'wet noodle', 'soggy cracker', 'empty bottle', 'bath sponge',
    'wind chime', 'paper boat', 'origami crane', 'bubble wrap', 'lint', 'speck',
    'teardrop', 'dandelion seed', 'flower crown', 'daydream', 'hiccup', 'sunbeam',
    'rainbow', 'cloud', 'kitten', 'puppy', 'hamster wheel', 'bouncy ball',
  ],
  medium: [
    'fire', 'water', 'lightning', 'shadow', 'sword', 'ice', 'stone', 'tornado',
    'acid', 'wind', 'plague', 'rust', 'mirror', 'magnet', 'earthquake',
    'volcano', 'avalanche', 'tsunami', 'hurricane', 'blizzard', 'wildfire',
    'flood', 'sandstorm', 'whirlpool', 'landslide', 'poison', 'venom', 'curse',
    'spell', 'arrow', 'spear', 'axe', 'shield', 'armor', 'cannon', 'laser',
    'chainsaw', 'dragon', 'wolf', 'bear', 'shark', 'eagle', 'viper', 'scorpion',
    'panther', 'rhino', 'crocodile', 'thorn', 'quicksand', 'trapdoor', 'minotaur',
    'golem', 'vampire', 'werewolf', 'wraith', 'demon', 'inferno', 'glacier',
    'tidal wave', 'geyser', 'meteor', 'plasma', 'napalm', 'radiation',
    'solar flare', 'sonic boom', 'shockwave', 'black ice', 'lava', 'magma',
    'thunder', 'hailstorm', 'earthquake', 'wildfire', 'blight', 'miasma',
    'famine', 'drought', 'eclipse', 'tremor', 'comet', 'gamma ray', 'emp pulse',
    'uranium', 'mercury', 'acid rain', 'permafrost', 'landmine', 'catapult',
    'trebuchet', 'battering ram', 'ballista', 'flamethrower', 'grenade',
    'kraken', 'hydra', 'basilisk', 'chimera', 'gorgon', 'cyclops', 'banshee',
  ],
  hard: [
    'black hole', 'entropy', 'void', 'supernova', 'time', 'gravity', 'antimatter',
    'singularity', 'dark energy', 'oblivion', 'infinity', 'absolute zero', 'event horizon', 'heat death',
    'dark matter', 'neutron star', 'gamma burst', 'vacuum decay', 'time dilation',
    'causality', 'paradox', 'dimensional rift', 'multiverse', 'big bang',
    'false vacuum', 'quantum foam', 'hawking radiation', 'spaghettification',
    'quasar', 'magnetar', 'pulsar', 'proton decay', 'planck time',
    'quantum tunneling', 'decoherence', 'superposition', 'annihilation',
    'omnicide', 'the nothing', 'eternal darkness', 'maximum entropy',
    'arrow of time', 'wormhole', 'white hole', 'cosmic string', 'tachyon',
    'dimensional collapse', 'reality erasure', 'primordial chaos', 'endless abyss',
    'universal silence', 'chronoshift', 'null space', 'quantum erasure',
    'spacetime tear', 'infinite recursion', 'total entropy', 'cosmic horror',
    'eldritch void', 'the beyond', 'dead universe', 'cold void', 'the last light',
    'omega point', 'causal horizon', 'vacuum energy', 'zero-point field',
    'nothingness', 'stellar collapse', 'photon decay', 'false dawn',
    'heat equalization', 'the great filter', 'fermi paradox', 'roko basilisk',
    'simulation end', 'entropy maximum', 'time reversal', 'closed timelike curve',
    'chronological end', 'the final entropy', 'void singularity', 'existential null',
    'cosmic inflation', 'planck epoch', 'de sitter space', 'dark era',
    'degenerate era', 'black dwarf', 'iron star', 'the last photon',
    'heat death echo', 'quantum gravity', 'loop quantum', 'string theory end',
  ],
};

// Returns a cell index where `player` would win if they owned it — includes occupied cells.
function findWinMove(board: Cell[], player: number): number | null {
  for (let idx = 0; idx < 9; idx++) {
    if (board[idx]?.owner === player) continue;
    const test = [...board];
    test[idx] = { object: '_', owner: player };
    if (checkWinner(test) === player) return idx;
  }
  return null;
}

function findOptimalSpot(board: Cell[], playerIndex: number, allPlayers: Player[]): number {
  const win = findWinMove(board, playerIndex);
  if (win !== null) return win;

  for (const opp of allPlayers.filter(p => p.id !== playerIndex)) {
    const block = findWinMove(board, opp.id);
    if (block !== null) return block;
  }

  // Prefer center → corners → edges; battle for position if needed
  for (const idx of [4, 0, 2, 6, 8, 1, 3, 5, 7]) {
    if (board[idx]?.owner !== playerIndex) return idx;
  }

  return 0;
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const LEADERBOARD_KEY = 'tat_leaderboard';
const PROFILE_KEY = 'tat_profile';

function generateUUID() {
  try { return crypto.randomUUID(); }
  catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

const AI_RP = { easy: 50, medium: 200, hard: 450 } as const;

function calcRPChange(won: boolean, myRP: number, opponentRPs: number[]): number {
  if (opponentRPs.length === 0) return won ? 20 : -15;
  const avg = opponentRPs.reduce((a, b) => a + b, 0) / opponentRPs.length;
  const diff = avg - myRP;
  if (won) return Math.max(10, Math.min(60, Math.round(25 + diff / 10)));
  return -Math.max(5, Math.min(50, Math.round(20 - diff / 10)));
}

type RankInfo = { tier: 'bronze' | 'silver' | 'gold'; level: 1 | 2 | 3; label: string; minRP: number; maxRP: number };
const RANKS: RankInfo[] = [
  { tier: 'bronze', level: 1, label: 'Bronze I',   minRP: 0,   maxRP: 99   },
  { tier: 'bronze', level: 2, label: 'Bronze II',  minRP: 100, maxRP: 199  },
  { tier: 'bronze', level: 3, label: 'Bronze III', minRP: 200, maxRP: 299  },
  { tier: 'silver', level: 1, label: 'Silver I',   minRP: 300, maxRP: 399  },
  { tier: 'silver', level: 2, label: 'Silver II',  minRP: 400, maxRP: 499  },
  { tier: 'silver', level: 3, label: 'Silver III', minRP: 500, maxRP: 599  },
  { tier: 'gold',   level: 1, label: 'Gold I',     minRP: 600, maxRP: 699  },
  { tier: 'gold',   level: 2, label: 'Gold II',    minRP: 700, maxRP: 799  },
  { tier: 'gold',   level: 3, label: 'Gold III',   minRP: 800, maxRP: Infinity },
];

function getRank(rp: number): RankInfo {
  return RANKS.find(r => rp >= r.minRP && rp <= r.maxRP) ?? RANKS[0];
}

const TIER_DISPLAY = {
  gold:   { emoji: '🥇', color: '#FFD700' },
  silver: { emoji: '🥈', color: '#C0C0C0' },
  bronze: { emoji: '🥉', color: '#CD7F32' },
};

function checkWinner(board: Cell[]) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[b] && board[c] &&
        board[a]!.owner === board[b]!.owner &&
        board[b]!.owner === board[c]!.owner) {
      return board[a]!.owner;
    }
  }
  return null;
}

export default function TicTacNo() {
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'gameOver'>('setup');
  const [uiVisible, setUiVisible] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'Player 1', isAI: false, color: '#FF6B6B', difficulty: 'medium' },
    { id: 1, name: 'Player 2', isAI: true,  color: '#4ECDC4', difficulty: 'medium' },
    { id: 2, name: 'Player 3', isAI: true,  color: '#FFE66D', difficulty: 'medium' },
  ]);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [objectInput, setObjectInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [battleLog, setBattleLog] = useState<Array<{ challenger: string; defender: string; winner: string; spot: number }>>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [battleAnimation, setBattleAnimation] = useState<BattleAnimation | null>(null);
  const [battleNarrative, setBattleNarrative] = useState('');
  const [lastMove, setLastMove] = useState<{ player: string; action: string; type: string } | null>(null);
  const [wordError, setWordError] = useState('');
  const pendingContinuationRef = useRef<(() => void) | null>(null);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const pendingImages = useRef<Set<string>>(new Set());
  const validationCache = useRef<Map<string, boolean>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const gamesPlayedRef = useRef(0);
  const interstitialReadyRef = useRef(false);

  // Multiplayer state
  const [gameMode, setGameMode] = useState<'local' | 'multiplayer'>('local');
  const [mySlot, setMySlot] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [mpPhase, setMpPhase] = useState<'idle' | 'lobby' | 'waiting'>('idle');
  const [mpPlayers, setMpPlayers] = useState<MpPlayer[]>([]);
  const [mpIsHost, setMpIsHost] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpLoading, setMpLoading] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const gameModeRef = useRef<'local' | 'multiplayer'>('local');
  const mySlotRef = useRef<number | null>(null);
  const roomCodeRef = useRef('');
  const lastSeenUpdatedAt = useRef(0);
  const lastShownBattleAt = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollFailCountRef = useRef(0);
  const [mpConnectionLost, setMpConnectionLost] = useState(false);

  useEffect(() => {
    if (selectedCell !== null && !players[currentPlayer].isAI) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedCell, currentPlayer, players]);

  useEffect(() => {
    if (gamePhase === 'setup') {
      setUiVisible(false);
      const timer = setTimeout(() => setUiVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase]);

  useEffect(() => {
    (async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.initialize({ testingDevices: ['38fb9eede2a049e7edc2b60ac79bc09e'] });
        await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: true });
        interstitialReadyRef.current = true;
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
        if (gamePhase === 'playing' || gamePhase === 'gameOver') {
          await AdMob.showBanner({
            adId: ADMOB_BANNER_ID,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: true,
          });
        } else {
          await AdMob.hideBanner();
        }
      } catch {}
    })();
  }, [gamePhase]);

  const [profile, setProfile] = useState<Profile | null>(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null'); }
    catch { return null; }
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [psGamertag, setPsGamertag] = useState('');
  const [psAvatarWord, setPsAvatarWord] = useState('');
  const [psAvatarUrl, setPsAvatarUrl] = useState('');
  const [psPin, setPsPin] = useState('');
  const [psConfirmPin, setPsConfirmPin] = useState('');
  const [psError, setPsError] = useState('');
  const [psGenerating, setPsGenerating] = useState(false);
  const [psSaving, setPsSaving] = useState(false);

  const [showSignIn, setShowSignIn] = useState(false);
  const [signingInIdx, setSigningInIdx] = useState<number | null>(null);
  const [siGamertag, setSiGamertag] = useState('');
  const [siPin, setSiPin] = useState('');
  const [siError, setSiError] = useState('');
  const [siLoading, setSiLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(() => {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '{}'); }
    catch { return {}; }
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [myRPDelta, setMyRPDelta] = useState<number | null>(null);
  const [setupStep, setSetupStep] = useState<'mode' | 'config'>('mode');
  const lbContainerRef = useRef<HTMLDivElement>(null);
  const lbUserRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLeaderboard) return;
    // Wait one frame for the DOM to render, then center the user's row
    const id = requestAnimationFrame(() => {
      const container = lbContainerRef.current;
      const row = lbUserRowRef.current;
      if (!container || !row) return;
      container.scrollTop = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [showLeaderboard]);

  // Fetch global leaderboard on mount and when leaderboard modal opens
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch' }),
      });
      if (!res.ok) return;
      const data: LeaderboardData = await res.json();
      setLeaderboard(data);
      try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data)); } catch {}
    } catch {}
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const syncFromRemote = useCallback((state: RemoteGameState) => {
    lastSeenUpdatedAt.current = state.updatedAt;

    const newPlayers: Player[] = state.players.map(mp => ({
      id: mp.slot,
      name: mp.gamertag,
      isAI: false,
      color: mp.color,
      difficulty: 'medium' as const,
      profileUUID: mp.uuid,
      profileAvatarUrl: mp.avatarUrl,
    }));

    if (state.phase === 'waiting') {
      setMpPlayers(state.players);
      return;
    }

    if (state.phase === 'playing' || state.phase === 'gameOver') {
      setPlayers(newPlayers);
      setBoard(state.board);
      setCurrentPlayer(state.currentSlot);

      if (state.lastMove) {
        setLastMove({
          player: newPlayers[state.lastMove.slot]?.name ?? '',
          action: state.lastMove.action,
          type: state.lastMove.type,
        });
      }

      if (state.phase === 'gameOver') {
        setWinner(state.winner);
        setGamePhase('gameOver');
        setIsGenerating(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }

      // Show battle overlay if there's a new battle we haven't displayed
      if (state.lastMove?.type === 'battle' && state.updatedAt !== lastShownBattleAt.current) {
        lastShownBattleAt.current = state.updatedAt;
        const lm = state.lastMove;
        setBattleAnimation({
          challenger: lm.challenger ?? '',
          challengerOwner: lm.challengerOwner ?? 0,
          defenderObject: lm.defenderObject ?? '',
          defenderOwner: lm.defenderOwner ?? 0,
          winner: lm.battleWinner ?? '',
        });
        setBattleNarrative(lm.battleNarrative ?? '');
        pendingContinuationRef.current = () => {
          setBattleAnimation(null);
          setBattleNarrative('');
          setIsGenerating(false);
        };
      } else if (state.lastMove?.type !== 'battle') {
        setIsGenerating(false);
      }

      // Transition from waiting room to playing
      setMpPhase('idle');
      setGamePhase('playing');
    }
  }, []);

  // Polling effect
  useEffect(() => {
    if (!roomCode || gameMode !== 'multiplayer') return;

    const doPoll = async () => {
      try {
        const res = await fetch(`${API}/api/game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', code: roomCode }),
        });
        if (!res.ok) {
          pollFailCountRef.current += 1;
          if (pollFailCountRef.current >= 3) setMpConnectionLost(true);
          return;
        }
        pollFailCountRef.current = 0;
        setMpConnectionLost(false);
        const state: RemoteGameState = await res.json();
        if (state.updatedAt === lastSeenUpdatedAt.current) return;
        syncFromRemote(state);
      } catch {
        pollFailCountRef.current += 1;
        if (pollFailCountRef.current >= 3) setMpConnectionLost(true);
      }
    };

    pollRef.current = setInterval(doPoll, 2000);
    doPoll(); // immediate first poll
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomCode, gameMode, syncFromRemote]);

  useEffect(() => {
    if (!profile) setShowProfileSetup(true);
  }, [profile]);

  // Auto-link device profile to Player 1 when returning to setup
  useEffect(() => {
    if (gamePhase === 'setup' && profile) {
      setPlayers(prev => prev.map((p, i) =>
        i === 0 && !p.isAI
          ? { ...p, name: profile.gamertag, profileUUID: profile.uuid, profileAvatarUrl: profile.avatarUrl }
          : p
      ));
    }
  }, [gamePhase, profile]);

  useEffect(() => {
    if (gamePhase !== 'gameOver' || winner === null) return;

    const signedInPlayers = players.filter(p => !p.isAI && p.profileUUID);
    if (signedInPlayers.length === 0) return;

    const posts = signedInPlayers.map(p => {
      const playerIdx = players.indexOf(p);
      const won = playerIdx === winner;
      const myRP = leaderboard[p.profileUUID!]?.rp ?? 0;
      const opponentRPs = players
        .filter((_, i) => i !== playerIdx)
        .map(opp => opp.isAI ? AI_RP[opp.difficulty] : (opp.profileUUID && leaderboard[opp.profileUUID] ? leaderboard[opp.profileUUID].rp : 100));
      const rpChange = calcRPChange(won, myRP, opponentRPs);

      if (p.profileUUID === profile?.uuid) setMyRPDelta(rpChange);

      return fetch(`${API}/api/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', uuid: p.profileUUID, gamertag: p.name, avatarUrl: p.profileAvatarUrl ?? '', won, rpChange }),
      });
    });

    Promise.all(posts).then(() => fetchLeaderboard()).catch(() => {});

    // Optimistic local update
    setLeaderboard(prev => {
      const next = { ...prev };
      signedInPlayers.forEach(p => {
        const playerIdx = players.indexOf(p);
        const won = playerIdx === winner;
        const uuid = p.profileUUID!;
        const myRP = next[uuid]?.rp ?? 0;
        const opponentRPs = players
          .filter((_, i) => i !== playerIdx)
          .map(opp => opp.isAI ? AI_RP[opp.difficulty] : (opp.profileUUID && next[opp.profileUUID] ? next[opp.profileUUID].rp : 100));
        const rpChange = calcRPChange(won, myRP, opponentRPs);
        const s = next[uuid] ?? { wins: 0, gamesPlayed: 0, rp: 0, gamertag: p.name, avatarUrl: p.profileAvatarUrl ?? '' };
        next[uuid] = { ...s, wins: s.wins + (won ? 1 : 0), gamesPlayed: s.gamesPlayed + 1, rp: Math.max(0, myRP + rpChange) };
      });
      try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, winner]);

  const CACHE_KEY = 'ttn_image_cache';
  const [imageCache, setImageCache] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    } catch { return {}; }
  });

  const fetchImage = useCallback((word: string) => {
    const key = word.toLowerCase();
    if (imageCache[key] || pendingImages.current.has(key)) return;
    pendingImages.current.add(key);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    fetch(`${API}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(({ url }) => {
        clearTimeout(timeout);
        setImageCache(prev => {
          const next = { ...prev, [key]: url };
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        pendingImages.current.delete(key);
      })
      .catch(() => {
        clearTimeout(timeout);
        pendingImages.current.delete(key);
        // retry once after a short delay
        setTimeout(() => fetchImage(word), 2000);
      });
  }, [imageCache]);

  const dismissBattleOverlay = useCallback(() => {
    if (pendingContinuationRef.current) {
      pendingContinuationRef.current();
      pendingContinuationRef.current = null;
    }
  }, []);

  const fetchBattleNarrative = useCallback(async (
    challenger: string,
    defender: string,
    onWinner: (winner: string) => void,
  ) => {
    setBattleNarrative('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let winnerParsed = false;
    try {
      const response = await fetch(`${API}/api/battle-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenger, defender }),
        signal: controller.signal,
      });
      if (!response.body) { onWinner(challenger); return; }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (!winnerParsed) {
          buffer += chunk;
          const nlIdx = buffer.indexOf('\n');
          if (nlIdx !== -1) {
            const firstLine = buffer.slice(0, nlIdx).trim();
            const match = firstLine.match(/^WINNER:\s*(.+)$/i);
            onWinner(match ? match[1].trim() : challenger);
            winnerParsed = true;
            const rest = buffer.slice(nlIdx + 1).trimStart();
            if (rest) setBattleNarrative(rest);
          }
        } else {
          setBattleNarrative(prev => prev + chunk);
        }
      }

      if (!winnerParsed) onWinner(challenger);
    } catch (e) {
      if (!winnerParsed) onWinner(challenger);
      setBattleNarrative(
        e instanceof Error && e.name === 'AbortError'
          ? 'The battle was too intense to chronicle in time...'
          : 'The battle raged, and a victor emerged from the chaos.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const placePiece = useCallback((index: number, object: string, playerMakingMove: number, currentBoard: Cell[]) => {
    if (gamePhase !== 'playing') return;
    setIsGenerating(true);
    fetchImage(object);
    if (currentBoard[index] !== null) fetchImage(currentBoard[index]!.object);

    setTimeout(() => {
      const newCell: Cell = { object, owner: playerMakingMove };
      usedWordsRef.current.add(object.toLowerCase());

      if (currentBoard[index] === null) {
        const newBoard = [...currentBoard];
        newBoard[index] = newCell;
        setBoard(newBoard);
        setLastMove({ player: players[playerMakingMove].name, action: `Placed "${object}" on square ${index + 1}`, type: 'placement' });

        const gameWinner = checkWinner(newBoard);
        if (gameWinner !== null) {
          setWinner(gameWinner);
          setGamePhase('gameOver');
          setIsGenerating(false);
        } else {
          const next = (playerMakingMove + 1) % players.length;
          setCurrentPlayer(next);
          setSelectedCell(null);
          setObjectInput('');
          setIsGenerating(false);
          if (players[next].isAI) {
            setTimeout(() => makeAIMove(next, newBoard), 1500);
          }
        }
      } else {
        const existing = currentBoard[index]!;

        setBattleAnimation({
          challenger: object,
          challengerOwner: playerMakingMove,
          defenderObject: existing.object,
          defenderOwner: existing.owner,
          winner: '',
        });

        fetchBattleNarrative(object, existing.object, (winnerWord) => {
          const challengerWon = winnerWord.toLowerCase() === object.toLowerCase();
          const newBoard = [...currentBoard];
          if (challengerWon) newBoard[index] = newCell;
          setBoard(newBoard);
          setBattleAnimation(prev => prev ? { ...prev, winner: winnerWord } : null);

          pendingContinuationRef.current = () => {
            setBattleLog(prev => [...prev, {
              challenger: object,
              defender: existing.object,
              winner: winnerWord,
              spot: index,
            }]);
            setBattleAnimation(null);
            setBattleNarrative('');
            setLastMove({
              player: players[playerMakingMove].name,
              action: `"${object}" ${challengerWon ? 'defeated' : 'lost to'} "${existing.object}"`,
              type: 'battle',
            });

            const gameWinner = checkWinner(newBoard);
            if (gameWinner !== null) {
              setWinner(gameWinner);
              setGamePhase('gameOver');
              setIsGenerating(false);
            } else {
              const next = (playerMakingMove + 1) % players.length;
              setCurrentPlayer(next);
              setSelectedCell(null);
              setObjectInput('');
              setIsGenerating(false);
              if (players[next].isAI) {
                setTimeout(() => makeAIMove(next, newBoard), 1500);
              }
            }
          };
        });
      }
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, players, fetchBattleNarrative, fetchImage]);

  const makeAIMove = useCallback((aiPlayerIndex: number, currentBoard: Cell[]) => {
    const attackable = currentBoard
      .map((cell, idx) => (cell?.owner !== aiPlayerIndex ? idx : null))
      .filter((idx): idx is number => idx !== null);
    if (attackable.length === 0) return;

    const { difficulty } = players[aiPlayerIndex];
    const words = AI_WORDS[difficulty];
    const available = words.filter(w => !usedWordsRef.current.has(w.toLowerCase()));
    const wordPool = available.length > 0 ? available : words;
    const obj = wordPool[Math.floor(Math.random() * wordPool.length)];

    const empty = attackable.filter(idx => currentBoard[idx] === null);
    const occupied = attackable.filter(idx => currentBoard[idx] !== null);
    const strategicPositions = [4, 0, 2, 6, 8, 1, 3, 5, 7];

    let spot: number;
    if (difficulty === 'easy') {
      // 20% chance to attack a random occupied cell, otherwise prefer empty
      if (occupied.length > 0 && Math.random() < 0.2) {
        spot = occupied[Math.floor(Math.random() * occupied.length)];
      } else {
        const pool = empty.length > 0 ? empty : occupied;
        spot = pool[Math.floor(Math.random() * pool.length)];
      }
    } else if (difficulty === 'medium') {
      const win = findWinMove(currentBoard, aiPlayerIndex);
      const block = (() => {
        for (const opp of players.filter(p => p.id !== aiPlayerIndex)) {
          const b = findWinMove(currentBoard, opp.id);
          if (b !== null) return b;
        }
        return null;
      })();
      // 50% chance to attack a strategic occupied cell rather than take empty
      const strategicOccupied = strategicPositions.find(idx => currentBoard[idx] !== null && currentBoard[idx]!.owner !== aiPlayerIndex);
      const attackStrategic = strategicOccupied !== undefined && Math.random() < 0.5;
      spot = win ?? block ?? (attackStrategic ? strategicOccupied! : (empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : occupied[Math.floor(Math.random() * occupied.length)]));
    } else {
      // Hard: always plays optimally, prefers attacking human cells at key positions
      const win = findWinMove(currentBoard, aiPlayerIndex);
      if (win !== null) {
        spot = win;
      } else {
        const block = (() => {
          for (const opp of players.filter(p => p.id !== aiPlayerIndex)) {
            const b = findWinMove(currentBoard, opp.id);
            if (b !== null) return b;
          }
          return null;
        })();
        if (block !== null) {
          spot = block;
        } else {
          // Take the best strategic position — attack occupied over empty when position is key
          const bestSpot = strategicPositions.find(idx => currentBoard[idx] !== null && currentBoard[idx]!.owner !== aiPlayerIndex)
            ?? strategicPositions.find(idx => currentBoard[idx] === null)
            ?? attackable[0];
          spot = bestSpot;
        }
      }
    }

    placePiece(spot, obj, aiPlayerIndex, currentBoard);
  }, [placePiece, players]);

  const resetGame = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setGameMode('local'); gameModeRef.current = 'local';
    setMySlot(null); mySlotRef.current = null;
    setRoomCode(''); roomCodeRef.current = '';
    setMpPhase('idle'); setMpPlayers([]); setMpIsHost(false);
    lastSeenUpdatedAt.current = 0; lastShownBattleAt.current = 0;
    pollFailCountRef.current = 0; setMpConnectionLost(false);
    setGamePhase('setup');
    setBoard(Array(9).fill(null));
    setCurrentPlayer(0);
    setSelectedCell(null);
    setObjectInput('');
    setBattleLog([]);
    setWinner(null);
    setBattleAnimation(null);
    setBattleNarrative('');
    setLastMove(null);
    setMyRPDelta(null);
    setSetupStep('mode');
    pendingContinuationRef.current = null;
    usedWordsRef.current = new Set();
    pendingImages.current = new Set();
  };

  const restartGame = () => {
    const emptyBoard: Cell[] = Array(9).fill(null);
    setBoard(emptyBoard);
    setCurrentPlayer(0);
    setSelectedCell(null);
    setObjectInput('');
    setBattleLog([]);
    setWinner(null);
    setBattleAnimation(null);
    setBattleNarrative('');
    setLastMove(null);
    pendingContinuationRef.current = null;
    usedWordsRef.current = new Set();
    if (players[0].isAI) setTimeout(() => makeAIMove(0, emptyBoard), 500);
  };

  const submitMpMove = useCallback(async (index: number, object: string) => {
    if (!roomCodeRef.current || mySlotRef.current === null || !profile) return;
    setIsGenerating(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${API}/api/game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'move', code: roomCodeRef.current, uuid: profile.uuid, slot: mySlotRef.current, index, object }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'try_again' && attempt < 2) {
            await new Promise(r => setTimeout(r, 300));
            continue;
          }
          setIsGenerating(false);
          return;
        }
        syncFromRemote(data.state);
        return;
      } catch {
        setIsGenerating(false);
        return;
      }
    }
    setIsGenerating(false);
  }, [profile, syncFromRemote]);

  const submitWord = useCallback(async () => {
    const word = objectInput.trim();
    if (!word || isGenerating || selectedCell === null) return;
    setIsGenerating(true);
    const wordKey = word.toLowerCase().trim();
    const cachedResult = validationCache.current.get(wordKey);
    if (cachedResult === false) {
      setWordError("That word isn't allowed — please try something else.");
      setIsGenerating(false);
      return;
    }
    if (cachedResult === undefined) {
      try {
        const res = await fetch(`${API}/api/validate-word`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word }),
        });
        const { ok } = await res.json();
        validationCache.current.set(wordKey, ok);
        if (!ok) {
          setWordError("That word isn't allowed — please try something else.");
          setIsGenerating(false);
          return;
        }
      } catch {
        // if validation fails open, allow through
      }
    }
    if (gameModeRef.current === 'multiplayer') {
      await submitMpMove(selectedCell, word);
      setSelectedCell(null);
      setObjectInput('');
    } else {
      placePiece(selectedCell, word, currentPlayer, board);
    }
  }, [objectInput, isGenerating, selectedCell, currentPlayer, board, placePiece, submitMpMove]);

  // Keep refs in sync with state for use in callbacks
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { mySlotRef.current = mySlot; }, [mySlot]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  const createRoom = useCallback(async () => {
    if (!profile) return;
    setMpLoading(true); setMpError('');
    try {
      const res = await fetch(`${API}/api/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', uuid: profile.uuid, gamertag: profile.gamertag, avatarUrl: profile.avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setMpError('Failed to create room.'); setMpLoading(false); return; }
      setRoomCode(data.code);
      setMySlot(data.slot);
      setMpIsHost(true);
      setGameMode('multiplayer');
      setMpPlayers([{ uuid: profile.uuid, gamertag: profile.gamertag, avatarUrl: profile.avatarUrl, slot: 0, color: data.color }]);
      setMpPhase('waiting');
      lastSeenUpdatedAt.current = 0;
    } catch { setMpError('Connection error. Try again.'); }
    setMpLoading(false);
  }, [profile]);

  const joinRoom = useCallback(async () => {
    if (!profile || joinCodeInput.length < 6) return;
    setMpLoading(true); setMpError('');
    try {
      const res = await fetch(`${API}/api/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code: joinCodeInput.trim(), uuid: profile.uuid, gamertag: profile.gamertag, avatarUrl: profile.avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMpError(data.error === 'not_found' ? 'Room not found.' : data.error === 'room_full' ? 'Room is full.' : data.error === 'game_started' ? 'Game already started.' : 'Failed to join.');
        setMpLoading(false); return;
      }
      setRoomCode(data.code);
      setMySlot(data.slot);
      setMpIsHost(false);
      setGameMode('multiplayer');
      setMpPhase('waiting');
      lastSeenUpdatedAt.current = 0;
    } catch { setMpError('Connection error. Try again.'); }
    setMpLoading(false);
  }, [profile, joinCodeInput]);

  const startMultiplayerGame = useCallback(async () => {
    if (!profile || !roomCode) return;
    setMpLoading(true); setMpError('');
    try {
      const res = await fetch(`${API}/api/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', code: roomCode, uuid: profile.uuid }),
      });
      if (!res.ok) { setMpError('Failed to start.'); }
    } catch { setMpError('Connection error.'); }
    setMpLoading(false);
  }, [profile, roomCode]);

  const leaveRoom = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setRoomCode(''); setMySlot(null); setGameMode('local'); setMpPhase('lobby');
    setMpPlayers([]); setMpIsHost(false); setMpError(''); setJoinCodeInput('');
    lastSeenUpdatedAt.current = 0; pollFailCountRef.current = 0; setMpConnectionLost(false);
  }, []);

  // ── Profile Setup ──────────────────────────────────────────────────────────
  if (showProfileSetup) {
    const isEdit = !!profile;
    const pinOk = psPin.length === 4 && (!isEdit || psPin === psConfirmPin) && (isEdit || psPin === psConfirmPin);
    const canSave = psGamertag.trim().length > 0 && psAvatarUrl.length > 0 && pinOk && !psSaving;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: '#000', paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-sm">
          <img src="/logo.png" alt="Tic Attack Toe" className="h-28 mx-auto mb-8" />
          <h2 className="text-2xl font-black text-white text-center mb-1">{isEdit ? 'Edit Profile' : 'Create Your Profile'}</h2>
          <p className="text-white/40 text-sm text-center mb-8">{isEdit ? 'Update your gamertag and avatar' : 'Set up your gamertag and battle avatar'}</p>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">Gamertag</label>
              <input
                type="text"
                value={psGamertag}
                onChange={e => setPsGamertag(e.target.value)}
                placeholder="Enter your gamertag"
                maxLength={20}
                style={{ fontSize: '16px' }}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">Avatar Word</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={psAvatarWord}
                  onChange={e => { setPsAvatarWord(e.target.value); setPsAvatarUrl(''); }}
                  placeholder="e.g. dragon, phoenix, robot"
                  maxLength={24}
                  style={{ fontSize: '16px' }}
                  className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none placeholder-gray-500"
                />
                <button
                  onClick={async () => {
                    if (!psAvatarWord.trim() || psGenerating) return;
                    setPsGenerating(true);
                    try {
                      const res = await fetch(`${API}/api/generate-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ word: psAvatarWord.trim() }),
                      });
                      const data = await res.json();
                      if (data.url) setPsAvatarUrl(data.url);
                    } catch {}
                    setPsGenerating(false);
                  }}
                  disabled={!psAvatarWord.trim() || psGenerating}
                  className="bg-purple-600 text-white font-bold px-4 rounded-xl disabled:opacity-50 shrink-0">
                  {psGenerating ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '⚡'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">
                  {isEdit ? 'New PIN' : 'PIN'} (4 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={psPin}
                  onChange={e => { setPsPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPsError(''); }}
                  placeholder="••••"
                  style={{ fontSize: '16px' }}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none placeholder-gray-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={psConfirmPin}
                  onChange={e => { setPsConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPsError(''); }}
                  placeholder="••••"
                  style={{ fontSize: '16px' }}
                  className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 outline-none placeholder-gray-500 ${psConfirmPin && psPin !== psConfirmPin ? 'border-red-500' : 'border-purple-400'}`}
                />
              </div>
            </div>

            {psAvatarUrl ? (
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-purple-400 shadow-lg shadow-purple-500/30">
                  <img src={psAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-white/30 text-sm text-center">Generate<br/>avatar ⚡</span>
                </div>
              </div>
            )}

            {psError && <p className="text-red-400 text-sm text-center">{psError}</p>}

            <button
              onClick={async () => {
                if (!canSave) return;
                setPsSaving(true);
                const uuid = profile?.uuid ?? generateUUID();
                try {
                  const res = await fetch(`${API}/api/leaderboard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', uuid, gamertag: psGamertag.trim(), avatarUrl: psAvatarUrl, pin: psPin }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setPsError(data.error === 'gamertag_taken' ? 'That gamertag is taken — choose another.' : 'Something went wrong. Try again.');
                    setPsSaving(false);
                    return;
                  }
                } catch {
                  // offline — save locally anyway, will register when online
                }
                const newProfile: Profile = { uuid, gamertag: psGamertag.trim(), avatarWord: psAvatarWord.trim(), avatarUrl: psAvatarUrl, pinSet: true };
                localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
                setProfile(newProfile);
                setPsPin(''); setPsConfirmPin(''); setPsSaving(false);
                setShowProfileSetup(false);
              }}
              disabled={!canSave}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl disabled:opacity-40 transition-all">
              {psSaving ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Save & Play'}
            </button>

            {isEdit && (
              <button onClick={() => setShowProfileSetup(false)}
                className="w-full py-3 text-white/50 font-bold text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Multiplayer Lobby ──────────────────────────────────────────────────────
  if (mpPhase === 'lobby') {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: '#000', paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-sm">
          <img src="/logo.png" alt="Tic Attack Toe" className="h-28 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white text-center mb-6">Multiplayer</h2>
          {profile && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 mb-6">
              {profile.avatarUrl && <img src={profile.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-purple-400" />}
              <div>
                <p className="text-white font-bold text-sm">{profile.gamertag}</p>
                <p className="text-white/40 text-xs">Playing as you</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <button onClick={createRoom} disabled={mpLoading || !profile}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl disabled:opacity-40">
              {mpLoading && !joinCodeInput ? 'Creating...' : 'Create Room'}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/30 text-sm">or join</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
            <div className="flex gap-2">
              <input
                value={joinCodeInput}
                onChange={e => { setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setMpError(''); }}
                placeholder="ROOM CODE"
                maxLength={6}
                style={{ fontSize: '16px' }}
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none text-center font-black tracking-widest placeholder-gray-600"
              />
              <button onClick={joinRoom} disabled={mpLoading || joinCodeInput.length < 6 || !profile}
                className="bg-purple-600 text-white font-bold px-5 rounded-xl disabled:opacity-40">
                {mpLoading && joinCodeInput ? '...' : 'Join'}
              </button>
            </div>
            {mpError && <p className="text-red-400 text-sm text-center">{mpError}</p>}
            {!profile && <p className="text-yellow-400 text-sm text-center">Create a profile first to play multiplayer.</p>}
            <button onClick={() => { setMpPhase('idle'); setMpError(''); setJoinCodeInput(''); }}
              className="w-full py-3 text-white/40 font-bold text-sm">Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Multiplayer Waiting Room ───────────────────────────────────────────────
  if (mpPhase === 'waiting') {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: '#000', paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        {mpConnectionLost && (
          <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-center text-sm py-2 font-bold animate-pulse"
            style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            Connection lost — trying to reconnect...
          </div>
        )}
        <div className="w-full max-w-sm">
          <img src="/logo.png" alt="Tic Attack Toe" className="h-28 mx-auto mb-6" />
          <h2 className="text-xl font-black text-white text-center mb-2">Waiting Room</h2>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center mb-5">
            <p className="text-white/40 text-xs mb-1 uppercase tracking-widest">Room Code</p>
            <p className="text-5xl font-black text-white tracking-[0.2em]">{roomCode}</p>
            <p className="text-white/30 text-xs mt-2">Share with your opponents</p>
          </div>
          <div className="space-y-2 mb-5">
            {mpPlayers.map(p => (
              <div key={p.uuid} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `${p.color}20`, border: `2px solid ${p.color}40` }}>
                {p.avatarUrl
                  ? <img src={p.avatarUrl} alt={p.gamertag} className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
                  : <div className="w-8 h-8 rounded-full bg-white/10" />}
                <span className="text-white font-bold text-sm">{p.gamertag}</span>
                {p.uuid === profile?.uuid && <span className="text-white/40 text-xs ml-auto font-bold">YOU</span>}
              </div>
            ))}
            {Array.from({ length: 3 - mpPlayers.length }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-white/10">
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <span className="text-white/25 text-sm">Waiting for player...</span>
              </div>
            ))}
          </div>
          {mpIsHost && mpPlayers.length >= 2 ? (
            <button onClick={startMultiplayerGame} disabled={mpLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl mb-3 disabled:opacity-40">
              {mpLoading ? 'Starting...' : `Start Game (${mpPlayers.length} players)`}
            </button>
          ) : (
            <p className="text-white/40 text-sm text-center mb-3 animate-pulse">
              {mpIsHost ? 'Waiting for at least one more player...' : 'Waiting for host to start...'}
            </p>
          )}
          {mpError && <p className="text-red-400 text-sm text-center mb-2">{mpError}</p>}
          <button onClick={leaveRoom} className="w-full py-3 text-white/30 text-sm font-bold">Leave Room</button>
        </div>
      </div>
    );
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (gamePhase === 'setup') {
    return (
      <>
      <div className="h-[100dvh] bg-cover bg-center bg-no-repeat flex flex-col justify-end px-4"
        style={{ backgroundImage: 'url(/bg.png)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="max-w-2xl mx-auto w-full">

          {/* ── Mode selection ── */}
          {setupStep === 'mode' && (
            <div className={`bg-slate-900/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 transition-opacity duration-700 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="px-5 pt-5 pb-5 space-y-4">
                {/* Profile row */}
                <div className="flex items-center justify-between">
                  {profile ? (
                    <div className="flex items-center gap-3">
                      {profile.avatarUrl && <img src={profile.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-purple-400" />}
                      <div>
                        <p className="text-white font-bold text-sm">{profile.gamertag}</p>
                        {(() => {
                          const rp = leaderboard[profile.uuid]?.rp ?? 0;
                          const rank = getRank(rp);
                          return <p className="text-xs font-bold" style={{ color: TIER_DISPLAY[rank.tier].color }}>{rank.label} · {rp} RP</p>;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">No profile</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { fetchLeaderboard(); setShowLeaderboard(true); }} className="text-xl">🏆</button>
                    <button onClick={() => {
                      setPsGamertag(profile?.gamertag ?? '');
                      setPsAvatarWord(profile?.avatarWord ?? '');
                      setPsAvatarUrl(profile?.avatarUrl ?? '');
                      setShowProfileSetup(true);
                    }} className="text-xl">⚙️</button>
                  </div>
                </div>
                {/* Buttons */}
                <button
                  onClick={() => setSetupStep('config')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl transition-all">
                  Play
                  <span className="block text-sm font-normal opacity-70">Local / AI</span>
                </button>
                <button
                  onClick={() => { setMpPhase('lobby'); setMpError(''); setJoinCodeInput(''); }}
                  className="w-full py-3 bg-slate-700/80 text-white font-bold text-base rounded-xl transition-all">
                  🌐 Multiplayer
                </button>
              </div>
            </div>
          )}

          {/* ── Player config ── */}
          {setupStep === 'config' && (
            <div className={`bg-slate-900/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 transition-opacity duration-700 flex flex-col max-h-[68vh] ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
              {/* Header */}
              <div className="shrink-0 px-5 pt-4 pb-3 flex items-center gap-3">
                <button onClick={() => setSetupStep('mode')} className="text-white/50 hover:text-white p-1">
                  ←
                </button>
                <h2 className="text-lg font-bold text-white">Configure Players</h2>
              </div>
              {/* Scrollable player list */}
              <div className="overflow-y-auto flex-1 px-5">
                <div className="space-y-3 pb-2">
                  {players.map((player, idx) => (
                    <div key={idx} className="p-4 rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${player.color}20, ${player.color}10)`, border: `2px solid ${player.color}40` }}>
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={player.name}
                          onChange={e => setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                          className="text-lg font-bold text-white bg-transparent border-b-2 border-purple-400 outline-none flex-1"
                        />
                        <label className="flex items-center gap-3 cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={player.isAI}
                            onChange={e => setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, isAI: e.target.checked } : p))}
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className="font-semibold text-white">AI</span>
                        </label>
                      </div>
                      {player.isAI && (
                        <div className="flex gap-2 mt-1">
                          {(['easy', 'medium', 'hard'] as const).map(level => (
                            <button key={level} onClick={() => setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, difficulty: level } : p))}
                              className={`flex-1 py-1.5 rounded-lg text-sm font-bold capitalize transition-all
                                ${player.difficulty === level
                                  ? 'bg-white/20 text-white ring-2 ring-white/50'
                                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'}`}>
                              {level === 'easy' ? 'Easy' : level === 'medium' ? 'Medium' : 'Hard'}
                            </button>
                          ))}
                        </div>
                      )}
                      {!player.isAI && (
                        <div className="mt-2">
                          {player.profileUUID ? (
                            <div className="flex items-center gap-2">
                              {player.profileAvatarUrl && <img src={player.profileAvatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-white/30" />}
                              <span className="text-white/60 text-xs font-bold">✓ Signed in</span>
                              {idx !== 0 && (
                                <button onClick={() => setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, profileUUID: undefined, profileAvatarUrl: undefined } : p))}
                                  className="text-white/30 text-xs ml-auto hover:text-white/60">Sign out</button>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => { setSigningInIdx(idx); setSiGamertag(''); setSiPin(''); setSiError(''); setShowSignIn(true); }}
                              className="text-xs font-bold text-purple-400 hover:text-purple-300">
                              + Sign in to track stats
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Play button footer */}
              <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    const emptyBoard = Array(9).fill(null);
                    setBoard(emptyBoard);
                    setPlayers(prev => prev.map(p => p.isAI ? { ...p, name: pickAIName(p.difficulty) } : p));
                    setGamePhase('playing');
                    if (players[0].isAI) setTimeout(() => makeAIMove(0, emptyBoard), 500);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl transition-all">
                  Play
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowLeaderboard(false)}>
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-purple-500/30 w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">🏆 Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-white/50 hover:text-white text-2xl leading-none">×</button>
            </div>
            {(() => {
              const allEntries = Object.entries(leaderboard)
                .map(([uuid, stats]) => ({ uuid, stats, rank: getRank(stats.rp ?? 0) }))
                .sort((a, b) => (b.stats.rp ?? 0) - (a.stats.rp ?? 0));
              if (allEntries.length === 0) return (
                <p className="text-white/50 text-center py-8">No players yet.<br/>Play a game to appear here.</p>
              );
              const userIdx = allEntries.findIndex(e => e.uuid === profile?.uuid);
              const center = userIdx === -1 ? 0 : userIdx;
              const start = Math.max(0, center - 100);
              const end = Math.min(allEntries.length, center + 101);
              const visible = allEntries.slice(start, end);
              const aboveCount = start;
              const belowCount = allEntries.length - end;
              return (
                <div ref={lbContainerRef} className="space-y-2 max-h-96 overflow-y-auto">
                  {aboveCount > 0 && (
                    <p className="text-white/30 text-xs text-center py-1">↑ {aboveCount} player{aboveCount !== 1 ? 's' : ''} above</p>
                  )}
                  {visible.map(({ uuid, stats, rank }) => {
                    const i = allEntries.findIndex(e => e.uuid === uuid);
                    const rp = stats.rp ?? 0;
                    const winPct = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
                    const isMe = uuid === profile?.uuid;
                    const tierColor = TIER_DISPLAY[rank.tier].color;
                    const progressPct = rank.maxRP === Infinity ? 100 : Math.round(((rp - rank.minRP) / 100) * 100);
                    return (
                      <div key={uuid} ref={isMe ? lbUserRowRef : undefined}
                        className={`p-3 rounded-xl border ${isMe ? 'bg-purple-900/30 border-purple-500/50' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 font-bold w-6 text-sm shrink-0 text-right">{i + 1}</span>
                          {stats.avatarUrl
                            ? <img src={stats.avatarUrl} alt={stats.gamertag} className="w-9 h-9 rounded-full object-cover border-2 border-white/20 shrink-0" />
                            : <div className="w-9 h-9 rounded-full bg-slate-700 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-white font-bold text-sm truncate">{stats.gamertag || 'Unknown'}</span>
                              {isMe && <span className="text-purple-400 text-xs font-bold shrink-0">YOU</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold shrink-0" style={{ color: tierColor }}>{rank.label}</span>
                              <span className="text-white/30 text-xs">{rp} RP · {winPct}% wins</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: tierColor }} />
                        </div>
                      </div>
                    );
                  })}
                  {belowCount > 0 && (
                    <p className="text-white/30 text-xs text-center py-1">↓ {belowCount} player{belowCount !== 1 ? 's' : ''} below</p>
                  )}
                  <p className="text-white/30 text-xs text-center pt-1">
                    Bronze I→III (0–299) · Silver I→III (300–599) · Gold I→III (600+)
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showSignIn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSignIn(false)}>
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-purple-500/30 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Sign In</h2>
              <button onClick={() => setShowSignIn(false)} className="text-white/50 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">Gamertag</label>
                <input
                  type="text"
                  value={siGamertag}
                  onChange={e => { setSiGamertag(e.target.value); setSiError(''); }}
                  placeholder="Your gamertag"
                  style={{ fontSize: '16px' }}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1 block">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={siPin}
                  onChange={e => { setSiPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setSiError(''); }}
                  placeholder="••••"
                  style={{ fontSize: '16px' }}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-purple-400 outline-none placeholder-gray-500"
                />
              </div>
              {siError && <p className="text-red-400 text-sm">{siError}</p>}
              <button
                onClick={async () => {
                  if (!siGamertag.trim() || siPin.length !== 4 || siLoading) return;
                  setSiLoading(true);
                  try {
                    const res = await fetch(`${API}/api/leaderboard`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'signin', gamertag: siGamertag.trim(), pin: siPin }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setSiError(res.status === 404 ? 'Gamertag not found.' : res.status === 401 ? 'Wrong PIN.' : 'Sign in failed.');
                      setSiLoading(false);
                      return;
                    }
                    setPlayers(prev => prev.map((p, i) =>
                      i === signingInIdx ? { ...p, name: data.gamertag, profileUUID: data.uuid, profileAvatarUrl: data.avatarUrl } : p
                    ));
                    setShowSignIn(false);
                  } catch {
                    setSiError('Connection error. Try again.');
                  }
                  setSiLoading(false);
                }}
                disabled={!siGamertag.trim() || siPin.length !== 4 || siLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl disabled:opacity-40">
                {siLoading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" /> : 'Sign In'}
              </button>
              <p className="text-white/30 text-xs text-center">Don't have a profile? Create one on your own device.</p>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  if (gamePhase === 'playing') {
    const isMultiplayer = gameMode === 'multiplayer';
    const isHumanTurn = isMultiplayer ? currentPlayer === mySlot : !players[currentPlayer].isAI;
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ backgroundColor: '#000000' }}>

        {/* Connection lost banner */}
        {isMultiplayer && mpConnectionLost && (
          <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-center text-sm py-2 font-bold animate-pulse"
            style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            Connection lost — trying to reconnect...
          </div>
        )}

        {/* Battle Overlay */}
        {battleAnimation && (() => {
          const defImg = imageCache[battleAnimation.defenderObject.toLowerCase()];
          const atkImg = imageCache[battleAnimation.challenger.toLowerCase()];
          const CombatantCard = ({ word, owner, label, img }: { word: string; owner: number; label: string; img?: string }) => (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">{label}</p>
              <div className="w-28 h-28 rounded-xl border-4 overflow-hidden mx-auto mb-2 relative"
                style={{ borderColor: players[owner].color }}>
                {img ? (
                  <>
                    <img src={img} alt={word} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                      <p className="text-white text-xs font-bold text-center truncate">{word}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1"
                    style={{ background: `${players[owner].color}20` }}>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <p className="text-white font-bold text-sm text-center px-2 break-words">{word}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">{players[owner].name}</p>
            </div>
          );
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
              onClick={dismissBattleOverlay}>
              <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-2xl p-8 border border-yellow-500/50 max-w-lg w-full">
                <div className="text-center">
                  <div className="flex justify-around items-center mb-5">
                    <CombatantCard word={battleAnimation.defenderObject} owner={battleAnimation.defenderOwner} label="Defending" img={defImg} />
                    <div className="text-4xl font-black text-yellow-400 animate-pulse self-center">⚔️</div>
                    <CombatantCard word={battleAnimation.challenger} owner={battleAnimation.challengerOwner} label="Attacking" img={atkImg} />
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border-2 border-yellow-500">
                    {battleAnimation.winner ? (
                      <p className="text-lg text-yellow-400 font-bold mb-2">🏆 {battleAnimation.winner.toUpperCase()} WINS!</p>
                    ) : (
                      <p className="text-lg text-yellow-400 font-bold mb-2 animate-pulse">⚔️ BATTLE IN PROGRESS...</p>
                    )}
                    {battleNarrative ? (
                      <p className="text-gray-200 text-sm leading-relaxed">{battleNarrative}</p>
                    ) : (
                      <p className="text-gray-400 text-sm animate-pulse">Chronicling the battle...</p>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-4 animate-pulse">Tap anywhere to continue</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Header */}
        <div className="shrink-0 px-4 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button onClick={resetGame} disabled={isGenerating}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="Tic Attack Toe" className="h-36" />
          <button onClick={restartGame} disabled={isGenerating}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg">
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Last move hint */}
        <div className="px-4 pb-1 shrink-0 h-5">
          {lastMove && (
            <p className="text-xs text-yellow-400/70 truncate">{lastMove.player}: {lastMove.action}</p>
          )}
        </div>

        {/* Board */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-3 gap-2">
          {/* Player indicators above board */}
          <div className="flex gap-2" style={{ width: 'min(calc(100vw - 24px), calc(100dvh - 310px))' }}>
            {players.map((player, i) => (
              <div key={i}
                className="flex-1 rounded-lg flex flex-col items-center justify-center py-1.5 font-bold transition-all"
                style={{
                  backgroundColor: player.color,
                  opacity: currentPlayer === i ? 1 : 0.35,
                  boxShadow: currentPlayer === i ? `0 0 12px ${player.color}` : 'none',
                  transform: currentPlayer === i ? 'scale(1.03)' : 'scale(1)',
                }}>
                <span className="text-white text-xs font-black">P{i + 1}</span>
                <span className="text-white font-bold text-xs truncate w-full text-center px-1">{player.name}</span>
                <span className="text-white/70 text-[9px]">{player.isAI ? 'AI' : 'YOU'}</span>
              </div>
            ))}
          </div>
          <div className="aspect-square" style={{ width: 'min(calc(100vw - 24px), calc(100dvh - 310px))' }}>
            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
              {board.map((cell, idx) => {
                const isSelected = selectedCell === idx;
                const isClickable = isHumanTurn && !isGenerating;
                return (
                  <div key={idx}
                    onClick={() => { if (isClickable) { setSelectedCell(idx); setWordError(''); } }}
                    className={`rounded-xl overflow-hidden transition-all cursor-pointer border-2
                      ${isSelected ? 'ring-4 ring-white ring-offset-1 ring-offset-transparent scale-105' : ''}
                      ${isClickable && !cell ? 'active:scale-95' : ''}
                      ${cell ? '' : 'bg-slate-700/60'}`}
                    style={cell
                      ? { borderColor: players[cell.owner].color, background: `linear-gradient(135deg, ${players[cell.owner].color}30, ${players[cell.owner].color}15)` }
                      : { borderColor: isSelected ? 'white' : '#4a5568' }}>
                    {cell && (() => {
                      const img = imageCache[cell.object.toLowerCase()];
                      return img ? (
                        <div className="relative w-full h-full">
                          <img src={img} alt={cell.object} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                            <p className="text-white text-xs font-bold text-center truncate">{cell.object}</p>
                          </div>
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black/30"
                            style={{ backgroundColor: players[cell.owner].color }} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 relative">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <p className="text-white font-bold text-xs text-center break-words px-1"
                            style={{ textShadow: `0 0 8px ${players[cell.owner].color}` }}>
                            {cell.object}
                          </p>
                          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
                            style={{ backgroundColor: players[cell.owner].color }} />
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-3 pt-2 shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {isHumanTurn ? (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={objectInput}
                  onChange={e => { setObjectInput(e.target.value); setWordError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && objectInput.trim() && !isGenerating) submitWord(); }}
                  placeholder={selectedCell !== null ? 'Type your word...' : 'Select a square first'}
                  maxLength={24}
                  disabled={isGenerating || selectedCell === null}
                  style={{ fontSize: '16px' }}
                  className={`flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 border-2 outline-none placeholder-gray-500 disabled:opacity-50 ${wordError ? 'border-red-500' : 'border-purple-400 focus:border-purple-300'}`}
                />
                <button
                  onClick={submitWord}
                  disabled={isGenerating || !objectInput.trim() || selectedCell === null}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 rounded-xl disabled:opacity-50 shrink-0">
                  {isGenerating
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send size={16} />}
                </button>
              </div>
              {wordError && <p className="text-red-400 text-xs px-1">{wordError}</p>}
            </div>
          ) : (
            <div className="text-center py-3">
              {isMultiplayer ? (
                <p className="text-purple-400 text-sm animate-pulse">
                  Waiting for {players[currentPlayer]?.name ?? 'opponent'}...
                </p>
              ) : (
                <p className="text-purple-400 text-sm animate-pulse">
                  {isGenerating ? `${players[currentPlayer].name} is placing...` : `${players[currentPlayer].name} is thinking...`}
                </p>
              )}
            </div>
          )}
        </div>
        {/* Space reserved for native banner ad */}
        <div className="h-[80px] shrink-0" />
      </div>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (gamePhase === 'gameOver' && winner !== null) {
    const winnerPlayer = players[winner];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
            VICTORY!
          </h1>
          <div className="inline-block px-8 py-6 rounded-2xl text-white text-2xl font-bold mb-4 shadow-2xl"
            style={{ backgroundColor: winnerPlayer.color, boxShadow: `0 0 40px ${winnerPlayer.color}80` }}>
            <Crown className="inline mr-2" size={28} />
            {winnerPlayer.name}
          </div>
          {(() => {
            if (!profile) return null;
            const stats = leaderboard[profile.uuid];
            const rp = stats?.rp ?? 0;
            const rank = getRank(rp);
            const tierColor = TIER_DISPLAY[rank.tier].color;
            const progressPct = rank.maxRP === Infinity ? 100 : Math.round(((rp - rank.minRP) / 100) * 100);
            const rpToNext = rank.maxRP === Infinity ? null : rank.maxRP - rp + 1;
            return (
              <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 text-center w-full max-w-xs mx-auto">
                <p className="text-2xl font-black mb-1" style={{ color: tierColor }}>
                  {rank.label}
                </p>
                <p className="text-white/50 text-xs mb-3">{rp} RP{rpToNext ? ` · ${rpToNext} to next rank` : ' · MAX'}</p>
                {/* RP bar */}
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: tierColor }} />
                </div>
                {myRPDelta !== null && (
                  <p className={`text-sm font-black ${myRPDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {myRPDelta >= 0 ? `+${myRPDelta}` : myRPDelta} RP {myRPDelta >= 0 ? '↑' : '↓'}
                  </p>
                )}
              </div>
            );
          })()}
          <button
            onClick={async () => {
              gamesPlayedRef.current += 1;
              if (gamesPlayedRef.current % 3 === 0 && interstitialReadyRef.current) {
                try {
                  const { AdMob } = await import('@capacitor-community/admob');
                  interstitialReadyRef.current = false;
                  await AdMob.showInterstitial();
                  AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: true })
                    .then(() => { interstitialReadyRef.current = true; })
                    .catch(() => {});
                } catch {}
              }
              resetGame();
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl transition-all">
            Play Again
          </button>
          {/* Space reserved for native banner ad */}
          <div className="h-[50px] mt-4" />
        </div>
      </div>
    );
  }

  return null;
}
