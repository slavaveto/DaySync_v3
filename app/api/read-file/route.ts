import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    try {
        const fullPath = join(process.cwd(), filePath);
        const content = await readFile(fullPath, 'utf-8');

        return new NextResponse(content, {
            headers: { 'Content-Type': 'text/plain' },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
}