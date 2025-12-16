// app/api/generate-storyboard/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // important (avoid Edge runtime issues)

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

    const prompt = `
You are a creative director generating a storyboard for a marketing campaign.

Campaign brief:
"${brief || "No specific brief provided"}"

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
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = response.output_text ?? "";
    const cleaned = text
      .replace(/```json/i, "")
      .replace(/```/g, "")
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
      imageUrl: null as string | null, // use null so it shows in JSON (optional)
    }));

    if (includeVisuals) {
      framesWithIds = await Promise.all(
        framesWithIds.map(async (frame) => {
          try {
            const imagePrompt =
              `High quality cinematic illustration of: ${frame.visualPrompt}. ` +
              `Campaign style: ${style}. Tone: ${tone}. ` +
              `Camera angle: ${frame.cameraAngle}. ` +
              "No text, no typography, no watermarks.";

            console.log("includeVisuals:", includeVisuals, "hasKey:", !!process.env.OPENAI_API_KEY);
  

            const img = await client.images.generate({
              model: "gpt-image-1",
              prompt: imagePrompt,
              size: "1024x1024",
             //response_format: "b64_json",
            });

            const b64 = (img.data?.[0] as any)?.b64_json as string | undefined;

            return {
              ...frame,
              imageUrl: b64 ? `data:image/png;base64,${b64}` : null,
            };
          } catch (e: any) {
            console.error("Image generation failed", {
              frameId: frame.id,
              status: e?.status,
              message: e?.message,
              error: e?.error,
              type: e?.type,
              code: e?.code,
            });
            return frame; // fallback: keep null imageUrl
          }
        })
      );
    }

    return NextResponse.json({ frames: framesWithIds });
  } catch (error) {
    console.error("Error generating storyboard:", error);
    return NextResponse.json(
      { error: "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
