import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# A truncated archive fetch would otherwise sweep the table; no real run drops this much at once.
MAXIMUM_DELETION_FRACTION = 0.05


# `submitted` is what was handed to DynamoDB: exact when `aborted` is False, an upper bound when True.
@dataclass(frozen=True)
class SweepResult:
    submitted: tuple[str, ...]
    aborted: bool


# Never raises: the ingest has already committed and must still report success.
def sweep_removed(table, tombstones, archive_names, removed_at):
    try:
        return _delete_missing_from(table, tombstones, archive_names, removed_at)
    except Exception:
        logger.exception('sweep aborted: removal pass failed against %d archive records', len(archive_names))
        return SweepResult(submitted=(), aborted=True)


def _delete_missing_from(table, tombstones, archive_names, removed_at):
    stored = _scan_items(table)
    stale = sorted(set(stored) - archive_names)

    if len(stale) > MAXIMUM_DELETION_FRACTION * len(stored):
        logger.error(
            'sweep aborted: %d of %d stored records are absent from the archive, above the %.0f%% ceiling',
            len(stale),
            len(stored),
            100 * MAXIMUM_DELETION_FRACTION,
        )
        return SweepResult(submitted=(), aborted=True)

    # Tombstones land before any delete is handed over: a failure here raises and nothing is deleted.
    _write_tombstones(tombstones, [stored[name] for name in stale], removed_at)
    return _submit_deletions(table, stale)


def _write_tombstones(tombstones, snapshots, removed_at):
    with tombstones.batch_writer() as batch:
        for snapshot in snapshots:
            batch.put_item(Item={
                'pl_name': snapshot['pl_name'],
                'removed_at': removed_at,
                'last_known_snapshot': snapshot,
            })


def _submit_deletions(table, stale):
    submitted = []
    try:
        with table.batch_writer() as batch:
            for name in stale:
                logger.info('removing %s: no longer listed in the NASA archive', name)
                # Counted before the call: a buffered item can commit in the very flush that raises.
                submitted.append(name)
                batch.delete_item(Key={'pl_name': name})
    except Exception:
        logger.exception('sweep incomplete: %d of %d removals submitted', len(submitted), len(stale))
        return SweepResult(submitted=tuple(submitted), aborted=True)

    return SweepResult(submitted=tuple(submitted), aborted=False)


# Full items, not just names: the stale ones become the tombstones' last known snapshot.
def _scan_items(table):
    request = {}
    items = {}
    while True:
        page = table.scan(**request)
        items.update((item['pl_name'], item) for item in page['Items'])
        if not page.get('LastEvaluatedKey'):
            return items
        request['ExclusiveStartKey'] = page['LastEvaluatedKey']
