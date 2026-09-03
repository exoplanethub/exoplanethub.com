import logging
from collections.abc import Callable
from dataclasses import dataclass

from dynamo import scan_all
from esi import esi_similarity
from values import measured, to_decimal

logger = logging.getLogger(__name__)

PREVIOUS_HOLDERS_KEPT = 20


# `measure` maps a raw archive planet to the value ranked on, or None when it has none; `pick` is max or min.
@dataclass(frozen=True)
class RecordSpec:
    id: str
    measure: Callable[[dict], float | None]
    pick: Callable


def archive_value(field):
    return lambda planet: planet.get(field)


# The registry is the contract with the frontend: these ids are what it presents.
RECORDS = (
    RecordSpec('most-earth-like', esi_similarity, max),
    RecordSpec('hottest', archive_value('pl_eqt'), max),
    RecordSpec('largest', archive_value('pl_rade'), max),
    RecordSpec('smallest', archive_value('pl_rade'), min),
    RecordSpec('most-massive', archive_value('pl_bmasse'), max),
    RecordSpec('shortest-year', archive_value('pl_orbper'), min),
    RecordSpec('nearest', archive_value('sy_dist'), min),
)


# `changed` is every record id whose item was written: exact when `aborted` is False, a lower bound when True.
@dataclass(frozen=True)
class RecordsResult:
    changed: tuple[str, ...]
    aborted: bool


# A sweep abort means the fetch may be incomplete, and a missing holder would fabricate a broken record.
def update_records_after_sweep(sweep, records_table, data, timestamp):
    if sweep.aborted:
        logger.warning('records skipped: the sweep aborted, so the archive fetch may be incomplete')
        return RecordsResult(changed=(), aborted=True)
    return update_records(records_table, data, timestamp)


# Never raises: the ingest has already committed and must still report success.
def update_records(records_table, data, timestamp):
    changed = []
    try:
        stored = scan_all(records_table, 'record_id')
        for spec in RECORDS:
            if _reconcile(spec, records_table, stored.get(spec.id), data, timestamp):
                changed.append(spec.id)
    except Exception:
        logger.exception('records aborted after %d writes: reconcile failed against %d archive records', len(changed), len(data))
        return RecordsResult(changed=tuple(changed), aborted=True)

    return RecordsResult(changed=tuple(changed), aborted=False)


def _reconcile(spec, records_table, stored, data, timestamp):
    holder = _current_holder(spec, data)
    if holder is None:
        logger.warning('%s: no measurable candidates, left untouched', spec.id)
        return False

    item = _next_item(spec.id, holder, stored, timestamp)
    if item is None:
        return False

    records_table.put_item(Item=item)
    return True


def _current_holder(spec, data):
    candidates = [(planet['pl_name'], spec.measure(planet)) for planet in data]
    measurable = [candidate for candidate in candidates if measured(candidate[1])]
    if not measurable:
        return None

    # Sorted by name first, so among tied values the alphabetically first wins and a tie never flaps.
    return spec.pick(sorted(measurable), key=lambda candidate: candidate[1])


def _next_item(record_id, holder, stored, timestamp):
    name, value = holder[0], to_decimal(holder[1])

    if stored is None:
        logger.info('%s: tracking %s (%s)', record_id, name, value)
        return {
            'record_id': record_id,
            'holder': {'pl_name': name, 'value': value},
            'since': timestamp,
            'previous': [],
            'updated_at': timestamp,
        }

    if stored['holder']['pl_name'] != name:
        displaced = {**stored['holder'], 'since': stored['since'], 'until': timestamp}
        logger.info('%s: %s (%s) takes the record from %s (%s)', record_id, name, value, displaced['pl_name'], displaced['value'])
        return {
            'record_id': record_id,
            'holder': {'pl_name': name, 'value': value},
            'since': timestamp,
            'previous': [displaced, *stored['previous']][:PREVIOUS_HOLDERS_KEPT],
            'updated_at': timestamp,
        }

    if stored['holder']['value'] == value:
        return None

    logger.info('%s: %s moved from %s to %s', record_id, name, stored['holder']['value'], value)
    return {**stored, 'holder': {'pl_name': name, 'value': value}, 'updated_at': timestamp}
