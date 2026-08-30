# AWS Backend

## Data Sync

The sync Lambda upserts every record the NASA archive returns, then deletes stored records the
archive no longer lists, so the table cannot drift above the archive's count. The sweep refuses to
delete more than 5% of the table in one run — a truncated fetch aborts it with an error log rather
than emptying the table, and the upserts still stand. The invocation result reports `total_synced`,
`total_removed` and `sweep_aborted`; every removed `pl_name` is logged individually.

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
