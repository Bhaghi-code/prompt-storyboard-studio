// app/api/generate-storyboard/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brief, style, tone, frames } = body as {
      brief: string;
      style: string;
      tone: string;
      frames: number;
    };

    const prompt = `
You are a creative director generating a storyboard for a marketing campaign.

Campaign brief:
"${brief || 'No specific brief provided'}"

Visual style: ${style}
Tone of copy: ${tone}
Number of frames: ${frames}

For each frame, create SCENE INTELLIGENCE with:
- frameNumber (1 to ${frames})
- sceneTitle (short, cinematic name for this beat)
- beatPurpose (what this scene is doing in the story: e.g., set-up, conflict, reveal, social proof, CTA)
- emotion (one or two words: Wonder, Nostalgia, Urgency, Calm, etc.)
- visualPrompt (detailed visual description that could be used directly as a prompt for Adobe Firefly)
- cameraAngle (e.g., close-up, wide shot, over-the-shoulder, aerial, etc.)
- copyHeadline (short main line of copy for this frame)
- copySupporting (1–2 sentences of supporting copy)
- cta (short call-to-action)

Return ONLY valid JSON in this exact shape (no prose, no markdown):

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
    console.log('Raw model output:', text);

    // Clean possible ```json ... ``` wrappers
    const cleaned = text
      .replace(/```json/i, '')
      .replace(/```/g, '')
      .trim();

    type AiFrame = {
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

        let parsed: { frames: AiFrame[] };

    try {
      // First attempt: parse as-is
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      console.warn(
        'First JSON.parse failed, trying to fix escaped quotes. Original cleaned value:\n',
        cleaned,
        e1
      );

      // Second attempt: fix patterns like : \"Text\" → : "Text"
      const fixedOnce = cleaned.replace(/:\s*\\"([^"]*)\\"/g, ': "$1"');

      try {
        parsed = JSON.parse(fixedOnce);
      } catch (e2) {
        console.error(
          'JSON parse still failing. Final payload was:\n',
          fixedOnce,
          e2
        );
        return NextResponse.json(
          { error: 'Model did not return valid JSON.' },
          { status: 500 }
        );
      }
    }

    const generatedFrames = parsed.frames.map((f) => ({
      id: f.frameNumber,
      sceneTitle: f.sceneTitle,
      beatPurpose: f.beatPurpose,
      emotion: f.emotion,
      visualPrompt: f.visualPrompt,
      cameraAngle: f.cameraAngle,
      copyHeadline: f.copyHeadline,
      copySupporting: f.copySupporting,
      cta: f.cta,
    }));

    return NextResponse.json({ frames: generatedFrames });
  } catch (error) {
    console.error('Error generating storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to generate storyboard' },
      { status: 500 }
    );
  }
}
