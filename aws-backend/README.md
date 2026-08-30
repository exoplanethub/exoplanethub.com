# AWS Backend

## Data Sync

The sync Lambda upserts every record the NASA archive returns, then deletes stored records the
archive no longer lists, so the table converges to the archive's count unless the guard trips. The
sweep refuses to delete more than 5% of the table in one run — a truncated fetch aborts it with an
error log and leaves the drift in place rather than emptying the table, and the upserts still stand.

The invocation result reports `total_synced`, `removals_submitted` and `sweep_aborted`; every
removed `pl_name` is logged individually. `removals_submitted` counts what was handed to DynamoDB:
exact when `sweep_aborted` is false, an upper bound when it is true, because a batch can commit and
still fail. A run that aborts mid-sweep is safe to retry — deletions are idempotent.

## Local Deployment

```bash
cd aws-backend
sam build
sam deploy --config-env dev  # or main
```

## Tests

```bash
cd aws-backend
pip install -r requirements-dev.txt
pytest
```

Tests import Lambda modules flat (`import app`) — `tests/conftest.py` puts `lambda/sync` on the
path, so `pytest` works from either this directory or the repo root. Tests must run without
network access or AWS credentials.

## GitHub Actions Deployment

Push a tag to trigger deployment:

```bash
# Deploy to dev
git tag dev-aws-backend-1.0.0
git push origin dev-aws-backend-1.0.0

# Deploy to main
git tag main-aws-backend-1.0.0
git push origin main-aws-backend-1.0.0
```

## Required GitHub Secrets

- `AWS_ROLE_ARN` — the IAM role the deploy workflow assumes via OIDC.
  No long-lived access keys are needed; the workflow requests a short-lived token from GitHub's
  OIDC provider and never stores credentials.
