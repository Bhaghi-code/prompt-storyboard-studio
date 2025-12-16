// app/page.tsx
'use client';

import { useState } from 'react';
import confetti from "canvas-confetti";


type StoryFrame = {
  id: number;
  sceneTitle: string;
  beatPurpose: string;
  emotion: string;
  visualPrompt: string;
  cameraAngle: string;
  copyHeadline: string;
  copySupporting: string;
  cta: string;
  imageUrl?: string;
};

type PaletteKey = 'pastel' | 'neon' | 'cinematic';

export default function HomePage() {
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState('Minimal');
  const [tone, setTone] = useState('Professional');
  const [frames, setFrames] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [genId, setGenId] = useState(0);
  const [storyboardFrames, setStoryboardFrames] = useState<StoryFrame[] | null>(
    null
  );

  const [includeVisuals, setIncludeVisuals] = useState(true);

  // Which card's "Firefly prompt" is expanded
  const [openPromptId, setOpenPromptId] = useState<number | null>(null);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    imageUrl: string;
    title: string;
  } | null>(null);

  // --- Image palettes --------------------------------------------------------
  const palettes: Record<PaletteKey, string[]> = {
    pastel: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=1200&q=80',
    ],
    neon: [
      'https://images.unsplash.com/photo-1533108344127-a586d89c90b2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500534314211-0a24cd07bb1d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517999349371-c43520457b23?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?auto=format&fit=crop&w=1200&q=80',
    ],
    cinematic: [
      'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1487412720507-3a29e7c1c05a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484300681262-5cca666b0950?auto=format&fit=crop&w=1200&q=80',
    ],
  };

  const [palette, setPalette] = useState<PaletteKey>('pastel');

  const paletteBg: Record<
  PaletteKey,
  { from: string; via: string; to: string; glow: string }
> = {
  pastel: {
    from: "from-amber-50",
    via: "via-rose-50",
    to: "to-sky-50",
    glow: "shadow-orange-100/70",
  },
  neon: {
    from: "from-fuchsia-50",
    via: "via-violet-50",
    to: "to-cyan-50",
    glow: "shadow-fuchsia-200/60",
  },
  cinematic: {
    from: "from-stone-100",
    via: "via-amber-50",
    to: "to-slate-100",
    glow: "shadow-slate-200/60",
  },
};

