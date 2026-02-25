/**
 * Stack Library — prebuilt expert prompt snippets per technology.
 * Each entry describes THE EXPERT KNOWLEDGE an agent should have for that tech.
 *
 * Used by prompt-builder.ts to compose dynamic system prompts.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StackConfig {
    frontend?: string;
    backend?: string;
    database?: string;
    testing?: string;
    deploy?: string;
    mobile?: string;
}

export interface StackChoice {
    label: string;
    description: string; // 1-liner shown in the UI
    promptSnippet: string; // injected into agent system prompt
}

export type StackCategory = keyof StackConfig;

// ── Library ───────────────────────────────────────────────────────────────────
export const STACK_LIBRARY: Record<StackCategory, Record<string, StackChoice>> = {
    // ── Frontend ─────────────────────────────────────────────────────────────
    frontend: {
        'HTML': {
            label: 'Plain HTML Landing Page',
            description: 'Simple HTML5 + CSS3 + vanilla JS, no framework',
            promptSnippet: `Frontend: Plain HTML5 / CSS3 / Vanilla JS — simple static landing page.
- Single-file or multi-file structure: index.html, style.css, main.js
- Use semantic HTML5 tags: <header>, <nav>, <main>, <section>, <footer>
- CSS: custom properties (--color-*), Flexbox + Grid layouts, media queries for mobile-first responsive
- No build tools; pure <link> and <script> tags; CDN for icons (e.g. Font Awesome)
- Animations: CSS @keyframes or the Web Animations API (no jQuery)
- Performance: lazy-load images (loading="lazy"), minimize HTTP requests
- Accessibility: aria-label, role attributes, keyboard-navigable focus styles
- Deployment: serve as static files — Netlify, GitHub Pages, or any web host`,
        },
        'Bootstrap': {
            label: 'Bootstrap 5 Landing Page',
            description: 'HTML + Bootstrap 5 components, no build step',
            promptSnippet: `Frontend: HTML5 + Bootstrap 5 (CDN) landing page.
- Load via CDN: <link> bootstrap.min.css + <script> bootstrap.bundle.min.js
- Use Bootstrap grid: container, row, col-* with responsive breakpoints (sm/md/lg/xl)
- Components: navbar (navbar-expand-lg), hero jumbotron, cards, accordion, modal, carousel
- Utilities: spacing (m-*, p-*), colors (text-primary, bg-dark), display (d-flex, align-items-center)
- Custom CSS override file loaded after Bootstrap CDN for brand colors
- Icons: Bootstrap Icons CDN (<i class="bi bi-*">)
- Forms: Bootstrap form-control, form-label, btn btn-primary with validation classes
- JavaScript: use data-bs-* attributes for interactive components (no manual JS needed)
- Responsive images: img-fluid class; use <picture> with srcset for art direction`,
        },
        'React+Vite': {
            label: 'React + Vite',
            description: 'React 18, Vite, TanStack Query',
            promptSnippet: `Frontend: React 18 + Vite.
- Use functional components with hooks (useState, useEffect, useCallback, useMemo)
- State management: Zustand or React Context; TanStack Query for server state
- HTTP: Axios or native fetch with custom hooks
- Routing: React Router v6 (BrowserRouter)
- Styling: CSS Modules or Tailwind CSS
- Build tool: Vite (vite.config.ts); never use CRA
- TypeScript strict mode; no implicit any`,
        },
        'Next.js': {
            label: 'Next.js App Router',
            description: 'Next.js 15+, Server Components, App Router',
            promptSnippet: `Frontend: Next.js 15 App Router.
- Default to Server Components; use 'use client' only when needed (interactivity, hooks)
- Data fetching: async Server Components, fetch with caching, Server Actions
- Routing: App Router file conventions (page.tsx, layout.tsx, loading.tsx, error.tsx)
- Styling: Tailwind CSS 4 or CSS Modules
- Images: next/image; Links: next/link
- TypeScript strict; no 'any' types`,
        },
        'Vue3': {
            label: 'Vue 3',
            description: 'Vue 3 Composition API, Pinia, Vue Router',
            promptSnippet: `Frontend: Vue 3 + Vite.
- Use Composition API exclusively (<script setup> syntax)
- State management: Pinia stores
- Routing: Vue Router 4 (createRouter, createWebHistory)
- HTTP: Axios with composables (useAxios or custom)
- Styling: Scoped CSS or Tailwind CSS
- TypeScript: defineProps<{}>(), defineEmits<{}>() generics`,
        },
        'Angular': {
            label: 'Angular 17+',
            description: 'Angular, RxJS, NgRx, standalone components',
            promptSnippet: `Frontend: Angular 17+ (standalone components).
- Use standalone components (no NgModule where avoidable)
- State: NgRx signals or services with BehaviorSubject
- HTTP: HttpClient with typed observables; interceptors for auth
- Routing: Angular Router with lazy-loaded routes
- Forms: Reactive Forms (FormBuilder)
- TypeScript strict; use inject() function over constructor injection`,
        },
        'Svelte': {
            label: 'SvelteKit',
            description: 'SvelteKit, Svelte stores, SSR',
            promptSnippet: `Frontend: SvelteKit.
- Use +page.svelte, +layout.svelte, +page.server.ts conventions
- State: Svelte stores (writable, derived, readable)
- Data loading: load() in +page.server.ts or +page.ts
- Forms: SvelteKit form actions (enhance directive)
- Styling: Scoped <style> or Tailwind CSS
- TypeScript: typed load functions (PageServerLoad, Actions)`,
        },
    },

    // ── Backend ──────────────────────────────────────────────────────────────
    backend: {
        'Express': {
            label: 'Express.js',
            description: 'Express, REST, middleware pattern',
            promptSnippet: `Backend: Express.js + TypeScript.
- Structure: routes/, controllers/, services/, middlewares/, models/
- Validation: Zod or Joi schemas on every input
- Error handling: centralized error middleware (next(err))
- Auth: JWT with express-jwt or passport-jwt
- CORS: cors() middleware configured per environment
- Use async/await with express-async-errors
- HTTP codes: 200/201/400/401/403/404/409/422/500`,
        },
        'NestJS': {
            label: 'NestJS',
            description: 'NestJS, decorators, DI, TypeORM/Prisma',
            promptSnippet: `Backend: NestJS + TypeScript.
- Module/Controller/Service pattern with @Module, @Controller, @Injectable
- Validation: class-validator + class-transformer DTOs on every endpoint
- Auth: Passport.js strategies + @UseGuards(AuthGuard)
- Exception: throw HttpException or use built-in exceptions
- Config: @nestjs/config with validated ConfigService
- Database: TypeORM entities or Prisma (use @InjectRepository or PrismaService)`,
        },
        'FastAPI': {
            label: 'FastAPI',
            description: 'FastAPI, Pydantic, async Python',
            promptSnippet: `Backend: FastAPI + Python 3.11+.
- Use async def for all route handlers
- Validation: Pydantic v2 models (BaseModel) for request/response
- Structure: routers/, schemas/, services/, models/, dependencies/
- Auth: OAuth2PasswordBearer + JWT (python-jose)
- DB: SQLAlchemy 2.0 async or Motor (MongoDB async)
- Dependency injection via Depends()
- Always include response_model in route decorators`,
        },
        'Django': {
            label: 'Django + DRF',
            description: 'Django 5, Django REST Framework',
            promptSnippet: `Backend: Django 5 + Django REST Framework.
- Use class-based views (ModelViewSet, APIView) with DRF
- Serializers for every model (ModelSerializer)
- Auth: djangorestframework-simplejwt for JWT
- Permissions: IsAuthenticated, custom permission classes
- URL patterns: include() with DRF routers
- Settings: split into base/development/production
- Use select_related/prefetch_related to avoid N+1`,
        },
        'Laravel': {
            label: 'Laravel 11',
            description: 'Laravel, Eloquent, REST API',
            promptSnippet: `Backend: Laravel 11 + PHP 8.3.
- Structure: Controllers/, Services/, Requests/, Resources/
- Validation: Form Request classes (php artisan make:request)
- Eloquent ORM: relationships, scopes, accessors
- Auth: Laravel Sanctum for API token auth
- Resources: API Resources for transforming responses
- Queues: Laravel Jobs for async operations
- Always use route model binding`,
        },
    },

    // ── Database ─────────────────────────────────────────────────────────────
    database: {
        'MongoDB': {
            label: 'MongoDB + Mongoose',
            description: 'MongoDB, Mongoose ODM, aggregations',
            promptSnippet: `Database: MongoDB + Mongoose.
- Define Mongoose schemas with TypeScript interfaces (IUser + UserDocument)
- Always add indexes: @Index on frequently queried fields
- Use aggregation pipelines for complex queries
- Avoid N+1: use .populate() or aggregation $lookup
- Transactions: session.withTransaction() for multi-document ops
- Soft deletes: add deletedAt field, never hard delete user data
- Connection: singleton mongoose.connect() with retry logic`,
        },
        'PostgreSQL': {
            label: 'PostgreSQL + Prisma',
            description: 'PostgreSQL, Prisma ORM, type-safe queries',
            promptSnippet: `Database: PostgreSQL + Prisma ORM.
- Define schema in prisma/schema.prisma; run prisma migrate dev
- Use Prisma Client typed queries; never raw SQL unless necessary
- Relations: @relation with proper cascade rules
- Transactions: prisma.$transaction([]) or interactive transactions
- Indexes: @@index on composite, @unique for natural keys
- Use select/include to avoid over-fetching
- Singleton PrismaClient in lib/prisma.ts`,
        },
        'MySQL': {
            label: 'MySQL + Prisma',
            description: 'MySQL 8, Prisma or Sequelize',
            promptSnippet: `Database: MySQL 8 + Prisma.
- Same Prisma patterns as PostgreSQL; datasource db { provider = "mysql" }
- Use VARCHAR lengths explicitly; TEXT for long strings
- Engine: InnoDB for all tables (supports transactions, FK)
- Use EXPLAIN to optimize slow queries
- JSON columns supported in MySQL 8+
- Connection pooling via PlanetScale or direct pool config`,
        },
        'Supabase': {
            label: 'Supabase',
            description: 'Supabase, PostgreSQL, RLS, Realtime',
            promptSnippet: `Database: Supabase (PostgreSQL).
- Use Supabase client (@supabase/supabase-js) for queries
- Row Level Security (RLS) on every table — never disable
- Auth: supabase.auth.signIn/signUp; use user.id for RLS policies
- Realtime: supabase.channel().on() for live subscriptions
- Storage: supabase.storage for file uploads
- Edge Functions for serverless logic close to DB
- Environment: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`,
        },
        'Firebase': {
            label: 'Firebase + Firestore',
            description: 'Firebase, Firestore, Auth, Storage',
            promptSnippet: `Database: Firebase Firestore.
- Use modular SDK (firebase/firestore, firebase/auth)
- Collections/documents structure; avoid deep nesting (max 2 levels)
- Security rules: match /{document=**} — always restrict by auth
- Queries: where(), orderBy(), limit() — always paginate
- Batched writes for multi-document updates
- onSnapshot() for real-time listeners; unsubscribe on cleanup
- Use server timestamps: serverTimestamp()`,
        },
    },

    // ── Testing ──────────────────────────────────────────────────────────────
    testing: {
        'Vitest': {
            label: 'Vitest',
            description: 'Vitest, Testing Library, MSW',
            promptSnippet: `Testing: Vitest + Testing Library.
- Unit tests: vi.fn() mocks, vi.spyOn(), vi.mock() for modules
- Component tests: @testing-library/react renderHook/render
- API mocks: MSW (msw/node) for fetch interception
- Test file: *.test.ts alongside source or in __tests__/
- Coverage: vitest --coverage with c8
- Always test: happy path, error path, edge cases`,
        },
        'Jest': {
            label: 'Jest + Supertest',
            description: 'Jest, Supertest for API testing',
            promptSnippet: `Testing: Jest + Supertest.
- jest.config.ts with ts-jest transformer
- API tests: Supertest with Express app instance (not running server)
- Unit tests: jest.fn(), jest.spyOn(), jest.mock()
- DB tests: use in-memory MongoDB (mongodb-memory-server) or test DB
- Hooks: beforeAll/afterAll for DB setup/teardown
- describe/it/expect structure; meaningful test names`,
        },
        'Pytest': {
            label: 'Pytest',
            description: 'Pytest, pytest-asyncio, httpx',
            promptSnippet: `Testing: Pytest + httpx.
- Use pytest fixtures for setup/teardown
- Async tests: @pytest.mark.asyncio with pytest-asyncio
- HTTP testing: httpx.AsyncClient with FastAPI TestClient
- DB: use test database, rollback transactions after each test
- Factories: factory_boy for model instances
- Mocking: unittest.mock.patch or pytest-mock (mocker fixture)`,
        },
        'Playwright': {
            label: 'Playwright E2E',
            description: 'Playwright, page object model',
            promptSnippet: `Testing: Playwright E2E.
- Use Page Object Model (POM) pattern — one class per page
- Locators: getByRole, getByLabel, getByTestId (data-testid attrs)
- Wait strategy: never use page.waitForTimeout(); use expect().toBeVisible()
- API mocking: page.route() to intercept requests in tests
- Fixtures: extend test with custom fixtures for auth state
- Always test: navigation, form submission, error states`,
        },
    },

    // ── Deploy ───────────────────────────────────────────────────────────────
    deploy: {
        'Docker+VPS': {
            label: 'Docker + VPS',
            description: 'Docker, docker-compose, Nginx',
            promptSnippet: `Deploy: Docker + Linux VPS.
- Multi-stage Dockerfile: builder → production (alpine base)
- docker-compose.yml: app + db + nginx services
- Nginx: reverse proxy to app container, SSL via Let's Encrypt (certbot)
- Environment: .env.production (never commit); pass via --env-file
- Health checks: HEALTHCHECK in Dockerfile
- Zero-downtime: docker-compose up --no-deps --build app
- Logs: docker logs -f, centralize with Loki or CloudWatch`,
        },
        'Vercel': {
            label: 'Vercel',
            description: 'Vercel, edge functions, preview deployments',
            promptSnippet: `Deploy: Vercel.
- vercel.json for rewrites/headers/functions config
- Environment variables: set in Vercel dashboard; use vercel env pull
- Edge functions for auth middleware (middleware.ts)
- Preview deployments on every PR branch
- ISR (Incremental Static Regeneration) for cacheable pages
- Vercel KV / Blob / Postgres for integrated storage`,
        },
        'Railway': {
            label: 'Railway',
            description: 'Railway, managed databases, auto-deploy',
            promptSnippet: 'Deploy: Railway.\n' +
                '- railway.toml or Dockerfile for build config\n' +
                '- Environment: Railway dashboard variables; reference with ${{VAR_NAME}} syntax\n' +
                '- Managed databases: Railway PostgreSQL/MySQL/Redis (auto-provisioned)\n' +
                '- Health checks: set RAILWAY_HEALTHCHECK_TIMEOUT_SEC\n' +
                '- Monorepo: use rootDirectory in railway.toml\n' +
                '- Auto-deploy from GitHub main branch',
        },
    },

    // ── Mobile ───────────────────────────────────────────────────────────────
    mobile: {
        'React Native + Expo': {
            label: 'React Native + Expo',
            description: 'React Native, Expo SDK 52, NativeWind',
            promptSnippet: `Mobile: React Native + Expo SDK 52.
- Use Expo Router (file-based routing, same as Next.js App Router)
- Styling: NativeWind (Tailwind for RN) or StyleSheet.create()
- State: Zustand or TanStack Query for server state
- Navigation: expo-router with (tabs)/ and (stack)/ layout groups
- Native APIs: expo-camera, expo-location, expo-notifications (managed workflow)
- Platform splits: Platform.OS === 'ios' | 'android' for conditional logic
- TypeScript strict; use typed useLocalSearchParams<{ id: string }>()
- Build: EAS Build (eas build --platform all); OTA updates via EAS Update`,
        },
        'Flutter': {
            label: 'Flutter',
            description: 'Flutter 3.x, Dart, Riverpod, GoRouter',
            promptSnippet: `Mobile: Flutter 3.x + Dart 3.
- State: Riverpod 2.x (ref.watch, ref.read, AsyncNotifier)
- Routing: GoRouter with typed routes (TypedGoRoute)
- UI: Material 3 widgets; use Theme.of(context).colorScheme for theming
- Async: async/await with AsyncValue for loading/error/data states
- DI: Riverpod providers — never use singletons or GetIt directly
- Platform channels: MethodChannel only for features not in pub.dev
- Testing: flutter_test + mocktail; use ProviderScope.overrides in widget tests
- Build: flutter build apk / ipa; CI via GitHub Actions + fastlane`,
        },
        'Swift + SwiftUI': {
            label: 'Swift + SwiftUI',
            description: 'Swift 5.9, SwiftUI, Combine, Swift Concurrency',
            promptSnippet: `Mobile: Swift 5.9 + SwiftUI (iOS 17+).
- Architecture: MVVM with ObservableObject / @Observable macro (iOS 17+)
- Async: Swift Concurrency (async/await, Task, Actor) — no callback pyramids
- Networking: URLSession with async/await; Codable for JSON
- State: @State, @StateObject, @EnvironmentObject, @Environment
- Navigation: NavigationStack (programmatic) + NavigationPath
- Persistence: SwiftData (iOS 17+) or Core Data; UserDefaults for prefs
- DI: inject dependencies via init; avoid singletons
- Testing: XCTest + Swift Testing framework; ViewInspector for SwiftUI
- UI principles: adaptive layouts (GeometryReader), Dynamic Type, Dark Mode`,
        },
        'Kotlin + Compose': {
            label: 'Kotlin + Jetpack Compose',
            description: 'Kotlin, Jetpack Compose, ViewModel, Hilt',
            promptSnippet: `Mobile: Kotlin + Jetpack Compose (Android).
- Architecture: MVVM + Clean Architecture (domain/data/presentation layers)
- DI: Hilt (@HiltViewModel, @Inject, @Module)
- Async: Kotlin Coroutines + Flow (StateFlow, SharedFlow)
- Navigation: Navigation Compose with typed safe-args
- UI: Material Design 3 (MaterialTheme, colorScheme)
- State: UiState sealed class (Loading, Success, Error) in ViewModel
- Network: Retrofit 2 + OkHttp + Moshi/Gson; optional Ktor client
- DB: Room with KSP; use @Dao, @Entity, @Database
- Testing: JUnit5, MockK, Turbine (Flow testing), ComposeTestRule`,
        },
        'Capacitor + Ionic': {
            label: 'Capacitor + Ionic',
            description: 'Ionic, Capacitor, Angular/React, WebView',
            promptSnippet: `Mobile: Ionic + Capacitor (Hybrid).
- UI Components: Ionic UI Kit (@ionic/react or @ionic/angular)
- Web runtime: runs in WebView via Capacitor; shares 95% code with web app
- Native APIs: @capacitor/camera, @capacitor/geolocation, @capacitor/push-notifications
- Custom native: Capacitor Plugin with Swift (iOS) + Kotlin (Android) bridge
- Build: npx cap sync; npx cap open ios / android (requires Xcode / Android Studio)
- PWA: falls back gracefully to web PWA when not packaged as native
- Routing: same web router (React Router, Angular Router)
- Best for: teams with existing web app wanting native packaging`,
        },
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Get all option keys for a category, e.g. ['React+Vite', 'Next.js', ...] */
export function getStackOptions(category: StackCategory): string[] {
    return Object.keys(STACK_LIBRARY[category]);
}

/** Get the choice metadata for a specific stack option */
export function getStackChoice(category: StackCategory, key: string): StackChoice | undefined {
    return STACK_LIBRARY[category]?.[key];
}

/** Default stack (used for new projects if nothing is specified) */
export const DEFAULT_STACK: StackConfig = {
    frontend: 'Next.js',
    backend: 'Express',
    database: 'PostgreSQL',
    testing: 'Vitest',
    deploy: 'Docker+VPS',
};
