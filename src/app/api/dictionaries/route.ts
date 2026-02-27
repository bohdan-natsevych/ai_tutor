import { NextRequest, NextResponse } from 'next/server';
import { createDictionary, getDictionaries, updateDictionary, deleteDictionary, getOrCreateDefaultDictionary } from '@/lib/db/queries';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/dictionaries - List all dictionaries for current user
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure default dictionary exists
    await getOrCreateDefaultDictionary(session.userId);
    const dicts = await getDictionaries(session.userId);
    return NextResponse.json({ dictionaries: dicts });
  } catch (error) {
    console.error('Dictionaries GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch dictionaries' }, { status: 500 });
  }
}

// POST /api/dictionaries - Create a new dictionary
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Dictionary name is required' }, { status: 400 });
    }

    const dictionary = await createDictionary(session.userId, name.trim());
    return NextResponse.json({ dictionary });
  } catch (error) {
    console.error('Dictionaries POST error:', error);
    return NextResponse.json({ error: 'Failed to create dictionary' }, { status: 500 });
  }
}

// PATCH /api/dictionaries - Rename a dictionary
export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name } = await request.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Dictionary ID and name are required' }, { status: 400 });
    }

    await updateDictionary(id, { name: name.trim() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dictionaries PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update dictionary' }, { status: 500 });
  }
}

// DELETE /api/dictionaries?id=xxx - Delete a dictionary
export async function DELETE(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Dictionary ID is required' }, { status: 400 });
    }

    await deleteDictionary(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dictionaries DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete dictionary' }, { status: 500 });
  }
}
