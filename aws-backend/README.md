# AWS Backend

## Data Sync

The sync Lambda upserts every record the NASA archive returns, then deletes stored records the
archive no longer lists, so the table converges to the archive's count unless the guard trips. The
sweep refuses to delete more than 5% of the table in one run — a truncated fetch aborts it with an
error log and leaves the drift in place rather than emptying the table, and the upserts still stand.

Deletion is the one step the next run cannot recompute, so before any record is deleted the sweep
writes a tombstone to `exoplanet-tombstones-<env>` — `{pl_name, removed_at, last_known_snapshot}`,
where the snapshot is the full item as last stored and `removed_at` is the run's `last_updated`
timestamp. If the tombstone batch fails, nothing is deleted. A planet the archive drops, relists and
drops again keeps only its latest tombstone. The table is retained if the stack is deleted or the
resource replaced, because a resync cannot rebuild it.

After the sweep, the sync reconciles the records table, `exoplanet-records-<env>` (env
`RECORDS_TABLE_NAME`): one item per superlative in `records.py`'s `RECORDS` registry, keyed by
`record_id` — `{record_id, holder: {pl_name, value}, since, previous, updated_at}`. Each record's
holder is computed from the fetched archive (finite, positive values only; Most Earth-like ranks on
the unrounded ESI similarity, so its candidates are exactly the scored planets; ties go to the
alphabetically first name). A new holder sets `since` to the run's timestamp and prepends the
displaced holder `{pl_name, value, since, until}` to `previous`, which keeps the latest 20. The same
holder with a moved value refreshes `holder.value` only; an identical value writes nothing, and a
record with no measurable candidates is left untouched. The first sync — or a record id added to the
registry later — writes a baseline with an empty `previous`, so its `since` is when tracking began,
not when the holder won. Values are stored as `Decimal` through `values.to_decimal`. The table is
retained like the tombstones: a resync recomputes the holder but never the history, which is also
why the Lambda gets read and write access but not `DynamoDBCrudPolicy`: it never needs `DeleteItem`.

Records are skipped when the sweep aborted, because a truncated fetch would fabricate a broken
record that flips back on the next run. The step never fails the sync: a failure is logged and
reported as `records_aborted`.

The invocation result reports `total_synced`, `removals_submitted`, `sweep_aborted`,
`records_changed` and `records_aborted`; every removed `pl_name` and every record written is logged
individually. `removals_submitted` counts what was handed to DynamoDB: exact when `sweep_aborted` is
false, an upper bound when it is true, because a batch can commit and still fail. `records_changed`
counts items written — a new holder or a refreshed value — and is a lower bound when
`records_aborted` is true. A run that aborts mid-sweep is safe to retry — tombstones and deletions
are idempotent, though a retry re-puts each tombstone with its own `removed_at`, so the recorded
time is the last attempt's, not the first run that saw the record stale.

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
