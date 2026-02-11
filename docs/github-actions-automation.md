# GitHub Actions Automation

Three CI/CD workflows automate agent coordination when code is pushed to GitHub.

## Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Agent Review | `agent-review.yml` | Push to `claude/**`, `cursor/**`, `lovable/**` | Reviews `[ACTION:submit]` commits via Kimi |
| Pre-Mortal Merge | `pre-mortal-merge.yml` | Push to `pre-mortal` | Validates commit format, coordination files, script syntax |
| Sprint Evaluation | `sprint-evaluation.yml` | Manual or `[ACTION:evaluate]` on `pre-mortal` | Generates evaluation report with 8 metrics |

## Setup

### 1. Add API Key Secret

Go to your GitHub repo: **Settings > Secrets and variables > Actions > New repository secret**

- **Name**: `KIMI_API_KEY`
- **Value**: Your Moonshot API key (same as in `.env` or `.env.project`)

### 2. Copy Workflow Files

If using the starter kit, workflows are already in `.github/workflows/`. Otherwise:

```bash
mkdir -p .github/workflows
cp setups/multi-agent-starter/.github/workflows/*.yml .github/workflows/
```

### 3. Verify

Push a test commit to an agent branch:

```bash
git checkout -b cursor/test-workflow
git commit --allow-empty -m "[AGENT:cursor] [ACTION:submit] [TASK:TEST] Test workflow"
git push origin cursor/test-workflow
```

Check the Actions tab in GitHub for the review workflow.

## Workflow Details

### Agent Review Pipeline

**Trigger**: Push to `claude/**`, `cursor/**`, or `lovable/**` branches.

**What it does**:
1. Parses the commit message for `[AGENT:x] [ACTION:y] [TASK:z]` headers
2. If `ACTION` is `submit`, runs Kimi CLI in Print Mode with the overseer agent file
3. Kimi reviews the diff against the task brief in `.ai/tasks/`
4. Review is written to `.ai/reviews/TASK-X-review.md`
5. Review file is committed and pushed back to the branch

**Customization**: Edit the review prompt in the workflow file (look for `[REPLACE]` comment).

### Pre-Mortal Merge Validation

**Trigger**: Push to `pre-mortal` branch.

**What it does**:
1. Validates last 5 commits have proper routing headers
2. Checks `.ai/` coordination directories exist
3. Validates script syntax (`bash -n`)
4. Posts a summary to the GitHub Actions step summary

**Note**: This workflow warns but does not block merges. It's informational.

### Sprint Evaluation

**Trigger**: Manual dispatch or `[ACTION:evaluate]` commit on `pre-mortal`.

**What it does**:
1. Runs `scripts/generate-evaluation.sh` with configured parameters
2. Collects 8 metrics from `.ai/` files and Git history
3. Generates a Kimi-powered evaluation report (unless `--quick` mode)
4. Commits the report to `.ai/reports/eval-*.md`

**Manual trigger**: Go to Actions tab > Sprint Evaluation > Run workflow.

**Parameters**:
- `sprint_number`: Which sprint to evaluate (optional)
- `include_baseline`: Compare against baseline metrics (default: true)
- `quick_mode`: Skip Kimi report, metrics only (default: false)

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Workflow not triggering | Check branch name matches pattern (`claude/**`, `cursor/**`, `lovable/**`) |
| `KIMI_API_KEY` error | Verify secret is set in repo Settings > Secrets > Actions |
| Review not committed | Check workflow logs — Kimi may not have created the review file |
| Evaluation empty | Ensure `.ai/status.md` and `.ai/tasks/` have content |
| Permission denied | Verify workflow has `contents: write` permission |

## Concurrency

The Agent Review workflow uses concurrency groups (`review-${{ github.ref }}`) to prevent parallel reviews on the same branch. If a new commit is pushed while a review is running, the old review is cancelled.

## Cost Considerations

Each workflow run that calls Kimi CLI consumes API tokens:
- **Agent Review**: ~1 Kimi call per `[ACTION:submit]` commit
- **Sprint Evaluation**: ~1 Kimi call per evaluation (skip with `--quick`)
- **Pre-Mortal Merge**: No Kimi calls (validation only)

Use `quick_mode` for sprint evaluations during development to save tokens.

