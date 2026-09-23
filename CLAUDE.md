# Working on this repo

Orientation for a session starting cold. Written after a stretch of feature work; the
"Things that will bite you" section is the part that saves the most time.

## What this is

A fork of [Atlas CMMS](https://github.com/grashjs/cmms) — a self-hosted maintenance
management system ("Jira for technicians"). Work orders, assets, preventive maintenance,
parts inventory, meters, requests.

**This fork's defining change: the licensing has been stripped out.** Upstream gates most
features behind a license key. Here they are unconditional. Details in
[Fork-specific changes](#fork-specific-changes) — read that before touching anything that
mentions `License`.

## Layout

```
api/         Java 17 / Spring Boot 3.2 REST API          <- the source of truth
frontend/    React 17 + MUI 5 web app (CRA)              <- the main UI
mobile/      React Native + Expo app                     <- feature-parity client
home/        Next.js marketing site                      <- rarely relevant
dev-docs/    Operator runbooks (backups, ports, nginx, factory reset)
docker-compose.yml   postgres + minio + api + frontend
```

`api`, `frontend` and `mobile` are independent builds. There is no shared package — types
are duplicated between `frontend/src/models/` and `mobile/models/` and must be kept in sync
by hand.

## The API

Spring Boot 3.2, Java 17, PostgreSQL, Liquibase, Hibernate + **Envers** auditing, MapStruct,
Lombok, Quartz, Thymeleaf + iText for PDF reports.

```
api/src/main/java/com/grash/
  model/        112 JPA entities        model/enums/ for enums
  repository/    62 Spring Data repos
  service/       74 services
  controller/    65 REST controllers
  dto/          261 request/response DTOs
  mapper/        51 MapStruct mappers
  factory/       StorageServiceFactory, MailServiceFactory
  configuration/ security, email, quartz, swagger
```

### The pattern to copy

Every domain object follows the same shape. `AdditionalCost` is the cleanest small example;
`WorkOrderDiscrepancy` is a recent one built to match it. To add a feature, mirror these
seven files:

| File | Role |
|---|---|
| `model/Thing.java` | JPA entity, usually extends `CompanyAudit` |
| `repository/ThingRepository.java` | `extends JpaRepository<Thing, Long>` |
| `service/ThingService.java` | `@RequiredArgsConstructor`, `saveAndFlush` + `em.refresh` |
| `controller/ThingController.java` | `@RestController`, `@PreAuthorize("hasRole('ROLE_CLIENT')")` |
| `dto/ThingPatchDTO.java` | partial-update payload |
| `dto/ThingShowDTO.java` | response shape, often `extends AuditShowDTO` |
| `mapper/ThingMapper.java` | `@Mapper(componentModel = "spring")` |

### Base classes

- `model/abstracts/CompanyAudit` — gives `id` (sequence-generated), `company`, and a
  `@PrePersist` that fills `company` from the SecurityContext. Also a `@PostLoad` that
  **throws** if a user loads another company's row. Multi-tenancy is enforced here.
- `model/abstracts/Audit` — `createdAt/updatedAt/createdBy/updatedBy`.
- `dto/AuditShowDTO` — the DTO counterpart.

### Permissions

Three independent layers, easy to confuse:

1. **Role permissions** — `user.getRole().getCreatePermissions().contains(PermissionEntity.X)`.
   Also `getViewPermissions()`, `getViewOtherPermissions()`, `getEditOtherPermissions()`.
2. **Plan features** — `user.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.X)`.
   New companies get the `BUSINESS` plan, seeded with `PlanFeatures.values()`, so this rarely blocks.
3. **License entitlements** — `licenseService.hasEntitlement(...)`. **Almost entirely removed
   in this fork.** See below.

Work orders also have `workOrder.canBeEditedBy(user)`, which is what most write paths check.

### Liquibase

`ddl-auto: validate` — Hibernate will refuse to start if an entity doesn't match the schema.
Every schema change needs a changeset.

```bash
cd api && node scripts/generate-liquibase.js --author="Name" --name="what_it_does"
```

Creates `db/changelog/YYYY_MM_DD_<unix>_<name>.xml` **and registers the `<include>` in
`db/master.xml`**. Conventions that are easy to get wrong:

- **Sequences**: `@GeneratedValue(AUTO)` reads `<table>_seq`, `incrementBy 50`. New tables
  need an explicit `<createSequence>`.
- **Enums are ordinals in `SMALLINT`** columns, not strings — see
  `2026_01_10_1768015926_enums_type.xml`. Adding an enum value mid-list renumbers everything
  after it; always append.
- Guard risky changes with `<preConditions onFail="MARK_RAN">` so they no-op where already applied.
- `master.xml` is an append-only include list. Merge conflicts in it are always "keep both sides".

### File storage

Nothing is stored in the database. `StorageServiceFactory` returns `MinioService` (default)
or `GCPService` based on `STORAGE_TYPE`.

- `StorageService.upload(MultipartFile, folder)` returns an **object key**, stored as `File.path`.
- **URLs are always signed and expiring** — minted at serialization time in `FileMapper`
  (180 min) and in the PDF report path (5 min). Never persist or cache one.
- `utils/MultipartFileImpl` wraps a `byte[]` as a `MultipartFile` — the bridge for
  server-generated images (signatures, PDF reports, CSV exports).
- `FileService.createFromImageDataUri(dataUri, name, folder)` decodes a base64 data URI,
  validates MIME and size (2 MB cap), uploads, and records a hidden `File` row.

### Work order specifics

`WorkOrderController` is the largest controller (~500 lines). Notable paths:

- `PATCH /work-orders/{id}/change-status` — the completion flow. Handles signature capture,
  `requiredSignature` enforcement, labor stop, asset downtime, PM rescheduling, notifications.
- `GET /work-orders/report/{id}` — Thymeleaf → iText PDF, uploaded to storage, returns a
  signed URL. Template: `resources/templates/work-order-report.html`.
  **Its `#{...}` keys resolve against `mailMessages*.properties`, not `messages*.properties`**
  (see `configuration/EmailConfiguration`). 14 locale files, ISO-8859-1, non-ASCII as `\uXXXX`.
- Work-order-to-work-order links use `model/Relation` with `RelationTypeInternal`
  (`SPLIT_FROM`, `BLOCKS`, `DUPLICATE_OF`, `RELATED_TO`). The client renders direction based on
  whether the current WO is parent or child — see `groupRelations` in `WorkOrderDetails.tsx`.

## The web app

React **17**, TypeScript, CRA via `react-app-rewired`, MUI 5, Redux Toolkit + thunks,
Formik + Yup, react-i18next.

```
frontend/src/
  content/own/<Feature>/     screens, one dir per domain area
  content/own/components/    shared widgets, incl. form/
  slices/                    one Redux slice per domain
  store/rootReducer.ts       every slice must be registered here
  models/owns/               TypeScript mirrors of the API DTOs
  contexts/                  CompanySettingsContext (uploadFiles, formatting), auth, snackbar
  i18n/translations/         14 locales, flat key/value TS objects
```

### The generic form

Most UI is driven by `content/own/components/form/index.tsx`, which renders an array of
`IField` (`content/own/type.ts`) inside Formik. Field `type` values: `text`, `number`,
`select`, `date`, `switch`, `checkbox`, `file`, `signature`, `partQuantity`, `coordinates`…

A screen defines fields + a Yup shape and hands them to `<Form>`. To add a field type, add it
to the `IField` union and a branch in the renderer.

Select values arrive as `{label, value}`. Convert before sending:

- entity references → `formatSelect(v)` → `{id: number}` (`utils/formatters.ts`)
- multi → `formatSelectMultiple(v)`
- plain enums → `v?.value` directly (`formatSelect` would wrongly wrap it as an id)

### Slices

`slices/additionalCost.ts` is the template: state keyed by parent id, a `loadingX` map, thunks
calling `utils/api.ts` (**`fetch`, not axios**). Register in `store/rootReducer.ts` or the
`useSelector` destructure throws.

`AppThunk` returns `Promise<StoreReturnType>` (`void | number | number[] | string | ImportResponse`) —
that's why `addWorkOrder` can return the new id.

## The mobile app

React Native + Expo, react-native-paper, same Redux/Formik/i18n patterns, its own copies of
models and slices. Screens in `screens/`, routes registered in `navigation/index.tsx` with
params typed in `types.tsx`.

Mirrors the web almost 1:1 — a feature added to one usually belongs in both. `theme` from
`useTheme()` is base MD3; use `useAppTheme()` from `custom-theme.ts` for `success`/`warning`.

## Running it

### Docker (the real deployment)

```bash
docker compose up -d --build
```

`docker compose build` alone leaves running containers on the old image — always `up -d --build`.

### Locally, for verifying API changes

Postgres is installed in most dev environments:

```bash
service postgresql start
su postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\" -c 'CREATE DATABASE atlas;'"
cd api && DB_URL=localhost:5432/atlas DB_USER=postgres DB_PWD=postgres \
  JWT_SECRET_KEY=... KEYGEN_PRODUCT_TOKEN= OAUTH2_PROVIDER= STORAGE_TYPE=minio \
  mvn -DskipTests spring-boot:run
```

Required env vars are every `${VAR}` in `application*.yml`:
`DB_PWD DB_URL DB_USER ENABLE_EMAIL_NOTIFICATIONS INVITATION_VIA_EMAIL JWT_SECRET_KEY
KEYGEN_PRODUCT_TOKEN MAIL_RECIPIENTS OAUTH2_PROVIDER PUBLIC_API_URL PUBLIC_FRONT_URL STORAGE_TYPE`.
Blank is fine for most.

Leave all `MINIO_*` **empty** to boot without storage — `MinioService.init()` skips when
unconfigured. Set them and the app won't start unless something answers on that port. Anything
touching uploads or signed URLs then needs a real MinIO or a stub answering `HEAD /bucket`,
`GET /bucket?location=` and `PUT /bucket/key`.

Then sign up and drive it over HTTP:

```bash
curl -X POST localhost:8080/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"Password123!","firstName":"A","lastName":"B","phone":"+1","companyName":"Co","employeesCount":2}'
curl -X POST localhost:8080/auth/signin -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"Password123!","type":"client"}'   # -> accessToken
```

### Checks worth running

```bash
cd api      && mvn -B -DskipTests compile     # catches MapStruct regeneration breaks
cd api      && mvn -B test                    # only FileServiceSignatureTest exists
cd frontend && npx tsc --noEmit -p tsconfig.json
cd frontend && npx react-app-rewired build    # slow (~5 min) but the real deploy path
cd mobile   && npx tsc --noEmit -p tsconfig.json
```

`tsc` on `frontend` prints many errors from `node_modules/i18next` — TypeScript 4.7 vs
i18next 25 typings. Pre-existing and harmless. **Filter with `grep -v "^node_modules/"`;**
zero remaining lines means clean.

Test coverage is effectively nil (one unit test). Verify by running things, not by trusting
a green build.

## Fork-specific changes

Divergences from upstream. Preserve them — a naive "sync fork" wipes them (it has happened).

**License enforcement removed.** `LicenseEntitlement` checks were deleted across services and
controllers, so every feature works without a key: time tracking, cost tracking, work order
linking, file/image uploads, signature capture, asset hierarchy, downtime, custom roles,
customers/vendors, NFC/barcode, field configuration, workflows, voice notes, meter-triggered PM,
PM calendar, work order history, branding. Free-tier caps (`UNLIMITED_*` on work orders,
locations, parts, meters, checklists, PM schedules) are gone too — `checkUsageBasedLimit` is a
no-op in each service.

The `LicenseEntitlement` enum still exists (the clients mirror it). Only `API_ACCESS` is still
enforced, in `SwaggerAccessController` and `SwaggerSecurityConfig`, because it governs whether
API docs are publicly exposed. `AssetService` uses `!true` for its removed checks — an earlier
edit, left as-is.

The **plan-feature** layer (`PlanFeatures`) is separate and still present. It doesn't block in
practice since new companies get `BUSINESS`.

**Signatures** are drawn on a canvas and stored in object storage, referenced by
`work_order.signature_id`. Pre-existing base64 signatures still render via the read-only
`legacySignature` field mapped to the old `work_order.signature` TEXT column.

**Work order discrepancies** (squawks) — `WorkOrderDiscrepancy`, with a "raise a derived work
order" flow that links via a `SPLIT_FROM` relation.

**Risk assessments** — `RiskAssessment`, a company-wide safety hazard register at
`/app/risk-assessments` (its own sidebar entry), with columns from the HSE risk assessment
template. A row's action can be raised as a work order through the regular work order form
(`content/own/WorkOrders/workOrderForm.ts`, shared with the work orders screen); the "done" column
is read live off that work order's `completedOn`, never stored. Web only for now, no mobile screen.

## Things that will bite you

**Never press "Sync fork" on GitHub.** It force-replaces `main` with upstream and drops this
fork's commits. Recovery: find the old SHA (reachable from any pushed branch) and
`git push --force-with-lease origin <sha>:main`.

**MapStruct nulls out absent fields on partial updates.** The default update mapping writes
`null` for every DTO field not sent, so a patch of one field wipes the rest — and trips
`@NotNull`. `WorkOrderDiscrepancyMapper` guards this with
`@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)`.
**Most other patch mappers do not** and carry this latent bug.

**`frontend/.npmrc` sets `legacy-peer-deps=true`** and is load-bearing — i18next 25 wants
TypeScript 5, the project pins 4.7. Anything installing without it (a Docker layer that copies
only `package*.json`) fails with `ERESOLVE`. `frontend/Dockerfile` copies `.npmrc` explicitly.

**Browser caching hides deploys.** `frontend/nginx-custom.conf` sets no `Cache-Control`, so
browsers heuristically cache `index.html` and serve the whole old bundle. After deploying, hard
refresh or use a private window. To confirm what the server actually has:
`docker compose exec frontend grep -rl <a-new-string> /usr/share/nginx/html/static/js`.

**Canvas export is expensive.** `toDataURL` on a signature pad costs ~10 ms at 2x DPR and
produces a ~440 KB base64 string; 3x nearly doubles both. Don't run it per stroke — see the
debounce-plus-flush in `frontend/src/content/own/components/form/SignaturePad.tsx`.

**Envers audits most entities.** `@Audited` fields write to `*_aud` tables; changing a field's
type means the audit table needs the matching column too.

**Lazy `@OneToOne` on a detached entity blows up in mappers.** Prefer plain `@OneToOne` for a
single `File` on an entity, as `WorkOrderBase.image` does.
