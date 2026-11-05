# Way2meal — Phase 1

Diet-food delivery for a single cloud kitchen: an Android customer app, a web admin panel, and one API. **The source of truth is `docs/REQUIREMENTS.md`.** Read it before changing behaviour. Build one milestone at a time (M1 → M5). At the start of a milestone, write a short plan; at the end, run lint, type-check and tests and report the results.

## Stack

| Part | Tech |
| --- | --- |
| API (`apps/api`) | Node 22+/24 LTS, NestJS 11, Prisma 6, PostgreSQL 16, Zod 4 (`nestjs-zod` DTOs + OpenAPI at `/docs`) |
| Customer app (`apps/mobile`) | Expo SDK 58, React Native 0.88, Expo Router (native tabs, `Stack.Protected`), TanStack Query, Zustand, expo-secure-store |
| Admin panel (`apps/admin`) | Next.js 16 App Router (Cache Components on), Tailwind 4, TanStack Query; shadcn-style components hand-written in `components/ui` |
| Shared (`packages/shared`) | Enums, Zod schemas, IST date/cutoff/service-calendar helpers, paise helpers |
| Tooling | pnpm workspaces, Turborepo, ESLint 9 (flat), Prettier, Jest + Supertest, Testcontainers |

## Layout

```text
apps/api/
  prisma/schema.prisma        # data model (conventions in the header comment)
  prisma/migrations/          # *_invariants holds CHECKs + partial unique index
  prisma/seed-data.ts         # the ONLY place seed business values live
  src/config/env.ts           # Zod-validated env → AppConfig (never read process.env elsewhere)
  src/common/clock/           # Clock (inject everywhere), SystemClock, FixedClock for tests
  src/common/auth/            # @Public, @Roles, @CurrentUser, JwtAuthGuard, RolesGuard (global)
  src/modules/auth/           # OTP login, TokenService, otp/ (OtpProvider, MockOtpProvider, OtpOutbox)
  src/modules/payments/       # PaymentProvider, ManualPaymentProvider
  src/modules/settings/       # SettingsService (DB-backed, schema-validated)
  src/modules/audit/          # AuditService.record(..., tx)
  src/modules/menu/           # MenuService.resolve (override → template, closures), admin menu CRUD
  src/modules/catalogue/      # public /plans /addons /flavours /config + admin CRUD
  src/modules/settings/       # also HolidayService + admin settings/holidays routes
  src/modules/{me,admin,health}/
  src/common/http/            # PrismaExceptionFilter (P2002/P2003 → 409, P2025 → 404), assertRange
  test/                       # *.int-spec.ts against a real Postgres (Testcontainers)
apps/admin/                   # READ apps/admin/AGENTS.md: Next 16 differs from older versions
  src/proxy.ts                # Next 16 "middleware": sends visitors without a session to /login
  src/lib/server/session.ts   # tokens in httpOnly cookies; apiFetch with deduped refresh
  src/app/api/v1/[...path]/   # same-origin gateway to the API (requires x-w2m-csrf on writes)
  src/app/(panel)/            # admin pages (client components, inside a Suspense boundary)
  src/components/             # EntityManager (generic CRUD), MealEditor, WeekPreview, ui/
apps/mobile/                  # READ apps/mobile/AGENTS.md: check Expo SDK 58 docs, use `expo install`
  src/app/                    # routes: login, onboarding, (tabs)/{index,menu,plan,orders,profile}
  src/lib/                    # api (deduped refresh), auth-store (SecureStore), queries
  src/i18n/                   # t('key') + en.ts; add ml.ts with the same keys for Malayalam
packages/shared/src/          # enums, schemas/ (incl. admin input schemas), time/, money/
docs/REQUIREMENTS.md
docker-compose.yml            # postgres:16 + minio
```

Planned modules: `subscriptions`, `deliveries` (`DeliveryService`, M3), `orders` (M4), `notifications` (M5).

## Commands

The `packageManager` field pins pnpm 10. If pnpm isn't installed, use `npx pnpm@10.34.9 <cmd>`.

