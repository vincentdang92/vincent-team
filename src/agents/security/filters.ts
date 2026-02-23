import { RiskLevel, CommandStatus } from '@prisma/client';
import {
    CRITICAL_PATTERNS,
    HIGH_RISK_PATTERNS,
    MEDIUM_RISK_PATTERNS,
    OBFUSCATION_PATTERNS,
} from './patterns';

export interface FilterResult {
    isAllowed: boolean;
    riskLevel: RiskLevel;
    riskScore: number; // 0-100
    blockReason?: string;
    sanitizedCommand: string;
    detectedPatterns: string[];
    requiresApproval: boolean;
}

/**
 * Guardian Filter - The Red Line
 * 
 * Multi-layer security validation:
 * 1. Input Sanitization
 * 2. Obfuscation Detection
 * 3. Pattern Matching
 * 4. Context Analysis
 * 5. Risk Scoring & Decision
 */
export class GuardianFilter {
    /**
     * Main entry point - validates command safety
     */
    static async validate(rawCommand: string): Promise<FilterResult> {
        // Step 1: Sanitize input
        const sanitized = this.sanitizeInput(rawCommand);

        // Step 2: Check for obfuscation
        const obfuscationCheck = this.detectObfuscation(sanitized);
        if (obfuscationCheck.detected) {
            return {
                isAllowed: false,
                riskLevel: 'CRITICAL',
                riskScore: 100,
                blockReason: `Obfuscation detected: ${obfuscationCheck.method}`,
                sanitizedCommand: sanitized,
                detectedPatterns: obfuscationCheck.patterns,
                requiresApproval: false,
            };
        }

        // Step 3: Pattern matching
        const patternCheck = this.checkPatterns(sanitized);

        // Step 4: Context analysis
        const contextCheck = this.analyzeContext(sanitized);

        // Step 5: Calculate final risk score
        const riskScore = Math.max(patternCheck.score, contextCheck.score);
        const riskLevel = this.scoreToLevel(riskScore);

        // Step 6: Make decision
        const isAllowed = riskScore < 70;
        const requiresApproval = riskScore >= 40 && riskScore < 70;

        return {
            isAllowed,
            riskLevel,
            riskScore,
            blockReason: isAllowed ? undefined : patternCheck.reason,
            sanitizedCommand: sanitized,
            detectedPatterns: [...patternCheck.patterns, ...contextCheck.patterns],
            requiresApproval,
        };
    }

    /**
     * Step 1: Sanitize and normalize input
     */
    private static sanitizeInput(input: string): string {
        return input
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\\\n/g, ''); // Remove line continuations
    }

    /**
     * Step 2: Detect obfuscation attempts
     */
    private static detectObfuscation(command: string): {
        detected: boolean;
        method?: string;
        patterns: string[];
    } {
        const detected: string[] = [];

        for (const pattern of OBFUSCATION_PATTERNS) {
            if (pattern.test(command)) {
                detected.push(pattern.source);
            }
        }

        return {
            detected: detected.length > 0,
            method: detected.length > 0 ? 'Multiple obfuscation techniques' : undefined,
            patterns: detected,
        };
    }

    /**
     * Step 3: Check against dangerous patterns
     */
    private static checkPatterns(command: string): {
        score: number;
        reason?: string;
        patterns: string[];
    } {
        const detected: string[] = [];
        const lowerCommand = command.toLowerCase();

        // Check CRITICAL patterns
        for (const pattern of CRITICAL_PATTERNS) {
            if (pattern.test(lowerCommand)) {
                detected.push(pattern.source);
                return {
                    score: 100,
                    reason: `CRITICAL: Destructive command detected - ${pattern.source}`,
                    patterns: detected,
                };
            }
        }

        // Check HIGH risk patterns
        for (const pattern of HIGH_RISK_PATTERNS) {
            if (pattern.test(lowerCommand)) {
                detected.push(pattern.source);
                return {
                    score: 80,
                    reason: `HIGH RISK: Potentially dangerous operation - ${pattern.source}`,
                    patterns: detected,
                };
            }
        }

        // Check MEDIUM risk patterns
        for (const pattern of MEDIUM_RISK_PATTERNS) {
            if (pattern.test(lowerCommand)) {
                detected.push(pattern.source);
                return {
                    score: 50,
                    reason: `MEDIUM RISK: Requires monitoring - ${pattern.source}`,
                    patterns: detected,
                };
            }
        }

        return { score: 0, patterns: [] };
    }

    /**
     * Step 4: Analyze command context
     */
    private static analyzeContext(command: string): {
        score: number;
        patterns: string[];
    } {
        let score = 0;
        const patterns: string[] = [];

        // Command chaining with dangerous operators
        if (/;|&&|\|\|/.test(command)) {
            score += 20;
            patterns.push('Command chaining detected');
        }

        // Pipe to shell
        if (/\|\s*(bash|sh|zsh|fish)/.test(command)) {
            score += 30;
            patterns.push('Pipe to shell detected');
        }

        // Redirection to sensitive files
        if (/>+\s*\/etc\//.test(command)) {
            score += 40;
            patterns.push('Redirect to /etc/ detected');
        }

        // Sudo usage
        if (/sudo\s+/.test(command)) {
            score += 15;
            patterns.push('Sudo usage detected');
        }

        return { score, patterns };
    }

    /**
     * Step 5: Convert score to RiskLevel enum
     */
    private static scoreToLevel(score: number): RiskLevel {
        if (score >= 90) return 'CRITICAL';
        if (score >= 70) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        return 'LOW';
    }
}
