// app/api/generate-storyboard/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RawFrame = {
  frameNumber: number;
  sceneTitle: string;
  beatPurpose: string;
  emotion: string;
  visualPrompt: string;
  cameraAngle: string;
  copyHeadline: string;
  copySupporting: string;
  cta: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brief, style, tone, frames, includeVisuals } = body as {
      brief: string;
      style: string;
      tone: string;
      frames: number;
      includeVisuals?: boolean;
    };

    // --- 1. Ask the Responses API for the structured storyboard ---------
    const prompt = `
You are a creative director generating a storyboard for a marketing campaign.

Campaign brief:
"${brief || 'No specific brief provided'}"

Visual style: ${style}
Tone of copy: ${tone}
Number of frames: ${frames}

For each frame, create:
- frameNumber (1 to ${frames})
- sceneTitle (short descriptive title)
- beatPurpose (set-up / reveal / conflict / social proof / CTA etc.)
- emotion (single word like "Wonder", "Nostalgia", "Urgency")
- visualPrompt (detailed description of the scene for an image generator)
- cameraAngle (e.g. "wide shot", "close-up", "over-the-shoulder")
- copyHeadline (short main text)
- copySupporting (1–3 sentence body copy)
- cta (short call-to-action label)

Return ONLY valid JSON in this exact shape:

{
  "frames": [
    {
      "frameNumber": 1,
      "sceneTitle": "string",
      "beatPurpose": "string",
      "emotion": "string",
      "visualPrompt": "string",
      "cameraAngle": "string",
      "copyHeadline": "string",
      "copySupporting": "string",
      "cta": "string"
    }
  ]
}
`;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });

    const text = response.output[0].content[0].text;
    const cleaned = text
      .replace(/```json/i, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned) as { frames: RawFrame[] };

    let framesWithIds = parsed.frames.map((f) => ({
      id: f.frameNumber,
      sceneTitle: f.sceneTitle,
      beatPurpose: f.beatPurpose,
      emotion: f.emotion,
      visualPrompt: f.visualPrompt,
      cameraAngle: f.cameraAngle,
      copyHeadline: f.copyHeadline,
      copySupporting: f.copySupporting,
      cta: f.cta,
      imageUrl: undefined as string | undefined,
    }));

    // --- 2. Optionally call the Images API for each frame ---------------
    if (includeVisuals) {
      const imagePromises = framesWithIds.map(async (frame) => {
        try {
          const imagePrompt =
            `High quality cinematic illustration of: ${frame.visualPrompt}. ` +
            `Campaign style: ${style}. Tone: ${tone}. ` +
            'No text or typography in the image.';

          const img = await client.images.generate({
            model: 'gpt-image-1',
            prompt: imagePrompt,
            size: '1024x1024',
            n: 1,
            // default response_format is "url"
          });

          const url = (img.data[0] as any).url as string | undefined;

          return {
            ...frame,
            imageUrl: url,
          };
        } catch (e) {
          console.error('Image generation failed for frame', frame.id, e);
          return frame; // fall back to text-only frame
        }
      });

      framesWithIds = await Promise.all(imagePromises);
    }

    return NextResponse.json({ frames: framesWithIds });
  } catch (error) {
    console.error('Error generating storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to generate storyboard' },
      { status: 500 }
    );
  }
}