const mood = paletteBg[palette];


  const shufflePalette = () => {
    const keys: PaletteKey[] = ['pastel', 'neon', 'cinematic'];
    const others = keys.filter((k) => k !== palette);
    const next = others[Math.floor(Math.random() * others.length)];
    setPalette(next);
  };

  const images = palettes[palette];
  const imageForIndex = (index: number) => images[index % images.length];

  // --- Demo frames when AI hasn't run yet ------------------------------------
  const demoFrames: StoryFrame[] = Array.from({ length: frames }).map(
    (_, i) => ({
      id: i + 1,
      sceneTitle: `Scene ${i + 1}`,
      beatPurpose: 'Establishes the campaign mood and context.',
      emotion: 'Anticipation',
      visualPrompt: 'Placeholder visual description for this frame.',
      cameraAngle: 'Eye-level medium shot.',
      copyHeadline: 'Sample headline for this scene.',
      copySupporting:
        'Supporting copy that elaborates on the main idea of the campaign.',
      cta: 'Learn more',
    })
  );

  const framesToShow = storyboardFrames ?? demoFrames;

  // --- API call --------------------------------------------------------------
  const handleGenerate = async () => {
  setIsGenerating(true);
  setErrorMsg(null);

  // Optional: show "skeleton" frames immediately so the UI feels alive
  setStoryboardFrames(
    Array.from({ length: frames }).map((_, i) => ({
      id: i + 1,
      sceneTitle: `Generating frame ${i + 1}...`,
      beatPurpose: 'Generating…',
      emotion: '…',
      visualPrompt: 'Creating story + visuals…',
      cameraAngle: '…',
      copyHeadline: 'Generating…',
      copySupporting: 'Please wait…',
      cta: '…',
      imageUrl: undefined, // placeholder state
    }))
  );

  try {
    const response = await fetch('/api/generate-storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, style, tone, frames, includeVisuals }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to generate storyboard');
    }

    const data = await response.json();
    setGenId((v) => v + 1);
    setStoryboardFrames(data.frames);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.7 },
    });
    setOpenPromptId(null);
  } catch (err: any) {
    console.error(err);
    setErrorMsg('Something went wrong generating the storyboard.');
  } finally {
    setIsGenerating(false);
  }
};


  // Build the Firefly prompt text for a given frame
  const buildFireflyPrompt = (frame: StoryFrame) => {
    const campaign = brief || 'A generic brand campaign';
    return (
      `${frame.visualPrompt}. ` +
      `Campaign context: ${campaign}. ` +
      `Style: ${style}. Tone: ${tone}. Camera angle: ${frame.cameraAngle}. ` +
      'High quality, cinematic lighting, rich detail.'
    );
  };

  return (
    <main className={`min-h-screen text-slate-900 bg-gradient-to-br 
    ${mood.from} ${mood.via} ${mood.to}
    transition-colors duration-500`}
    >

      <header className="h-14 border-b border-orange-100 bg-[#fdf7ee]/80 backdrop-blur flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-slate-900 text-amber-50 flex items-center justify-center text-xs font-semibold shadow">
            PS
          </div>
          <span className="text-sm font-medium text-slate-800">
            Prompt-to-Storyboard Studio
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-slate-500">
            Palette:&nbsp;
            <span className="font-medium capitalize text-slate-700">
              {palette}
            </span>
          </span>
          <button
            onClick={shufflePalette}
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400" />
            Shuffle moodboard
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="px-3 md:px-6 py-6 md:py-8 flex justify-center">
        <div className={`w-full max-w-7xl bg-[#fdf8f1] rounded-3xl border border-orange-100 shadow-xl ${mood.glow} overflow-hidden`}
        >
          <div className="flex flex-col md:flex-row">
            {/* LEFT: controls */}
            <section className="md:flex-[0_0_320px] lg:flex-[0_0_360px] border-b md:border-b-0 md:border-r border-orange-100 p-6 md:p-7 flex flex-col gap-4">
              <header className="space-y-1">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-amber-700">
                  Concept Lab · v0.1
                </span>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Prompt-to-Storyboard Studio
                </h1>
                <p className="text-sm text-slate-600">
                  Turn a campaign idea into an AI-assisted storyboard for Adobe
                  Firefly and your design tools.
                </p>
              </header>

              <div className="mt-1 space-y-4">
                {/* Brief */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Campaign brief
                  </label>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    className="w-full h-32 rounded-2xl border border-orange-100 bg-[#fbf1e3] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300/80 resize-none placeholder:text-slate-400"
                    placeholder="Launch a campaign for books of Ruskin Bond..."
                  />
                </div>

                {/* Controls */}
                <div>
                  <p className="block text-xs font-medium text-slate-600 mb-2">
                    Creative controls
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Style
                      </label>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full rounded-xl border border-orange-100 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option>Minimal</option>
                        <option>Bold</option>
                        <option>Playful</option>
                        <option>Editorial</option>
                        <option>Luxury</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Tone
                      </label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full rounded-xl border border-orange-100 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option>Professional</option>
                        <option>Witty</option>
                        <option>Emotional</option>
                        <option>Gen Z</option>
                        <option>Luxury</option>
                      </select>
                    </div>
                  </div>

                  {/* Frames */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-500">
                        Frames ·{' '}
                        <span className="font-semibold text-slate-900">
                          {frames}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        2–10 scenes
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={frames}
                      onChange={(e) => setFrames(Number(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                  </div>

                  {/* Generate visuals toggle */}
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">
                      Generate visuals
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Turn off to save tokens / speed up.
                      </p>
                    </div>
                    <button
                    type="button"
                    onClick={() => setIncludeVisuals((v) => !v)}
                    className={'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ' +
                      (includeVisuals
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-slate-300 border-slate-200')
                        }
                  >
                  
                    <span
                      className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' +
                        (includeVisuals ? 'translate-x-5' : 'translate-x-1')
                      }
                    />
                    </button>
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-[#fbf1e3] border border-orange-100 text-slate-700">
                      Instagram
                    </span>
                    <span className="px-2 py-1 rounded-full bg-[#fbf1e3] border border-orange-100 text-slate-700">
                      TikTok
                    </span>
                    <span className="px-2 py-1 rounded-full bg-[#fbf1e3] border border-orange-100 text-slate-700">
                      Web hero
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className={`mt-1 inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium shadow-md transition-colors
                    ${isGenerating ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-amber-50 shadow-amber-300/70'}`}
                >
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                      Generating…
                    </span>
                  ) : (
                    'Generate storyboard'
                  )}
                </button>
              </div>

              
            </section>

            {/* RIGHT: storyboard */}
            <section className="flex-1 min-w-0 p-6 md:p-7 flex flex-col">
              <header className="flex items-center justify-between mb-4 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Storyboard
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Story timeline
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Swipe horizontally to see how the campaign unfolds.
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 whitespace-nowrap">
                  {storyboardFrames ? 'AI-generated sequence' : 'Demo sequence'}
                </span>
              </header>

              {/* Timeline line */}
              <div className="relative mb-3">
                <div className="h-px bg-gradient-to-r from-amber-300 via-pink-200 to-sky-200 rounded-full" />
              </div>

              {/* Cards rail */}
              <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-5 md:gap-6 min-w-max pr-4">
                  {framesToShow.map((frame, index) => {
                    const hasAiImage = Boolean(frame.imageUrl);
                    const showPlaceholder = isGenerating && includeVisuals && !hasAiImage;
                    const imageUrl = hasAiImage ? (frame.imageUrl as string) : imageForIndex(index);
                    const isPromptOpen = openPromptId === frame.id;

                    return (
                      <div
                        //key={frame.id}
                        key={`${genId}-${frame.id}`}
                        style={{ animationDelay: `${index * 90}ms` }}
                        className="min-w-[260px] md:min-w-[280px] max-w-xs
                                   bg-[#fff9f0]/95 backdrop-blur
                                   border border-orange-100
                                   rounded-3xl
                                   shadow-md shadow-orange-100/70
                                   hover:shadow-xl hover:shadow-orange-200/90
                                   overflow-hidden
                                   float-soft
                                   transition-transform transition-shadow duration-300
                                   hover:scale-[1.02]
                                   will-change-transform
                                   opacity-0 
                                   animate-cardIn"
                                    
                                   
                      >
                        {/* Image */}
                        <button
                          type="button"
                          onClick={() =>
                            setLightbox({ imageUrl, title: frame.sceneTitle })
                          }
                          className="relative h-40 w-full overflow-hidden group"
                        >
                          <img
                            src={imageUrl}
                            alt={frame.sceneTitle}
                            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ken-burns-soft
                              ${showPlaceholder ? 'opacity-50 blur-[1px]' : ''}`}
                          />
                          {showPlaceholder && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="h-3 w-3 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                                Generating image…
                              </div>
                            </div>
                             )}
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-semibold tracking-[0.14em] uppercase text-white">
                            Fi
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                        </button>

                        {/* Content */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                              Frame {index + 1}
                            </p>
                            <span className="px-2 py-[2px] rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-100">
                              {frame.emotion || 'Beat'}
                            </span>
                          </div>

                          <p className="text-sm font-semibold mb-0.5">
                            {frame.sceneTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 mb-2">
                            {frame.beatPurpose}
                          </p>

                          <p className="text-xs text-slate-600 mb-2">
                            {frame.visualPrompt}
                          </p>

                          <p className="text-sm font-semibold mb-1">
                            {frame.copyHeadline}
                          </p>

                          <p className="text-xs text-slate-600 mb-3">
                            {frame.copySupporting}
                          </p>

                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-violet-600 font-medium">
                              {frame.cta}
                            </p>

                            {/* Firefly prompt pill */}
                            <button
                              type="button"
                              onClick={() =>
                                setOpenPromptId(
                                  isPromptOpen ? null : frame.id
                                )
                              }
                              className="ml-3 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-[3px] text-[10px] font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                              Firefly prompt
                            </button>
                          </div>

                          {/* Prompt body */}
                          {isPromptOpen && (
                            <div className="mt-2 rounded-2xl bg-slate-900 text-[11px] text-slate-50 px-3 py-2 leading-snug">
                              <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                                Copy & paste into Firefly
                              </p>
                              <p className="text-[11px] text-slate-50">
                                {buildFireflyPrompt(frame)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Lightbox modal */}
      {lightbox && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-[#fdf8f1] rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Frame preview
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {lightbox.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-full border border-slate-200 bg-white text-slate-600 w-7 h-7 flex items-center justify-center text-sm hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden">
              <img
                src={lightbox.imageUrl}
                alt={lightbox.title}
                className="w-full h-full object-contain bg-black"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
