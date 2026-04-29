import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: Request) {
  const { word } = await req.json();

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 5,
    system:
      'You are a content moderator for a family-friendly game played by all ages. Reply only YES if the word or phrase is appropriate, or NO if it contains profanity, slurs, sexual content, graphic violence, gore, or other inappropriate themes.',
    messages: [{ role: 'user', content: word }],
  });

  const ok =
    msg.content[0].type === 'text' &&
    msg.content[0].text.trim().toUpperCase().startsWith('Y');

  return Response.json({ ok });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
