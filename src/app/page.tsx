import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-bold mb-4 glow-blue">
                        AI DevOps Guardian
                    </h1>
                    <p className="text-xl text-gray-400 mb-2">
                        AI-Managed Infrastructure with Zero-Trust Security
                    </p>
                    <p className="text-sm text-gray-500">
                        Phase 1: Core Infrastructure
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-gray-900/50 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all glow-blue">
                        <h2 className="text-2xl font-bold text-blue-400 mb-3">
                            🛡️ Security First
                        </h2>
                        <p className="text-gray-300 mb-4">
                            Multi-layer Guardian Filter with CRITICAL/HIGH/MEDIUM risk detection.
                            Blocks destructive commands automatically.
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>✓ Pattern matching & obfuscation detection</li>
                            <li>✓ Real-time security alerts</li>
                            <li>✓ Complete audit trail</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6 hover:border-green-500/60 transition-all glow-green">
                        <h2 className="text-2xl font-bold text-green-400 mb-3">
                            🤖 Multi-Agent System
                        </h2>
                        <p className="text-gray-300 mb-4">
                            DevOps, Security, Backend, Frontend, and QA agents working together.
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>✓ Autonomous SSH & Docker operations</li>
                            <li>✓ Real-time reasoning logs</li>
                            <li>✓ Scalable architecture</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all">
                        <h2 className="text-2xl font-bold text-purple-400 mb-3">
                            📊 Real-time Dashboard
                        </h2>
                        <p className="text-gray-300 mb-4">
                            Cyberpunk-style UI with live log streaming via Socket.io.
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>✓ "The War Room" chat interface</li>
                            <li>✓ VPS status monitoring</li>
                            <li>✓ Deployment tracking</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-6 hover:border-yellow-500/60 transition-all glow-yellow">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-3">
                            🚀 Production Ready
                        </h2>
                        <p className="text-gray-300 mb-4">
                            Built with Next.js 15, Prisma, Socket.io, and TypeScript.
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>✓ PostgreSQL database</li>
                            <li>✓ Zustand state management</li>
                            <li>✓ Full type safety</li>
                        </ul>
                    </div>
                </div>

                <div className="text-center">
                    <Link
                        href="/dashboard"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-all glow-blue text-lg"
                    >
                        Enter Dashboard →
                    </Link>

                    <p className="mt-6 text-gray-500 text-sm">
                        Status: <span className="text-green-400">● Online</span> |
                        Phase: <span className="text-blue-400">1 - Core Infrastructure</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
