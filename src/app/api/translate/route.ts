import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Server-side translation proxy — currently uses MyMemory API.
// Can be swapped to Google Cloud Translation or other providers later.
// Supports auto-detection of source language and bidirectional translation.

export async function POST(req: NextRequest) {
  const { text, target } = await req.json();

  if (!text || !target) {
    return NextResponse.json({ error: 'text and target required' }, { status: 400 });
  }

  // Limit text length
  const trimmed = text.slice(0, 2000);

  try {
    // Auto-detect source: if target is 'en', source is likely 'bn'; otherwise source is 'en'
    const source = target === 'en' ? 'bn' : 'en';

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${source}|${target}&de=anekanta@anekanta.org`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.responseData?.translatedText) {
      return NextResponse.json({
        translated: data.responseData.translatedText,
        source,
        target,
      });
    }

    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Translation service unavailable' }, { status: 503 });
  }
}
