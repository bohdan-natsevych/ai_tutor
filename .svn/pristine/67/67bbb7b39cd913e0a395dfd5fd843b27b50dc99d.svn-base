import { NextRequest, NextResponse } from 'next/server';

// CURSOR: STT API Route - Handles server-side speech-to-text for Whisper
// This is needed because OpenAI Whisper requires API key which shouldn't be exposed to client

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const language = formData.get('language') as string || 'en';

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    // CURSOR: Prepare form data for Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', file, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);
    whisperFormData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      text: data.text || '',
    });
  } catch (error) {
    console.error('STT API error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
