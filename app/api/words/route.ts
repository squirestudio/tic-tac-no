import { Redis } from '@upstash/redis';

export const maxDuration = 10;

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const FALLBACK = {
  easy: [
    'feather', 'bubble', 'noodle', 'dandelion', 'tissue', 'cotton', 'puddle',
    'pebble', 'smoke', 'drizzle', 'yawn', 'marshmallow', 'slime', 'snowflake', 'fog',
    'petal', 'leaf', 'dewdrop', 'cobweb', 'candle', 'pillow', 'mitten', 'button',
    'ribbon', 'confetti', 'chalk', 'crayon', 'napkin', 'sponge', 'raindrop',
    'breeze', 'whisper', 'sneeze', 'giggle', 'pudding', 'lollipop',
    'cupcake', 'sprinkle', 'jellybean', 'daisy', 'butterfly', 'ladybug', 'hamster',
    'goldfish', 'tadpole', 'caterpillar', 'dust bunny', 'yarn', 'toothpick', 'straw',
    'popsicle', 'balloon', 'kite', 'pinwheel', 'moth', 'sparrow', 'snail', 'worm',
    'mushroom', 'acorn', 'twig', 'ice cube', 'snowball', 'mist', 'dew', 'steam',
    'cookie', 'crumb', 'fluff', 'wisp', 'soap', 'cotton candy', 'paper clip',
    'rubber band', 'wet noodle', 'soggy cracker', 'empty bottle', 'bath sponge',
    'wind chime', 'paper boat', 'origami crane', 'bubble wrap', 'lint', 'speck',
    'teardrop', 'dandelion seed', 'flower crown', 'daydream', 'sunbeam',
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
    'thunder', 'hailstorm', 'blight', 'miasma',
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

// Single POST handler handles all actions to avoid GET handler static-export conflict.
// action: 'words'  → return AI word lists from Redis
// action: 'record' → record battle winner/loser
// action: 'stats'  → return win-rate table
export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === 'words') {
    if (!redis) return Response.json(FALLBACK);
    try {
      const [easy, medium, hard] = await Promise.all([
        redis.get<string[]>('words:easy'),
        redis.get<string[]>('words:medium'),
        redis.get<string[]>('words:hard'),
      ]);
      return Response.json({
        easy:   easy   ?? FALLBACK.easy,
        medium: medium ?? FALLBACK.medium,
        hard:   hard   ?? FALLBACK.hard,
      });
    } catch {
      return Response.json(FALLBACK);
    }
  }

  if (action === 'record') {
    if (!redis) return Response.json({ error: 'no redis' }, { status: 503 });
    const { winner, loser } = body;
    if (!winner || !loser) return Response.json({ error: 'missing fields' }, { status: 400 });
    const w = winner.toLowerCase().trim();
    const l = loser.toLowerCase().trim();
    await Promise.all([
      redis.hincrby('word:plays', w, 1),
      redis.hincrby('word:plays', l, 1),
      redis.hincrby('word:wins',  w, 1),
    ]);
    return Response.json({ ok: true });
  }

  if (action === 'stats') {
    if (!redis) return Response.json({ error: 'no redis' }, { status: 503 });
    const minPlays = Number(body.minPlays ?? 10);
    const limit    = Number(body.limit    ?? 50);
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

  return Response.json({ error: 'unknown action' }, { status: 400 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
