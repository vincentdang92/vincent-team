/**
 * POST /api/execute — Legacy endpoint, now routes via DevOpsAgent.run()
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DevOpsAgent } from '@/agents/devops/devops.agent';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { command, vpsId } = body as { command?: string; vpsId?: string };

        if (!command || !vpsId) {
            return NextResponse.json(
                { error: 'command and vpsId are required' },
                { status: 400 }
            );
        }

        const agent = new DevOpsAgent();
        await agent.initialize();

        const { plan, results } = await agent.run({
            userRequest: `Execute: ${command}`,
            vpsId,
        });

        return NextResponse.json({
            success: !results.some(r => r.startsWith('ERROR')),
            output: results.join('\n'),
            plan: plan.taskSummary,
            riskLevel: plan.riskLevel,
        });
    } catch (error) {
        console.error('Execute API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
