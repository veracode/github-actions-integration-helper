# Plan — SPEC-PENH-2744

Ticket: PENH-2744
Branch: sdd/PENH-2744-show-finding-severity
Allowed paths:
- `src/utils/severity.ts`
- `test/unit/utils/severity.test.ts`
- `src/services/policy-results-services.ts`
- `test/unit/services/policy-results-service.test.ts`
- `src/services/pipeline-results-service.ts`
- `test/unit/services/pipeline-results-service.test.ts`
- `dist/index.js`
- `test/unit/fixtures/policyResultsInput.ts`

AC ids are positional (the spec does not number them): AC-1 policy prefix, AC-2 pipeline prefix same format, AC-3 missing/unknown severity, AC-4 helper 0-5 + unknown, AC-5 no regression of existing fields, AC-6 severity only, AC-7 single shared module.

## Approach

- Baseline on `origin/main` (`3737f7e`): `pnpm test` runs 0 tests — `test/unit/services/policy-results-service.test.ts:38,81` fail TS2345 because `test/unit/fixtures/policyResultsInput.ts` (last touched `f241f40`, 2024-06-07) lacks 7 `Inputs` fields later added to `src/inputs.ts:39-45`. T0 repairs the fixture first (spec scope updated, dev-approved).
- No severity helper exists: `grep -rni 'severity\|severityPrefix\|LABELS' src` hits only the two type fields (`src/namespaces/VeracodePolicyResult.ts:13` `severity: number;`, `src/namespaces/VeracodePipelineResult.ts:13` `severity: number;`). No `src/utils/` dir. So one new module `src/utils/severity.ts` owns `LABELS` and `severityPrefix` (AC-7), mirroring veracode-github-app's `src/utils/severity.js` behavior.
- Smallest edit at the place behavior changes: the `message` template in each `getAnnotations`:
  - policy `src/services/policy-results-services.ts:146` (`const message = \`Filename: ${filePath}...`) gets `severityPrefix(element.finding_details.severity)` prepended.
  - pipeline `src/services/pipeline-results-service.ts:444-447` (`const message = \`Filename: ...`) gets `severityPrefix(element.severity)` prepended.
  - `title`, `path`, lines and `annotation_level: 'warning'` (policy :147-154, pipeline :449-456) untouched.
- `severityPrefix` guards with `Number.isInteger(s) && s >= 0 && s <= 5` so undefined/null/out-of-range/non-integer return `''` and never throw (AC-3). Types declare `severity: number` non-optional, but API data is untrusted at runtime.
- Policy path is tested through the existing public `preparePolicyResults` test, which already mocks `updateChecks` and feeds `twoFindings.json` (fixture severities 5 at line 22, 4 at line 62). Today it asserts only annotation count (`test/unit/services/policy-results-service.test.ts:105`), so no existing assertion's text changes; add message/field assertions there.
- Pipeline path has no test file. `preparePipelineResults` pulls artifacts, Veracode API calls, fs writes and octokit before `getAnnotations` (`pipeline-results-service.ts:300-425`), so testing through it means mocking ~6 collaborators. Instead export pipeline `getAnnotations` (see T3 Refactor) and test it directly.
- dist: `action.yml` `runs.main: 'dist/index.js'`; prior "generate dist build" commits (`d905910`, `17ea69b`) touched only `dist/index.js`, which `package.json` script `pack` (`ncc build src/index.ts -o dist`) produces. Rebuild with `pnpm run pack` and commit only `dist/index.js`; leave the stale tsc outputs under `dist/` alone.

## Impact on existing code

- `getAnnotations` (policy) — sole caller `src/services/policy-results-services.ts:109` (`preparePolicyResults`); return shape unchanged → no change.
- `getAnnotations` (pipeline) — sole caller `src/services/pipeline-results-service.ts:404` (`preparePipelineResults`); return shape unchanged → no change. Adding `export` does not affect it.
- `check-service.updateChecks` and `Checks.Annotation` (`src/namespaces/Checks.ts:17-24`) — unchanged; message is still a string.
- `dist/index.js` — regenerated bundle.
- No CI workflow runs tests or builds dist (`.github/workflows/nightlyScan.yml` only runs SCA/SAST jobs).

## Tasks

