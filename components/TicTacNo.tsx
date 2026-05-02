'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, Crown, ArrowLeft, Send } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

// Replace with real AdMob IDs before App Store submission
const ADMOB_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910';

type Player = { id: number; name: string; isAI: boolean; color: string; difficulty: 'easy' | 'medium' | 'hard' };
type Cell = { object: string; owner: number } | null;
type BattleAnimation = {
  challenger: string;
  challengerOwner: number;
  defenderObject: string;
  defenderOwner: number;
  winner: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const gamesPlayedRef = useRef(0);
  const interstitialReadyRef = useRef(false);

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
    try {
      const response = await fetch(`${API}/api/battle-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenger, defender }),
      });
      if (!response.body) { onWinner(challenger); return; }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let winnerParsed = false;

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
    } catch {
      onWinner(challenger);
      setBattleNarrative('The battle raged, and a victor emerged from the chaos.');
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
          const next = (playerMakingMove + 1) % 3;
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
          const challengerWon = winnerWord.toLowerCase() === object.toLowerCase() || winnerWord.toLowerCase() === 'tie';
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
              const next = (playerMakingMove + 1) % 3;
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

  const submitWord = useCallback(async () => {
    const word = objectInput.trim();
    if (!word || isGenerating || selectedCell === null) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/api/validate-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const { ok } = await res.json();
      if (!ok) {
        setWordError("That word isn't allowed — please try something else.");
        setIsGenerating(false);
        return;
      }
    } catch {
      // if validation fails open, allow through
    }
    placePiece(selectedCell, word, currentPlayer, board);
  }, [objectInput, isGenerating, selectedCell, currentPlayer, board, placePiece]);

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (gamePhase === 'setup') {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col justify-end p-6"
        style={{ backgroundImage: 'url(/bg.png)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))', paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <div className="max-w-2xl mx-auto w-full">
          <div className={`bg-slate-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-purple-500/30 transition-opacity duration-700 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-white mb-6">Configure Players</h2>
            <div className="space-y-4 mb-8">
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
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const emptyBoard = Array(9).fill(null);
                setBoard(emptyBoard);
                setGamePhase('playing');
                if (players[0].isAI) setTimeout(() => makeAIMove(0, emptyBoard), 500);
              }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all">
              Play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  if (gamePhase === 'playing') {
    const isHumanTurn = !players[currentPlayer].isAI;
    return (
      <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">

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
        <div className="flex items-center justify-between px-4 pb-2 shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={resetGame} disabled={isGenerating}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2 items-center">
            {players.map((player, i) => (
              <div key={i}
                className="w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs transition-all"
                style={{
                  backgroundColor: player.color,
                  opacity: currentPlayer === i ? 1 : 0.35,
                  boxShadow: currentPlayer === i ? `0 0 12px ${player.color}` : 'none',
                  transform: currentPlayer === i ? 'scale(1.1)' : 'scale(1)',
                }}>
                <span className="text-white text-xs font-black">P{i + 1}</span>
                <span className="text-white/80 text-[9px]">{player.isAI ? 'AI' : 'YOU'}</span>
              </div>
            ))}
          </div>
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
        <div className="flex-1 flex items-center justify-center min-h-0 px-3">
          <div className="aspect-square" style={{ width: 'min(calc(100vw - 24px), calc(100dvh - 260px))' }}>
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
              <p className="text-purple-400 text-sm animate-pulse">
                {isGenerating ? `${players[currentPlayer].name} is placing...` : `${players[currentPlayer].name} is thinking...`}
              </p>
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
          <div className="inline-block px-8 py-6 rounded-2xl text-white text-2xl font-bold mb-8 shadow-2xl"
            style={{ backgroundColor: winnerPlayer.color, boxShadow: `0 0 40px ${winnerPlayer.color}80` }}>
            <Crown className="inline mr-2" size={28} />
            {winnerPlayer.name}
          </div>
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
