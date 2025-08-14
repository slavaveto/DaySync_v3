import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get('path') || 'app';

    try {
        const fullPath = join(process.cwd(), dirPath);
        const entries = await readdir(fullPath);

        const files = await Promise.all(
            entries.map(async (entry) => {
                const entryPath = join(fullPath, entry);
                const stats = await stat(entryPath);

                return {
                    name: entry,
                    path: join(dirPath, entry),
                    type: stats.isDirectory() ? 'directory' : 'file',
                };
            })
        );

        return NextResponse.json(files);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
    }
}