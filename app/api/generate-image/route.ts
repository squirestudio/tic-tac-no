import { fal } from '@fal-ai/client';
import { Redis } from '@upstash/redis';

fal.config({ credentials: process.env.FAL_KEY });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  const { word } = await req.json();
  const key = `img:${word.toLowerCase()}`;

  // L1: check Redis — free if already generated
  const cached = await redis.get<string>(key);
  if (cached) return Response.json({ url: cached });

  // L2: generate with fal.ai
  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: `${word}, epic fantasy battle card art, dramatic lighting, dark background, vivid colors, centered subject, highly detailed, no text`,
      image_size: 'square_hd',
      num_inference_steps: 4,
      num_images: 1,
    },
  });

  const url = (result.data as { images: { url: string }[] }).images[0].url;
  await redis.set(key, url);

  return Response.json({ url });
}