### T0 — Repair stale policy input fixture
- Covers: none directly (unblocks the existing suite and T2's AC-1/AC-5 assertions)
- Change:
  - `test/unit/fixtures/policyResultsInput.ts`: add `workflow_app: false`, `line_number_slop: 0`, `pipeline_scan_flaw_filter: ''`, `filtered_results_file: ''`, `gitRepositoryUrl: ''`, `trim_to_size: 0`, `platformType: ''`. Nothing else.
- Tests (written first): the existing `test/unit/services/policy-results-service.test.ts` is the red test (fails to compile now) → must compile and its 2 existing tests pass unchanged.
- Edge cases: none
- Depends on: none
- Status: done

### T1 — Shared severity helper
- Covers: AC-4, AC-7, AC-3
- Change:
  - `src/utils/severity.ts` (new file in new dir `src/utils/`; test goes in new dir `test/unit/utils/`, mirroring `test/unit/services/`): export `LABELS` (`['Informational','Very Low','Low','Medium','High','Very High']`) and `severityPrefix(s: number | undefined | null): string` returning `[<Label>] ` for integer 0-5, else `''`.
- Tests (written first):
  - `test/unit/utils/severity.test.ts`: `maps 0-5 to labels` — 0..5 → `[Informational] `, `[Very Low] `, `[Low] `, `[Medium] `, `[High] `, `[Very High] `.
  - same file: `returns empty for unknown` — undefined, null, -1, 6, 2.5, NaN → `''`.
- Edge cases: string severity from untyped JSON (e.g. `'4'`) → `''` (not integer); documented, not coerced.
- Depends on: none
- Status: done

### T2 — Policy annotation severity prefix
- Covers: AC-1, AC-5, AC-6
- Change:
  - `src/services/policy-results-services.ts`: import `severityPrefix`; prepend `severityPrefix(element.finding_details.severity)` to `message` at line 146. Nothing else.
- Tests (written first):
  - `test/unit/services/policy-results-service.test.ts` (findings-present case): annotations from `mockUpdateChecks.mock.calls[0][3]` — message[0] starts with `[Very High] Filename: `, message[1] starts with `[High] Filename: `; `title`, `path`, `start_line`, `end_line`, `annotation_level` equal the pre-change values derived from the fixture; each annotation has exactly the keys `path,start_line,end_line,annotation_level,title,message` (AC-6).
- Edge cases: missing severity on policy path covered by T1 helper + T3 annotation test (same helper call).
- Depends on: T0, T1
- Status: done

### T3 — Pipeline annotation severity prefix
- Covers: AC-2, AC-3, AC-5, AC-6
- Change:
  - `src/services/pipeline-results-service.ts`: import `severityPrefix`; prepend `severityPrefix(element.severity)` to `message` at lines 444-447. Nothing else.
- Refactor: add `export` to pipeline `getAnnotations` (line 428) — needed by AC-2/AC-3 to assert pipeline annotations without mocking the whole `preparePipelineResults` flow.
- Tests (written first):
  - `test/unit/services/pipeline-results-service.test.ts` (new): `prefixes severity` — two findings severity 3 and 5, `javaMaven=false` → messages start `[Medium] Filename: ` / `[Very High] Filename: `; other fields (path, lines, `annotation_level: 'warning'`, `title` = issue_type) unchanged; keys exactly the six annotation fields.
  - same file: `missing severity` — finding with `severity` undefined → one annotation, message starts `Filename: `, path/lines/title intact, no throw.
- Edge cases: `javaMaven=true` path rewrite untouched (not re-tested; unchanged code).
- Depends on: T1
- Status: done

### T4 — Rebuild dist bundle
- Covers: AC-1, AC-2 (shipped action runs `dist/index.js`)
- Change:
  - `dist/index.js`: regenerate with `pnpm run pack`; commit only this file.
- Tests (written first): none (build artifact); verify `grep -c severityPrefix dist/index.js` > 0.
- Edge cases: `node_modules` absent — run `pnpm install --frozen-lockfile` first.
- Depends on: T2, T3
- Status: done

## Test command

`npx -y pnpm@9 test` (pnpm is not installed globally here; lockfile is v9) (package.json `test` → `jest --config ./test/unit/jest.config.ts ./test/unit`); requires `pnpm install --frozen-lockfile` first. Also `pnpm run check-types`.
