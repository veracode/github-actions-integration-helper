# SPEC-PENH-2744: Show finding severity on GitHub checks (Action helper)

Status: IMPLEMENTED
Ticket: PENH-2744

## Problem statement

(drafted from ticket — refine as needed)

GitHub repo integration - show findings severity on checks. When static results are displayed on GitHub checks, all information except the severity of the finding is shown, so developers cannot rate which results to target first.

## Description

Desired outcome (ticket): help developers risk-rate which findings to target first by displaying each finding's severity alongside the rest of the finding on the GitHub check.

In this repo, "static results on GitHub checks" maps to two annotation builders that feed `check-service.updateChecks`:
- Policy scan results: `policy-results-services.getAnnotations` (findings from `findings-service.getApplicationFindings`, which falls back to the first sandbox's findings when no policy scan exists — so sandbox results go through this same path).
- Pipeline scan results: `pipeline-results-service.getAnnotations`.

Ticket history shows SPEC-001 for PENH-2744 was already approved, verified and merged in GitLab `repo-tools/github-app/veracode-github-app` (MR !345). Confirmed by the dev: this repo (`veracode/github-actions-integration-helper`) builds its own annotations and needs the same change. Copy that implementation's behavior, not its file layout.

## Impact analysis

Affected modules/files:
- `src/services/policy-results-services.ts` — high — `getAnnotations` builds policy-scan (and sandbox-fallback) check annotations; severity prefix added to message.
- `src/services/pipeline-results-service.ts` — high — `getAnnotations` builds pipeline-scan check annotations; severity prefix added to message.
- New shared TS module for the severity helper (e.g. `src/utils/severity.ts`) — the only copy of the label mapping.
- New unit test for the helper under `test/unit/`.
- `test/unit/services/policy-results-service.test.ts` — high — updated only where expected message text changes.
- `test/unit/fixtures/policyResultsInput.ts` — test-only — stale on main: missing 7 required `Inputs` fields (`filtered_results_file`, `workflow_app`, `line_number_slop`, `pipeline_scan_flaw_filter`, `gitRepositoryUrl`, `trim_to_size`, `platformType`, added 2024-11 to 2025-10 without updating it), so the policy test does not compile and the suite runs 0 tests. Add those fields with neutral values so the suite runs. Added to scope with dev approval on 2026-11-23.
- Existing pipeline annotation tests, if any — updated only where expected message text changes.
- `dist/` — rebuilt bundle, if the repo commits it (git history shows "generate dist build" commits; `package.json` main is `dist/index.js`).

Affected APIs: none external. `Checks.Annotation` (`src/namespaces/Checks.ts`) shape unchanged — severity goes into the existing `message` text. Severity is read from finding data already fetched: policy `finding.finding_details.severity`, pipeline `finding.severity` (field names to be confirmed against `VeracodePolicyResult.Finding` / `VeracodePipelineResult.Finding` and fixtures during planning). No new Veracode API calls.
Dependencies: none added. `@octokit/rest` path via `check-service.updateChecks` unchanged.
Risk: Low. Change is a text prefix in two `getAnnotations` functions; main risk is breaking existing annotation fields, covered by the no-regression ACs.

## Solution approach

- Add one shared TS helper module:
  - `LABELS = ['Informational', 'Very Low', 'Low', 'Medium', 'High', 'Very High']` (index = Veracode numeric severity 0-5).
  - `severityPrefix(s)` returns `` `[${LABELS[s]}] ` `` for a known severity 0-5, else `''` (undefined, null, out of range, non-integer).
- In both `getAnnotations` functions, prepend `severityPrefix(...)` to the annotation `message`:
  - policy: `finding.finding_details.severity`
  - pipeline: `finding.severity`
- Leave annotation `title`, `path`, lines and `annotation_level` (notice/warning/failure) unchanged.
- Missing severity yields an empty prefix — the annotation is still produced unchanged.
- Repair the stale `policyResultsInput` test fixture (add the 7 missing `Inputs` fields with neutral values: `false` / `0` / `''`) so the existing suite compiles. No source behavior change.
- Rebuild `dist/` if the repo commits it.

## Acceptance criteria

- Given a policy scan (or sandbox fallback) completes with findings of varying severity, when annotations are built, then each annotation's message starts with `[<Label>] ` for that finding's severity.
- Given a pipeline scan completes with findings of varying severity, when annotations are built, then each annotation's message starts with `[<Label>] ` in the same format as policy-scan annotations.
- Given a finding with missing or unknown severity, when annotations are built, then the annotation is produced with no prefix, all existing fields intact, and no error is thrown.
- Given the severity helper, when called with each value 0-5, then it returns `[Informational] `, `[Very Low] `, `[Low] `, `[Medium] `, `[High] `, `[Very High] ` respectively, and `''` for unknown/undefined.
- System MUST NOT regress existing check annotation fields (path, start/end line, annotation level, title, rest of message) when adding severity.
- System MUST add severity only — no other new finding field or metadata (e.g. CWE id, fix suggestion, flaw category, scan metadata) is introduced to the check annotation.
- System MUST keep the severity label mapping in a single shared module (no per-service copies).

## Non-goals

- Changing how findings are prioritized, sorted, filtered or mitigated (including pipeline-to-platform matching and mitigated-flaw filtering).
- Changing check `conclusion` or annotation `level` logic based on severity.
- Changing `check-service.updateChecks` or the `Checks.Annotation` interface.
- Adding severity to surfaces other than GitHub check annotation messages (check summary text, PR comments, workflow artifacts, VRM relay scan report).
- IaC/SCA results and policy-name validation flows (`validatePolicyName`, `validateIACPolicyName`).
- Re-doing the already-merged change in veracode-github-app.

## Boundary rules

### Always
- Run the full test suite (pnpm) before opening the MR.
- Rebuild and commit `dist/` after source changes, if the repo commits it.

### Ask First
- Adding a new dependency.
- Changing a public API contract.
- Modifying a DB schema/migration.
- Changing the `Checks.Annotation` interface shape or `action.yml` inputs/outputs.
- Posting any Jira or MR comment (dev requires explicit permission).

### Never
- Commit secrets or credentials.
- Touch files outside this ticket's stated scope.
- Force-push.
- Skip the TDD gate.