```bash
pnpm install
cp .env.example apps/api/.env
pnpm db:up                 # docker compose: postgres + minio
pnpm db:migrate            # prisma migrate dev
pnpm db:seed               # idempotent; never overwrites admin edits
pnpm dev:api               # http://localhost:3000/v1, docs at /docs
pnpm dev:admin             # http://localhost:3001 (cp apps/admin/.env.example apps/admin/.env.local)
pnpm dev:mobile            # Expo dev server (cp apps/mobile/.env.example apps/mobile/.env; set your LAN IP)

pnpm lint | pnpm typecheck | pnpm test        # all workspaces via turbo
pnpm build                                     # API, shared, admin (catches Next prerender errors)
pnpm --filter @way2meal/mobile bundle:android  # Metro bundle (catches resolution errors)
# CI runs: format:check, lint, typecheck, build, bundle:android, test
pnpm test:unit                                 # no Docker needed
pnpm --filter @way2meal/api test:integration   # needs Docker
```

With Colima instead of Docker Desktop, Testcontainers needs:
`export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`

## Non-negotiable conventions

- **Money** is integer paise (`*Paise`), INR only. Convert with `rupeesToPaise` and display with `formatPaise`. Never use floats.
- **Time**: store instants as UTC `DateTime`. Service days are IST calendar dates: the `IsoDate` string `YYYY-MM-DD` in code, and `@db.Date` in the DB (convert with `isoDateToDbDate`/`dbDateToIsoDate`). Use the helpers in `packages/shared/src/time`. Never call `new Date().getDay()` or similar host-timezone APIs for business logic.
- **Clock**: never call `new Date()`/`Date.now()` for business logic. Inject `Clock`. Tests use `FixedClock('2026-11-09T09:59:00+05:30')`.
- **No hard-coded business data**: menu, prices, meal counts, skip limits, validity, cutoffs, weekdays, capacity and UPI details come from the DB (`Plan`, `AddOn`, `Setting` via `SettingsService`, …). Seed values live only in `prisma/seed-data.ts`. Subscriptions snapshot plan terms (`mealsTotal`, `maxSkips`, `validityDays`, `pricePaise`) at purchase.
- **Providers**: all OTP sending goes through `OtpProvider` (`OTP_PROVIDER` token) and all money goes through `PaymentProvider` (`PAYMENT_PROVIDER` token). Phase 1 implements only `MockOtpProvider` and `ManualPaymentProvider`. Callers never branch on the concrete provider. Phase 2 adds implementations in the module factories.
- **Rules live on the server**: cutoff, skip limits and carry-forward are enforced in the API (`DeliveryService`, M3) and never only in the app. Every acceptance criterion in REQUIREMENTS.md gets an automated test.
- **Admin login (Phase 1)**: the mock provider shows codes only on the admin panel, so ADMIN accounts can instead enter a static 8–12 digit code whose scrypt hash is in `ADMIN_STATIC_OTP_HASH` (generate it with `pnpm --filter @way2meal/api admin:login-code`). It still needs a live OTP request, so rate limits, attempts and expiry apply. It works only while `OTP_PROVIDER=mock`.
- **Auth**: every route needs a JWT unless it is `@Public()`. `/v1/admin/*` routes need `@Roles(...)`; `RolesGuard` fails closed if one is missing. OTP codes are stored only as HMACs. Refresh tokens are opaque, hashed, rotated, and reuse revokes all of the user's sessions.
- **Audit**: every admin change to menus, prices, credits or payments calls `AuditService.record` inside the same transaction.
- **Paid services**: ask the user before adding any paid third-party service.

## Business rules (summary of REQUIREMENTS.md → "Business rules")

**Service days and time**
- All dates and cutoffs are in IST (Asia/Kolkata). Timestamps are stored in UTC.
- Service days are the admin-configured weekday set (default Mon–Sat; Sunday off). Admin holidays (for one slot or both) are not service days.
- Meals scheduled on a holiday move automatically to the end of the plan.

