import { NextRequest, NextResponse } from 'next/server';

// CURSOR: TTS API Route - Handles server-side TTS synthesis for cloud providers
// This is needed because OpenAI TTS requires API key which shouldn't be exposed to client

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'alloy', speed = 1.0, provider = 'openai' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 503 }
        );
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          speed,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI TTS error:', errorText);
        return NextResponse.json(
          { error: 'TTS synthesis failed' },
          { status: response.status }
        );
      }

      const audioBuffer = await response.arrayBuffer();
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Unknown TTS provider' },
      { status: 400 }
    );
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
