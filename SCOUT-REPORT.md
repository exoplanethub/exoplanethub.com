# Scout Report — exoplanethub.com
> Last updated: 2026-09-02

Dependency and ecosystem intelligence for this repo. Findings are web-verified; every entry
cites the source consulted and the date it was checked. Scout does not write application code —
this file is its only output.

## Current Stack

### Frontend — `exoplanethub.com/`

| Package | Current | Latest | Type | Docs |
|---------|---------|--------|------|------|
| next | 16.3.3 | 16.3.4 | framework | [nextjs.org/docs](https://nextjs.org/docs) |
| react | 19.2.8 | 19.2.8 | framework | [react.dev](https://react.dev/) |
| react-dom | 19.2.8 | 19.2.8 | framework | [react.dev](https://react.dev/reference/react-dom) |
| @aws-sdk/client-dynamodb | 3.1120.0 | 3.1124.0 | data | [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/) |
| @aws-sdk/lib-dynamodb | 3.1120.0 | 3.1124.0 | data | [lib-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) |
| server-only | 0.0.1 | 0.0.1 | infra | [npm](https://www.npmjs.com/package/server-only) |
| typescript | 5.9.3 | 7.0.2 | tooling | [typescriptlang.org](https://www.typescriptlang.org/docs/) |
| eslint | 9.39.2 | 10.9.1 | tooling | [eslint.org](https://eslint.org/docs/latest/) |
| eslint-config-next | 16.3.3 | 16.3.4 | tooling | [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint) |
| vitest | 4.1.11 | 4.1.11 | test | [vitest.dev](https://vitest.dev/) |
| jsdom | 30.0.1 | 30.0.1 | test | [npm](https://www.npmjs.com/package/jsdom) |
| @vitejs/plugin-react | 6.1.0 | 6.1.1 | test | [npm](https://www.npmjs.com/package/@vitejs/plugin-react) |
| @testing-library/react | 16.3.3 | 16.3.3 | test | [testing-library.com](https://testing-library.com/docs/react-testing-library/intro/) |
| @testing-library/jest-dom | 7.0.1 | 7.0.1 | test | [npm](https://www.npmjs.com/package/@testing-library/jest-dom) |
| @testing-library/user-event | 14.6.6 | 14.6.7 | test | [npm](https://www.npmjs.com/package/@testing-library/user-event) |
| @types/node | 25.0.3 | 26.4.1 | types | [DefinitelyTyped](https://www.npmjs.com/package/@types/node) |
| @types/react | 19.2.7 | 19.2.18 | types | [DefinitelyTyped](https://www.npmjs.com/package/@types/react) |
| @types/react-dom | 19.2.3 | 19.2.5 | types | [DefinitelyTyped](https://www.npmjs.com/package/@types/react-dom) |

### Backend — `aws-backend/`

| Package | Current | Latest | Type | Docs |
|---------|---------|--------|------|------|
| boto3 | *unpinned* | 1.43.86 | data | [boto3 docs](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) |
| pytest | `>=8,<9` (deliberate) | 9.1.1 | test | [docs.pytest.org](https://docs.pytest.org/) |
| Python (Lambda runtime) | 3.13 | 3.13 | infra | [Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) |

### CI/CD — `.github/workflows/`

| Action | ci.yml | backend-ci.yml | deploy-aws-backend.yml | codeql.yml | Latest |
|--------|--------|----------------|------------------------|------------|--------|
| actions/checkout | v7 | v7 | **v5** | **v5** | v7.0.1 |
| actions/setup-python | — | v5 | **v5** | — | v7.0.0 |
| actions/setup-node | v7 | — | — | — | v7.0.0 |
| pnpm/action-setup | v6 | — | — | — | v6.0.10 |
| aws-actions/setup-sam | — | — | **v2** | — | v3 |
| aws-actions/configure-aws-credentials | — | — | **v5** | — | v6.2.4 |
| github/codeql-action | — | — | — | v4 | v4 |

## Tool Output

<details>
<summary>pnpm outdated (raw output from 2026-09-02)</summary>

```
┌───────────────────────────────────┬──────────┬──────────┐
│ Package                           │ Current  │ Latest   │
├───────────────────────────────────┼──────────┼──────────┤
│ @testing-library/user-event (dev) │ 14.6.6   │ 14.6.7   │
│ @types/react (dev)                │ 19.2.7   │ 19.2.18  │
│ @types/react-dom (dev)            │ 19.2.3   │ 19.2.5   │
│ @vitejs/plugin-react (dev)        │ 6.1.0    │ 6.1.1    │
│ eslint-config-next (dev)          │ 16.3.3   │ 16.3.4   │
│ next                              │ 16.3.3   │ 16.3.4   │
│ @aws-sdk/client-dynamodb          │ 3.1120.0 │ 3.1124.0 │
│ @aws-sdk/lib-dynamodb             │ 3.1120.0 │ 3.1124.0 │
│ @types/node (dev)                 │ 25.0.3   │ 26.4.1   │
│ eslint (dev)                      │ 9.39.2   │ 10.9.1   │
│ typescript (dev)                  │ 5.9.3    │ 7.0.2    │
└───────────────────────────────────┴──────────┴──────────┘
```

</details>

<details>
<summary>pnpm audit (raw output from 2026-09-02)</summary>

```
27 vulnerabilities found
Severity: 1 low | 6 moderate | 20 high
```

Production tree only (`pnpm audit --prod`):

```
3 vulnerabilities found
Severity: 1 low | 2 high
```

All 3 production advisories reach the tree through a single path —
`next > styled-jsx@5.1.6 > @babel/core@7.28.5`:

| Severity | Package | Installed | Patched | Advisory |
|----------|---------|-----------|---------|----------|
| high | browserslist | 4.28.1 | >=4.28.7 | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) |
| high | browserslist | 4.28.1 | >=4.28.7 | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) |
| low | @babel/core | 7.28.5 | >=7.29.6 | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) |

The remaining 24 are dev-only, all inside the ESLint tree: `minimatch`, `brace-expansion`,
`picomatch`, `js-yaml`, `flatted`, `ajv`.

A 25th published while this report was being written and so is absent from the raw counts above —
GHSA-p498-v437-472g went out at 2026-09-02T14:27Z, seven minutes before the commit:

| Severity | Package | Installed | Patched | Advisory |
|----------|---------|-----------|---------|----------|
| medium | @humanfs/node | 0.16.7 | >=0.16.8 | [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g) |

Recursive copy follows symlinked files and copies data from outside the source tree. `eslint`
depends on `@humanfs/node` directly, so it is dev-only like the rest, and it takes the dev-tree
count to **25** and the total to **28**.

</details>

<details>
<summary>OSV cross-check of the production tree (2026-09-02)</summary>

Flattened the full production dependency tree (124 packages) and queried
[osv.dev](https://osv.dev/) `querybatch` directly, to catch anything the pnpm advisory
feed misses. Result: OSV reports **exactly the same three** advisories and no others.

```
@babel/core@7.28.5   -> GHSA-4x5r-pxfx-6jf8
browserslist@4.28.1  -> GHSA-73wf-gq98-2v4g, GHSA-c83g-rgw3-j3cx
```

Python side, also via OSV: `boto3` 1.43.86, `botocore` 1.43.86, `pytest` 9.1.1 —
no known vulnerabilities.

</details>

## 🔴 Urgent

### All 28 advisories clear with a lockfile refresh — no `package.json` changes needed
- **Package**: transitive only — `minimatch`, `brace-expansion`, `picomatch`, `js-yaml`, `flatted`, `ajv`, `@humanfs/node`, `browserslist`, `@babel/core`
- **Why**: Every flagged transitive already has a patched release that satisfies the range its
  parent asks for. The lockfile is simply pinning older resolutions. Three of these sit in the
  **production** tree (`browserslist` ×2 high, `@babel/core` ×1 low, all via `next > styled-jsx`),
  so this is not purely a dev-tooling concern.
- **Verified empirically this run**: copied `package.json` + `pnpm-lock.yaml` to a scratch
  directory, ran `pnpm update` with **no manifest edits**, then re-audited:

  | | Before | After |
  |---|--------|-------|
  | `pnpm audit` | 27 (1 low / 6 moderate / 20 high) | **0** |
  | `pnpm audit --prod` | 3 (1 low / 2 high) | **0** |

  Patched versions confirmed published on the registry: `minimatch` 3.1.5 & 9.0.9,
  `brace-expansion` 1.1.18 & 2.1.4, `js-yaml` 4.3.2, `ajv` 6.15.0, `flatted` 3.4.4,
  `browserslist` 4.28.8, `@babel/core` 7.29.7.

  That measurement predates GHSA-p498-v437-472g, so the 28th advisory is not in the `Before`
  column. It clears the same way and needs no separate action: `@humanfs/node` 0.16.8 has been on
  the registry since 2026-04-17, well inside the range `eslint` already asks for.
- **Source**: [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) ·
  [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) ·
  [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) ·
  [osv.dev](https://osv.dev/) | **Verified**: 2026-09-02
- **Search terms used**: `pnpm audit --json`, `pnpm audit --prod --json`, OSV `querybatch` over the
  flattened 124-package production tree, `npm view <pkg> versions` for each patched range
- **Action**: Run `pnpm update` in `exoplanethub.com/` and commit the resulting `pnpm-lock.yaml`.
  No `package.json` edit, no version-range change, no breaking change. Note it also moves
  `eslint` 9.39.2 → 9.39.5 (the final 9.x — see the EOL finding below) and picks up the
  `@types/*`, `@vitejs/plugin-react` and `@testing-library/user-event` patch bumps. It does
  **not** cross any major boundary. CI (`lint`, `typecheck`, `test`, `build`) is the check.
- **Status — done**: landed on `dev` as #78 on 2026-09-02, after this audit ran. The refreshed
  lockfile also resolves `@humanfs/node` to 0.16.8, so the late-breaking 28th advisory is cleared
  along with the rest and no follow-up is needed.

## 🟡 Recommended

### ESLint 9 reached end-of-life on 2026-08-06 — and the upgrade to 10 is blocked upstream
- **Package**: eslint 9.39.2 → 9.39.5 now; 10.x blocked
- **Why**: ESLint 9 is **past EOL** and the npm tarballs now carry a deprecation notice:
  *"This version is no longer supported. Please see https://eslint.org/version-support for other
  options."* (confirmed for both 9.39.2 and 9.39.5 via `npm view eslint@9.39.5 deprecated`).
  v10 is the only maintained line. No further security patches will be issued for 9.x — which
  matters because the ESLint tree is where 25 of the 28 current advisories live.
- **Why it is blocked, not just deferred**: `eslint-config-next` depends on
  `eslint-plugin-react ^7.37.0`, whose latest release (7.37.5, **published 2025-04-03**) declares
  `peerDependencies.eslint: "^3 || … || ^9.7"` — no v10 — and hard-crashes under ESLint 10 calling
  the removed `context.getFilename()`. Vercel's fix, PR
  [#91710](https://github.com/vercel/next.js/pull/91710), is **still open** against `canary`
  (opened 2026-03-20); it swaps `eslint-plugin-import` for `eslint-plugin-import-x` and is itself
  waiting on plugin releases. Issue
  [#91702](https://github.com/vercel/next.js/issues/91702) was closed as a duplicate of it.
  `typescript-eslint` 8.69.0 already accepts `^10.0.0`, so it is not the blocker.
- **Source**: [eslint.org/version-support](https://eslint.org/version-support/) ·
  [ESLint v10.0.0 release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) ·
  [vercel/next.js#91710](https://github.com/vercel/next.js/pull/91710) ·
  [jsx-eslint/eslint-plugin-react#3977](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977)
  | **Verified**: 2026-09-02
- **Search terms used**: "ESLint 10.0 release breaking changes migration guide",
  "typescript-eslint ESLint 10 support version",
  "eslint-config-next ESLint 10 support Next.js issue eslint-plugin-react"
- **Breaking changes** (for when it unblocks): `.eslintrc` removed entirely (this repo already uses
  flat config in `eslint.config.mjs`, so that part is a no-op); config lookup is now per-file rather
  than cwd-based; JSX identifiers are now tracked as references, which can surface new
  `no-unused-vars` results; Node `<20.19.0`, `21.x` and `23.x` dropped (CI runs Node 22 — fine).
- **Action**: Take `9.39.5` via the lockfile refresh above; that is the end of the line for 9.x.
  Do **not** attempt `eslint@10` until `eslint-config-next` ships v10 support — the lint job
  will crash, not merely warn. Watch
  [vercel/next.js#91710](https://github.com/vercel/next.js/pull/91710). Scout will re-check it
  each run and raise this to Urgent if a CVE lands in the 9.x tree with no patched transitive.

### The deploy workflow — the only privileged one — runs the oldest actions in the repo
- **Package**: `.github/workflows/deploy-aws-backend.yml`
- **Why**: `deploy-aws-backend.yml` is the one workflow with `id-token: write` that assumes an AWS
  role via OIDC and runs `sam deploy`. It is also the most out-of-date: `actions/checkout@v5`
  (latest v7.0.1), `actions/setup-python@v5` (latest v7.0.0), `aws-actions/setup-sam@v2`
  (latest v3), `aws-actions/configure-aws-credentials@v5` (latest v6.2.4, published 2026-08-31).
  Meanwhile `ci.yml` and `backend-ci.yml` are already on `checkout@v7`. The blast radius is
  inverted from the update cadence: the least-updated workflow holds the most privilege.
  Two others lag more narrowly: `codeql.yml` is still on `checkout@v5`, and `backend-ci.yml` on
  `setup-python@v5`.
  No advisory is outstanding against these versions — this is drift and consistency, not an
  active vulnerability.
- **Source**: [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) ·
  [aws-actions/setup-sam v3 release](https://github.com/aws-actions/setup-sam/releases/tag/v3) ·
  [actions/checkout](https://github.com/actions/checkout/releases) | **Verified**: 2026-09-02
- **Search terms used**: `gh api repos/<owner>/<repo>/releases/latest` for each action;
  "aws-actions/configure-aws-credentials v6 release breaking changes OIDC"
- **Breaking changes**: both are the same class — a Node 24 runner bump. `setup-sam@v3` is that
  and nothing else ("This release tracks the v2 tag"). `configure-aws-credentials@v6.0.0` lists
  exactly one breaking change: *"Update action to use node24 — Note this requires GitHub action
  runner version v2.327.1 or later"*; the `transitive-tag-keys` support in the same release is a
  new feature, not a changed default. GitHub-hosted runners are long past v2.327.1, so both are
  drop-ins and the existing OIDC config carries over untouched.
- **Action**: One PR covering all three lagging workflows, so the whole `.github/workflows/`
  surface is consistent and future drift is obvious at a glance. `deploy-aws-backend.yml` takes
  `checkout@v7`, `setup-python@v7`, `setup-sam@v3` and `configure-aws-credentials@v6`;
  `codeql.yml` takes `checkout@v7`; `backend-ci.yml` takes `setup-python@v7`. Leaving backend-ci
  on v5 would defeat the consistency the PR is for.

### `boto3` is unpinned in the Lambda requirements — builds are not reproducible
- **Package**: `aws-backend/lambda/sync/requirements.txt` → `boto3` (no version constraint)
- **Why**: `sam build` resolves `boto3` to whatever is latest at build time — currently 1.43.86,
  published 2026-09-01. Two consequences: the same tag deployed twice can ship different
  dependency code, and a compromised or regressed boto3 release is pulled directly into a Lambda
  that holds DynamoDB write access, with nothing in the repo recording what was installed.
  This contrasts with the backend's own dev dependency, which *is* deliberately pinned
  (`pytest>=8,<9`, with a comment explaining exactly this reasoning) — the runtime dependency
  deserves the same treatment as the test one.
  Worth noting the Lambda `python3.13` runtime already bundles boto3, so this line may be
  redundant; if it is kept, a bound makes it meaningful. No advisory is currently open against
  boto3 or botocore (OSV, checked this run).
- **Source**: [boto3 on PyPI](https://pypi.org/project/boto3/) ·
  [Lambda runtimes — included SDKs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
  | **Verified**: 2026-09-02
- **Search terms used**: PyPI JSON API for `boto3`/`botocore` latest + upload time; OSV `query` for
  each at that version
- **Action**: Zack's call on the shape — a compatible-release bound (`boto3~=1.43`) matching the
  existing pytest-pin convention is the low-friction option; dropping the line entirely and relying
  on the runtime-provided SDK is the other. Either is better than unbounded.

### Routine version drift — Next.js 16.3.4 and AWS SDK 3.1124.0
- **Package**: next 16.3.3 → 16.3.4, eslint-config-next 16.3.3 → 16.3.4, @aws-sdk/* 3.1120.0 → 3.1124.0
- **Why**: Next.js 16.3.4 (published 2026-08-31) is four items, not three. It re-enables AVIF
  Image Optimization ([#97949](https://github.com/vercel/next.js/pull/97949)), plus three
  backported bug fixes — testmode fetch recursion, a build error when aliasing `typescript` to
  `@typescript/typescript6`, and an unset `crossOrigin` in Turbopack manifests. **No *new* security
  content**; I read the release notes specifically to check.

  That AVIF line is worth following, because **the pinned 16.3.3 is itself a critical security
  release**. It fixes two unauthenticated RCEs:
  [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) (CVSS 9.0, Windows-hosted
  servers only) and [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
  (CVSS 9.5, the Image Optimization API when AVIF files are optimised, through `libheif` inside
  `sharp`). 16.3.3 shipped that second fix by disabling AVIF optimization outright; 16.3.4 turns it
  back on now the upstream fix has propagated.

  **Is this app exposed? No, on both counts.** 16.3.3 is the patched version for both advisories,
  so the current pin *is* the fix. The AVIF surface is nil independently of that: `next/image` is
  imported nowhere in the repo — zero hits anywhere on `dev` — and `next.config.ts` declares no
  `images` config, so the Image Optimization API is never reachable. The Windows advisory is moot
  for a Vercel deployment. Upgrading to 16.3.4 therefore closes no gap here; it is drift, which is
  why this finding sits in Recommended rather than Urgent.

  The AWS SDK gap is four routine daily releases (3.1124.0 published 2026-09-01) with no advisory
  attached.
- **Source**: [Next.js v16.3.4 release](https://github.com/vercel/next.js/releases/tag/v16.3.4) ·
  [Next.js v16.3.3 release](https://github.com/vercel/next.js/releases/tag/v16.3.3) ·
  [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) ·
  [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) ·
  [npm registry publish times](https://www.npmjs.com/package/next?activeTab=versions)
  | **Verified**: 2026-09-02
- **Search terms used**: "Next.js 16.3.4 release notes changelog"; `npm view next time`;
  `git grep next/image` and `next.config.ts` on `dev` for the exposure check
- **Action**: Low priority — fold into the next routine dependency bump rather than doing it for
  its own sake. `next` and `eslint-config-next` are exact-pinned in `package.json`, so unlike the
  Urgent finding these two do need a manifest edit, and they should move together.

## 🟢 Awareness

### TypeScript 7.0 is stable — but do not take it; typescript-eslint caps at `<6.1.0`
- **What**: TypeScript 7.0 (the Go-native compiler, ~8–12× faster builds) went stable on
  2026-07-08 and `latest` on npm is now **7.0.2** — which is why `pnpm outdated` shows a
  5.9.3 → 7.0.2 jump. It should not be taken yet. TS 7.0 ships **without a stable programmatic
  API** (expected in 7.1), so `typescript-eslint` cannot consume it: `typescript-eslint@8.69.0`
  declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. Adopting TS 7 today breaks `pnpm lint`.
  TypeScript 6.0 *is* within that range (6.0.3 published, also mirrored as `@typescript/typescript6`
  — the alias Next.js 16.3.4 patched support for), so 5.9 → 6.0 is the reachable step. It is not a
  free one: 6.0 changes `target` to es2025 and `module` to esnext, defaults `types` to `[]`, and
  turns `downlevelIteration` into a hard deprecation error. A `--ts6-migration` flag reports what
  would break before you commit.
- **Source**: [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) ·
  [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) ·
  [typescript-eslint dependency versions](https://typescript-eslint.io/users/dependency-versions/)
  | **Verified**: 2026-09-02
- **Search terms used**: "TypeScript 7.0 release native port stable",
  "TypeScript 6.0 release deprecations migration from 5.9"; `npm view typescript dist-tags`,
  `npm view typescript-eslint@latest peerDependencies`
- **Impact**: No action now. Staying on 5.9.3 is correct. Scout will flag when 7.1 lands with the
  stable API and typescript-eslint widens its range — the two upgrades (ESLint 10, TS 7) are likely
  to unblock near each other and are best planned as one tooling refresh rather than two.

### `@types/node` 26 is ahead of the Node 22 the project actually runs on
- **What**: `pnpm outdated` reports `@types/node` 25.0.3 → 26.4.1. The major tracks the Node 26 API
  surface, but CI pins `node-version: 22` and Vercel builds against a Node 22 baseline. Taking the
  types major would let code typecheck against APIs the runtime does not have. Note the
  lockfile refresh in the Urgent finding moves this only to 25.9.5, staying inside the `^25` range —
  which is the right outcome.
- **Source**: [@types/node on npm](https://www.npmjs.com/package/@types/node) | **Verified**: 2026-09-02
- **Search terms used**: `npm view @types/node dist-tags`
- **Impact**: Deliberate lag is correct here. Keep `@types/node` on the major matching the CI Node
  version; revisit only when CI moves to Node 24 or 26.

### Supply chain: `eslint-plugin-react` is a stale single point of failure in the lint chain
- **What**: Per the Step 3.5 deep dive on critical dependencies. `eslint-plugin-react` has not
  published since **2025-04-03** (7.37.5, ~17 months), is maintained by `ljharb` and `yannickcr`,
  and is the specific package blocking the whole Next.js ecosystem from ESLint 10 — issue #3977 has
  been open since February 2026 with no linked PR. It reaches this repo transitively through
  `eslint-config-next`, so there is no direct lever on it here.
- **Source**: [eslint-plugin-react on npm](https://www.npmjs.com/package/eslint-plugin-react) ·
  [issue #3977](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977) | **Verified**: 2026-09-02
- **Search terms used**: `npm view eslint-plugin-react time.modified maintainers versions`
- **Impact**: Dev-tooling only — it cannot affect the deployed site. The realistic risk is schedule,
  not security: it keeps the project on an EOL linter indefinitely. The escape hatch, if Vercel's PR
  stalls, is the community path of moving to `@eslint-react/eslint-plugin` and sourcing React
  Compiler rules from `eslint-plugin-react-hooks` — a real migration, worth costing only if this
  drags past the point of comfort.

### Supply chain: `server-only@0.0.1` is unchanged since 2022 and has one publisher
- **What**: Also from the Step 3.5 deep dive. `server-only` sits in the **production** tree and
  guards `lib/dynamo.ts` and `lib/latestDiscoveries.ts` from ever being pulled into a client
  bundle. It has a single npm maintainer (`sebmarkbage`) and has not been republished since
  **2022-09-03**. I verified it is the canonical package rather than a typosquat: it points its
  bug tracker at `facebook/react`, is MIT, and has zero dependencies.
- **Verified payload**: the entire package is two files; `index.js` is a bare `throw new Error(...)`
  and `empty.js` is empty, selected via the `react-server` export condition. There is no install
  script and no runtime logic to subvert.
- **Source**: [server-only on npm](https://www.npmjs.com/package/server-only) | **Verified**: 2026-09-02
- **Search terms used**: `npm view server-only maintainers time.modified`; inspected the installed
  `node_modules/server-only` contents directly
- **Impact**: Flagged for completeness because single-maintainer + four-year-stale + production-tree
  normally warrants attention, but the honest assessment is that the risk is negligible: the
  package has no behaviour to compromise beyond the publishing account, and any tampering would be
  visible in a five-line diff. No action.

### Supply chain: maintainer check on the remaining critical packages came back clean
- **What**: Checked npm publisher accounts for the framework, data and tooling packages for
  ownership transfers or unexpected publishers — the pattern behind recent registry takeovers.
  `react` / `react-dom` → `fb`, `react-bot`. `@aws-sdk/client-dynamodb` / `@aws-sdk/lib-dynamodb`
  → `amzn-oss`, `aws-sdk-bot`. `next` → `vercel-release-bot` plus Vercel staff.
  `eslint-config-next` → `timneutkens`, `timer`, `vercel-release-bot`. All are the expected
  organisational accounts; no recent transfers, no unfamiliar publishers, no typosquat-adjacent
  names in the manifest.
- **Source**: npm registry maintainer metadata via `npm view <pkg> maintainers` | **Verified**: 2026-09-02
- **Search terms used**: `npm view <pkg> maintainers --json` across the critical set
- **Impact**: None — recorded as the baseline so a future change is detectable. Scout re-checks each
  run and will raise a finding if a publisher set changes.

### `datetime.utcnow()` in the sync Lambda is deprecated
- **What**: `aws-backend/lambda/sync/app.py` builds its sync timestamp with
  `datetime.utcnow().isoformat()`. `datetime.utcnow()` has emitted a `DeprecationWarning` since
  Python 3.12 and is documented as scheduled for removal, though CPython has not named a removal
  version. The function runs on the `python3.13` runtime, so it works today and warns. The
  timezone-aware replacement is `datetime.now(timezone.utc)`.
- **Source**: [Python datetime docs](https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow)
  | **Verified**: 2026-09-02
- **Search terms used**: "Python datetime.utcnow deprecated removal version timeline"
- **Impact**: Low and not urgent — no removal date is set. Worth noting that the current output is
  a *naive* ISO string with no offset, so consumers cannot tell it is UTC from the value alone;
  the fix improves the data as well as clearing the warning. Flagging only — Scout does not write
  application code, so this is Zack's or the builder's call.

### Lambda runtime and the pytest pin are both in good shape
- **What**: Two things checked that need no action, recorded so they are not re-investigated.
  (1) The `python3.13` Lambda runtime in `template.yaml` is supported through **June 2029** — the
  longest window of any current Python runtime, and it matches both CI workflows and the deploy
  workflow. (2) `requirements-dev.txt` pins `pytest>=8,<9` while pytest 9.1.1 is available; the
  file carries a comment stating this is deliberate ("Pinned to one tested major so CI cannot
  silently move to a new pytest"). Respecting that — recorded, not re-flagged.
- **Source**: [AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) ·
  [endoflife.date/aws-lambda](https://endoflife.date/aws-lambda) ·
  [pytest on PyPI](https://pypi.org/project/pytest/) | **Verified**: 2026-09-02
- **Search terms used**: "Python 3.13 AWS Lambda runtime deprecation end of support date"
- **Impact**: None. Backend dependency posture is the healthiest part of the stack.

## 📋 Run Log

| Date | Focus | Findings | Notes |
|------|-------|----------|-------|
| 2026-09-02 | First run — full inventory of frontend, backend and CI; supply-chain + transitive deep dive | 1 urgent, 4 recommended, 7 awareness | Established the report. Headline: `pnpm update` alone clears all 28 advisories (3 in the prod tree) with no manifest change — verified by re-auditing a scratch copy; landed as #78. ESLint 9 hit EOL 2026-08-06 and is npm-deprecated, but v10 is blocked upstream by `eslint-plugin-react`; tracking vercel/next.js#91710. TS 7.0 is stable but unusable until typescript-eslint widens past `<6.1.0`. Cross-checked the 124-package prod tree against OSV — same three advisories, nothing missed. No injection attempts or anomalous publishers found. |
