export type Season = {
  id: string;
  name: string;
  promptSuffix: string;
  negativePrompt: string;
};

export const SEASONS: Season[] = [
  {
    id: 's1',
    name: 'Season 1 — Elemental Clash',
    promptSuffix: 'depicted as itself, not as a person or character, powerful cartoon illustration, bold vibrant colors, dramatic energy effects and aura that reflect its true nature, white background, centered, no text, no face',
    negativePrompt: 'nude, nudity, sexual, explicit, nsfw, gore, blood, violence, disturbing, inappropriate, offensive, racist, hateful, realistic, photorealistic, bland, plain, static, boring, arms, legs, hands, feet, humanoid, anthropomorphic, person, character, fortnite, human body, superhero, cape, costume, warrior, fighter, face, eyes, mouth',
  },
  // Add future seasons here, e.g.:
  // {
  //   id: 's2',
  //   name: 'Season 2 — Neon Cyber',
  //   promptSuffix: 'depicted as itself, glowing neon cyberpunk illustration, electric outlines, dark background, centered, no text, no face',
  //   negativePrompt: '...',
  // },
];

// Active season is controlled by the CURRENT_SEASON env var (e.g. "s1").
// Change it in Vercel → Settings → Environment Variables to start a new season.
// Falls back to the last entry in SEASONS if the env var is unset or unrecognised.
export function getCurrentSeason(): Season {
  const id = process.env.CURRENT_SEASON;
  return (id && SEASONS.find(s => s.id === id)) || SEASONS[SEASONS.length - 1];
}
