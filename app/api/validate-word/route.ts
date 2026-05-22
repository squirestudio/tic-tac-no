const BLOCKLIST = new Set([
  // Core profanity
  'fuck','shit','cunt','nigger','nigga','faggot','fag','chink','spic',
  'kike','wetback','tranny','retard','cock','pussy','dick','ass','bitch',
  'whore','slut','rape','porn','dildo','cum','jizz','bastard','asshole',
  // Sexual / vulgar — body parts
  'boob','tit','titty','nipple','vagina','penis','boner','erection',
  'scrotum','testicle','vulva','clitoris','labia','anus','rectum',
  'genitals','genitalia','dong','shaft','clit','ballsack','gooch','taint',
  // Sexual acts
  'masturbate','masterbate','deepthroat','penetration','blowjob','handjob',
  'rimjob','cumshot','creampie','gangbang','threesome','anal','intercourse',
  'fornicate','copulate','climax','squirt','ejaculate','ejaculation',
  'orgasm','tittyfuck','facefuck','fisting','edging','wank','fap',
  'spank','grope','fondle','molest','seduce',
  // Porn industry terms
  'porn','pornstar','hardcore','softcore','nsfw','xxx','hentai','doujin',
  'onlyfans','camgirl','camshow','fetish','bdsm','bondage','dominatrix',
  'kink','kinky','voyeur','exhibitionist','futanari','futa','yaoi','yuri',
  'erotic','erotica',
  // Sex work
  'stripper','striptease','hooker','prostitute','prostitution','pimp',
  'escort','sugardaddy','sugar daddy',
  // Derogatory sexual slurs
  'thot','slut','slutty','whore',
  // CSAM-adjacent — highest priority
  'loli','lolita','shota','pedophile','pedo','underage','csam',
  // Other vulgar
  'semen','poop','jerk','nude','nudity','naked','horny','aroused',
  'sexual','sperm','vibrator','dildo','buttplug','butt plug','fleshlight',
  // Racial slurs / offensive stereotypes
  'niger','angry black woman','angry white people in ga',
  'asian mom','asia mom with deadlyshoe','mexican','yellow fever',
  // Offensive phrases
  'cosmic sex','my balls','your mom','his wife','poor little boy',
  'child','trans man','epstien','epstein',
  // Dangerous / terrorism
  'tatp','weaponized anthrax',
  // Other
  'cigarettes',
]);

function isBlocked(word: string): boolean {
  const w = word.toLowerCase().trim();
  if (BLOCKLIST.has(w)) return true;
  // Check each token — also catches plurals/variations that start with a blocked word
  return w.split(/\s+/).some(token =>
    BLOCKLIST.has(token) || [...BLOCKLIST].some(b => b.split(/\s+/).length === 1 && token.startsWith(b) && token.length <= b.length + 3)
  );
}

// Detects obvious keyboard mashing: no vowels in long tokens, or 6+ consecutive consonants
function isGibberish(word: string): boolean {
  const w = word.toLowerCase().trim();
  if (w.length <= 1) return true;
  return w.split(/\s+/).some(token => {
    if (token.length < 4) return false;
    if (!/[aeiou]/.test(token)) return true;
    if (/[^aeiou\s\-\d]{6,}/.test(token)) return true;
    return false;
  });
}

export const maxDuration = 5;

export async function POST(req: Request) {
  const { word } = await req.json();
  const w = (word ?? '').trim();
  if (!w) return Response.json({ ok: false });
  if (isBlocked(w)) return Response.json({ ok: false });
  if (isGibberish(w)) return Response.json({ ok: false });
  return Response.json({ ok: true });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