**Cutoff**
- Each slot has its own cutoff on the delivery day (default 10:00 for both, e.g. Dinner could be 14:00).
- Before cutoff a customer can book, cancel, skip, unskip or add extras for that day. From the cutoff instant onwards the day is locked for customers; only the admin can change it. `isBeforeCutoff` is strict: 09:59:59 is open and 10:00:00 is locked.
- Future bookings are allowed up to `bookingDaysAhead` days (default 7).

**Subscription scheduling**
1. When payment is confirmed (admin approval), create one `Delivery` per meal on the next N service days from the chosen start date.
2. The earliest start is today if before the slot's cutoff, else tomorrow, rolled forward to a service day (`earliestStartDate`).
3. `endDate` is the date of the last scheduled delivery.
4. Invariant: the number of deliveries in SCHEDULED/PREPARING/OUT_FOR_DELIVERY/DELIVERED/MISSED equals `mealsTotal + extraCredits`.

**Skip and carry forward** (skip, unskip and carry-forward always run in one DB transaction)
1. A skip before cutoff marks the delivery `SKIPPED` and appends a `SCHEDULED` carry-forward (`isCarryForward`, `carriedFromId`) on the next service day after the current last delivery. `endDate` moves out.
2. Unskip before cutoff restores the original delivery and removes the most recently appended carry-forward row. The meal count stays constant.
3. A bulk skip over a date range applies rule 1 to each date. Pause skips everything from X until resumed, using the same mechanics.
4. Limits come from the plan snapshot: `maxSkips` (seed: weekly 2, monthly 8) and `validityDays` (all meals delivered within 2× the normal length; seed: 14 / 60). When a limit is hit the API returns **409** with the limit in the message.
5. The admin can grant extra credits (`extraCredits`), and can refund unused credits (recorded manually in Phase 1).
6. An add-on on a skipped day is cancelled, not carried forward.
7. The DB guarantees at most one non-cancelled delivery per subscription per date (partial unique index).

**Trial and daily bookings**
- The customer picks a date and slot, sees that date's menu, adds extras and orders.
- Capacity is a max number of meals per slot per day (`capacity` setting; null = unlimited). Booking closes when the slot is full or after cutoff.
- A trial can be bought once per phone (`Plan.oncePerUser`).
- A cancel before cutoff leads to a credit or refund recorded by the admin.

**Add-ons**
- Add-ons come from an admin catalogue with a price, slots, an active flag and optional daily stock.
- They are always paid separately, and the price is snapshotted on `DeliveryAddOn`.

**Menu**
- The menu for a date is the date+slot override if one exists, else the weekday template.
- Dinner has 6 chicken flavours. The flavour is set per delivery, falls back to the profile default, then to "Kitchen's choice".

**Payments (manual)**
- An order or plan starts as `PENDING_PAYMENT`. The app shows the UPI ID/QR and amount from settings.
- The customer submits a UTR and an optional screenshot. The admin approves, which sets `PAID`, activates the plan and schedules deliveries. The admin can also record cash payments.

**Delivery status flow**
- `SCHEDULED → SKIPPED | PREPARING → OUT_FOR_DELIVERY → DELIVERED | MISSED`.
- Slot cutoff locks deliveries to PREPARING (scheduled job).
- The admin can re-credit a MISSED delivery.

## Status

- **M1 (foundation)**: done. Monorepo, Postgres, schema + migrations, seed, mock-OTP auth, providers, CI.
- **M2 (menu & catalogue)**: done. Public menu/catalogue/config API, audited admin CRUD, admin panel, mobile login + onboarding + Home + Menu.
- **Next: M3**: subscriptions, manual payments, `DeliveryService` (scheduling, skip/unskip/carry-forward), My Plan, S3 uploads, holiday → reschedule hook in `HolidayService.create`.
- Catalogue rows (plans, add-ons, flavours, menu items) are deactivated, never deleted. Plan `kind`/`slot` can't change after creation.
- Open kitchen questions (REQUIREMENTS.md) are seeded as placeholders: add-on prices are ₹0 and inactive, DAILY plans are inactive, flavours are "Flavour 1–6", capacity is unlimited, the UPI VPA is empty (payments are refused until it is set).
