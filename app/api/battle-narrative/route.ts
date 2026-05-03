import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: Request) {
  const { challenger, defender } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const messageStream = client.messages.stream({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        system:
          'You are a battle referee and epic narrator. There are no ties — every battle has exactly one winner. First line must be exactly "WINNER: " followed by whichever word wins (copy it exactly). Then write a vivid 2-sentence battle narrative. Be creative — any concept can battle any other. Consider the nature of each thing literally and imaginatively.',
        messages: [
          {
            role: 'user',
            content: `Battle: "${challenger}" vs "${defender}". Who wins? Declare the winner and narrate dramatically.`,
          },
        ],
      });

      for await (const event of messageStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
