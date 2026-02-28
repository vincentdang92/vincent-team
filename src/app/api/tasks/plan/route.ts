/**
 * POST /api/tasks/plan — Preview the agent plan without executing anything.
 * Returns: { assignedRole, plan: { taskSummary, riskLevel, requiresApproval, steps[] } }
 * No Task DB record is created, no agent execution occurs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/agents/orchestrator/orchestrator.agent';
import { z } from 'zod';

const planSchema = z.object({
    userRequest: z.string().min(1).max(2000),
    projectId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = planSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { userRequest, metadata } = parsed.data;

        const orchestrator = getOrchestrator();
        const { assignedRole, plan } = await orchestrator.planOnly({
            userRequest,
            projectId: parsed.data.projectId,
            metadata,
        });

        return NextResponse.json({ assignedRole, plan });
    } catch (err) {
        console.error('[/api/tasks/plan POST]', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
