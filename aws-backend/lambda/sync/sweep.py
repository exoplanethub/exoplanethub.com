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
def sweep_removed(table, archive_names):
    try:
        return _delete_missing_from(table, archive_names)
    except Exception:
        logger.exception('sweep aborted: removal pass failed against %d archive records', len(archive_names))
        return SweepResult(submitted=(), aborted=True)


def _delete_missing_from(table, archive_names):
    stored_names = _scan_names(table)
    stale = sorted(stored_names - archive_names)

    if len(stale) > MAXIMUM_DELETION_FRACTION * len(stored_names):
        logger.error(
            'sweep aborted: %d of %d stored records are absent from the archive, above the %.0f%% ceiling',
            len(stale),
            len(stored_names),
            100 * MAXIMUM_DELETION_FRACTION,
        )
        return SweepResult(submitted=(), aborted=True)

    return _submit_deletions(table, stale)


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


def _scan_names(table):
    request = {'ProjectionExpression': 'pl_name'}
    names = set()
    while True:
        page = table.scan(**request)
        names.update(item['pl_name'] for item in page['Items'])
        if not page.get('LastEvaluatedKey'):
            return names
        request['ExclusiveStartKey'] = page['LastEvaluatedKey']
