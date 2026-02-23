/**
 * Project Config — helpers for reading / writing project configs from the DB.
 */

import { prisma } from './prisma';
import { StackConfig, DEFAULT_STACK } from './stack-library';

export interface ProjectConfig {
    id: string;
    name: string;
    description?: string | null;
    stack: StackConfig;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get a project's full config including its stack.
 */
export async function getProjectConfig(projectId: string): Promise<ProjectConfig | null> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) return null;

    return {
        ...project,
        stack: (project.stack as StackConfig) ?? DEFAULT_STACK,
    };
}

/**
 * Create a new project with a given stack config.
 */
export async function createProject(params: {
    name: string;
    description?: string;
    stack?: StackConfig;
}): Promise<ProjectConfig> {
    const project = await prisma.project.create({
        data: {
            name: params.name,
            description: params.description,
            stack: (params.stack ?? DEFAULT_STACK) as object,
        },
    });

    return {
        ...project,
        stack: (project.stack as StackConfig) ?? DEFAULT_STACK,
    };
}

/**
 * Update the stack config for an existing project.
 */
export async function updateProjectStack(
    projectId: string,
    stack: Partial<StackConfig>
): Promise<ProjectConfig | null> {
    const existing = await getProjectConfig(projectId);
    if (!existing) return null;

    const merged: StackConfig = { ...existing.stack, ...stack };

    const project = await prisma.project.update({
        where: { id: projectId },
        data: { stack: merged as object },
    });

    return {
        ...project,
        stack: merged,
    };
}

/**
 * List all projects (most recent first).
 */
export async function listProjects(): Promise<ProjectConfig[]> {
    const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return projects.map(p => ({
        ...p,
        stack: (p.stack as StackConfig) ?? DEFAULT_STACK,
    }));
}

/**
 * Delete a project by ID.
 */
export async function deleteProject(projectId: string): Promise<void> {
    await prisma.project.delete({ where: { id: projectId } });
}
