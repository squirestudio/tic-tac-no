// Simple blocklist — only the most explicit slurs and profanity.
// fal.ai and Claude both have their own content filters on image gen
// and battle narratives, so this is just a lightweight first pass.
const BLOCKLIST = new Set([
  'fuck','shit','cunt','nigger','nigga','faggot','fag','chink','spic',
  'kike','wetback','tranny','retard','cock','pussy','dick','ass','bitch',
  'whore','slut','rape','porn','dildo','cum','jizz','bastard','asshole',
]);

function isBlocked(word: string): boolean {
  const w = word.toLowerCase().trim();
  return BLOCKLIST.has(w) || w.split(/\s+/).some(token => BLOCKLIST.has(token));
}

export async function POST(req: Request) {
  const { word } = await req.json();
  return Response.json({ ok: !isBlocked(word) });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
