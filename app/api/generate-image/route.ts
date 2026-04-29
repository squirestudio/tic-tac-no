import { Redis } from '@upstash/redis';

export const maxDuration = 30;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function POST(req: Request) {
  const { word } = await req.json();
  const key = `img:${word.toLowerCase()}`;

  if (redis) {
    const cached = await redis.get<string>(key);
    if (cached) return Response.json({ url: cached });
  }

  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${word}, epic fantasy battle card art, dramatic lighting, dark background, vivid colors, centered subject, highly detailed, no text`,
      negative_prompt: 'nude, nudity, sexual, explicit, nsfw, gore, blood, violence, disturbing, inappropriate, offensive, racist, hateful',
      image_size: 'square_hd',
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('fal.ai error:', err);
    return Response.json({ error: err }, { status: 500 });
  }

  const data = await response.json() as { images: { url: string }[] };
  const url = data.images[0].url;

  if (redis) await redis.set(key, url);

  return Response.json({ url });
}
