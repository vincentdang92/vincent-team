import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vps
 * List all VPS
 */
export async function GET() {
    try {
        const vpsList = await prisma.vPS.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(vpsList);
    } catch (error) {
        console.error('VPS List API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch VPS list' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/vps
 * Create new VPS
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, ip, port, username, sshKeyPath, region, provider, tags } = body;

        if (!name || !ip || !username) {
            return NextResponse.json(
                { error: 'Name, IP, and username are required' },
                { status: 400 }
            );
        }

        const vps = await prisma.vPS.create({
            data: {
                name,
                ip,
                port: port || 22,
                username,
                sshKeyPath,
                region,
                provider,
                tags: tags || [],
                status: 'DISCONNECTED',
            },
        });

        return NextResponse.json(vps, { status: 201 });
    } catch (error) {
        console.error('VPS Create API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create VPS' },
            { status: 500 }
        );
    }
}
