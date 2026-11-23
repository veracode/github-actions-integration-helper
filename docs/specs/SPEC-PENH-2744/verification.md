# Verification — SPEC-PENH-2744

Ticket: PENH-2744
Branch: sdd/PENH-2744-show-finding-severity
Commit: 4a43224
Result: PASS (coverage floor waived by dev, see Coverage row)

## Checks

| Check | Result | Detail |
| --- | --- | --- |
| Security scan (SAST) | PASS | policy `Veracode Recommended High`; 0 fixed, 0 blocked, 0 accepted risk, 11 advisory, 0 skipped. 7 source/test files clean. `dist/index.js` (4.8 MB, over vera's 512 KB cap) scanned in 10 line chunks covering all 130,603 lines: 0 critical, 0 high, 5 medium, 6 low, none in lines this change touched |
| Full test suite | PASS | `npx -y pnpm@9 test` — 6 passed, 0 failed (3 suites). On origin/main the suite ran 0 tests (stale fixture, fixed in T0) |
| Scope (Allowed paths) | PASS | all inside |
| Boundary rules | PASS | none found: no secrets, no `.env`, no manifest/lockfile/`action.yml`/`Checks.Annotation`/`check-service` change; `dist/index.js` rebuilt per Always rule |
| Coverage ≥ 80% per changed module | FAIL -> WAIVED | `src/utils/severity.ts` 100%; `src/services/policy-results-services.ts` 64.8% lines; `src/services/pipeline-results-service.ts` 7.9% lines. Waived by dev 2026-11-23: pre-existing test debt (only REPO-711's 2 policy tests ever existed, no CI runs tests); every line this change touched is covered |
| Diff proportionality | PASS | 0 moved, 0 duplicated, 1 test-only export flagged; 1 justified, 0 unjustified |

## Acceptance criteria

AC ids are positional (spec does not number them).

| AC | Result | Tests | Note |
| --- | --- | --- | --- |
| AC-1 policy annotations prefixed with severity | PASS | `test/unit/services/policy-results-service.test.ts::when findings are present > should update the check run with results URL` | |
| AC-2 pipeline annotations prefixed, same format | PASS | `test/unit/services/pipeline-results-service.test.ts::prefixes severity` | |
| AC-3 missing/unknown severity: no prefix, fields intact, no throw | PASS | `test/unit/utils/severity.test.ts::returns empty for unknown`, `test/unit/services/pipeline-results-service.test.ts::missing severity` | policy side relies on the same shared helper call |
| AC-4 helper maps 0-5 and unknown | PASS | `test/unit/utils/severity.test.ts::maps 0-5 to labels`, `::returns empty for unknown` | |
| AC-5 no regression of existing annotation fields | PASS | policy and pipeline tests above (exact-shape `toEqual`) | |
| AC-6 severity only, no new fields | PASS | policy and pipeline tests above (exact six keys) | |
| AC-7 single shared mapping module | PASS | `test/unit/utils/severity.test.ts` | grep: `LABELS`/`severityPrefix` defined only in `src/utils/severity.ts` |

## Security findings

| CWE | File | Severity | Status | Note |
| --- | --- | --- | --- | --- |
| - | `src/services/pipeline-results-service.ts` | - | CLEAN | no findings |
| - | `src/services/policy-results-services.ts` | - | CLEAN | no findings |
| - | `src/utils/severity.ts` | - | CLEAN | no findings |
| - | `test/unit/fixtures/policyResultsInput.ts` | - | CLEAN | no findings |
| - | `test/unit/services/pipeline-results-service.test.ts` | - | CLEAN | no findings |
| - | `test/unit/services/policy-results-service.test.ts` | - | CLEAN | no findings |
| - | `test/unit/utils/severity.test.ts` | - | CLEAN | no findings |
| CWE-22 | `dist/index.js:965` | medium | ADVISORY | bundled `@actions/artifact` download path check; pre-existing dependency code |
| CWE-319 | `dist/index.js:11660` | medium | ADVISORY | bundled Azure SDK client `allowInsecureConnection: true`; pre-existing dependency code |
| CWE-113 | `dist/index.js:88500` | medium | ADVISORY | bundled HTTP client `upgrade` header interpolation; pre-existing dependency code |
| CWE-1321 | `dist/index.js:113583` | medium | ADVISORY | bundled Azure SDK deserializer additional properties; pre-existing dependency code |
| CWE-1321 | `dist/index.js:113592` | medium | ADVISORY | bundled Azure SDK deserializer unknown properties; pre-existing dependency code |
| CWE-20 | `dist/index.js:89807` | low | ADVISORY | bundled cookie CTL check; pre-existing dependency code |
| CWE-532 | `dist/index.js:109729-109761` (5 rows, from `src/inputs.ts:107,115,123,131,139`) | low | ADVISORY | `console.log(inputs)` logs Veracode vid/vkey; pre-existing since `c983dbf` (2025-08-14), outside this ticket — recommend a separate fix |

## Documentation

| Item | Result | File | Note |
| --- | --- | --- | --- |
| `src/services/policy-results-services.ts` | ADVISORY | - | no existing doc covers this (repo has no README.md or docs/*.md) |
| `src/services/pipeline-results-service.ts` | ADVISORY | - | no existing doc covers this |
| `src/utils/severity.ts` | ADVISORY | - | no existing doc covers this |
| `Checks.Annotation` | ADVISORY | - | no existing doc covers this |

## Diff shape

| Block | Type | Result | Justification |
| --- | --- | --- | --- |
| `src/services/pipeline-results-service.ts:429` | test-only export | ADVISORY | T3 Refactor: add `export` to pipeline `getAnnotations` — needed by AC-2/AC-3 to assert pipeline annotations without mocking the whole `preparePipelineResults` flow |

## Failures

None. Waived: coverage floor on the two service modules (dev decision, 2026-11-23).
