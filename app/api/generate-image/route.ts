import { fal } from '@fal-ai/client';
import { Redis } from '@upstash/redis';

fal.config({ credentials: process.env.FAL_KEY });

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

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: `${word}, epic fantasy battle card art, dramatic lighting, dark background, vivid colors, centered subject, highly detailed, no text`,
      image_size: 'square_hd',
      num_inference_steps: 4,
      num_images: 1,
    },
  });

  const url = (result.data as { images: { url: string }[] }).images[0].url;
  if (redis) await redis.set(key, url);

  return Response.json({ url });
}
