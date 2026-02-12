import { NextRequest, NextResponse } from 'next/server';
import { addVocabulary, getAllVocabulary, deleteVocabulary } from '@/lib/db/queries';

// CURSOR: Vocabulary API Route - CRUD for saved words

// GET /api/vocabulary - Get all saved vocabulary
export async function GET() {
  try {
    const vocabulary = await getAllVocabulary();
    return NextResponse.json({ vocabulary });
  } catch (error) {
    console.error('Vocabulary GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vocabulary' },
      { status: 500 }
    );
  }
}

// POST /api/vocabulary - Add new word to vocabulary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, translation, example, context } = body;

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    const entry = await addVocabulary({
      word,
      translation,
      example,
      context,
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Vocabulary POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add vocabulary' },
      { status: 500 }
    );
  }
}

// DELETE /api/vocabulary?id=xxx - Delete vocabulary entry
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await deleteVocabulary(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vocabulary DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vocabulary' },
      { status: 500 }
    );
  }
}
