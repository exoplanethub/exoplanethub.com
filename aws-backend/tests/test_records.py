import copy
import logging
from decimal import Decimal

import pytest

from esi import esi_similarity
from records import PREVIOUS_HOLDERS_KEPT, RECORDS, RecordsResult, update_records, update_records_after_sweep
from sweep import SweepResult

EARLIER = '2026-08-14T03:00:12'
NOW = '2026-09-03T12:00:00'

RECORD_IDS = tuple(spec.id for spec in RECORDS)


def planet(name, **fields):
    return {'pl_name': name, 'hostname': name.rsplit(' ', 1)[0], **fields}


# Raw archive rows: floats and nulls, never Decimal. PSR B1257+12 b has no radius or temperature.
ARCHIVE = [
    planet('Kepler-22 b', pl_rade=2.1, pl_bmasse=9.1, pl_eqt=262.0, pl_orbper=289.9, sy_dist=190.0),
    planet('TRAPPIST-1 e', pl_rade=0.92, pl_bmasse=0.69, pl_eqt=246.0, pl_orbper=6.1, sy_dist=12.4),
    planet('KELT-9 b', pl_rade=20.8, pl_bmasse=917.0, pl_eqt=4050.0, pl_orbper=1.48, sy_dist=200.0),
    planet('Proxima Cen b', pl_rade=1.07, pl_bmasse=1.07, pl_eqt=234.0, pl_orbper=11.2, sy_dist=1.3),
    planet('PSR B1257+12 b', pl_rade=None, pl_bmasse=0.02, pl_eqt=None, pl_orbper=25.3, sy_dist=600.0),
]

# Hand-picked from ARCHIVE; the value is what the archive lists, as the item must store it.
EXPECTED_HOLDERS = {
    'most-earth-like': ('Proxima Cen b', Decimal(str(esi_similarity(ARCHIVE[3])))),
    'hottest': ('KELT-9 b', Decimal('4050.0')),
    'largest': ('KELT-9 b', Decimal('20.8')),
    'smallest': ('TRAPPIST-1 e', Decimal('0.92')),
    'most-massive': ('KELT-9 b', Decimal('917.0')),
    'shortest-year': ('KELT-9 b', Decimal('1.48')),
    'nearest': ('Proxima Cen b', Decimal('1.3')),
}

FLOAT_REJECTED = TypeError('Float types are not supported. Use Decimal types instead.')


def _reject_floats(value):
    if isinstance(value, float):
        raise FLOAT_REJECTED
    if isinstance(value, dict):
        for nested in value.values():
            _reject_floats(nested)
    if isinstance(value, list):
        for nested in value:
            _reject_floats(nested)


# Mirrors the boto3 resource: paginated Scan, deserialised copies, and a Put that refuses Python floats.
class FakeRecordsTable:
    def __init__(self, items=(), page_size=100, scan_error=None, failing_put=None):
        self.items = {item['record_id']: copy.deepcopy(item) for item in items}
        self.page_size = page_size
        self.scan_error = scan_error
        self.failing_put = failing_put
        self.written = []
        self.scan_requests = []

    def scan(self, **request):
        if self.scan_error:
            raise self.scan_error
        self.scan_requests.append(request)
        ids = list(self.items)
        start = ids.index(request['ExclusiveStartKey']['record_id']) + 1 if 'ExclusiveStartKey' in request else 0
        page = ids[start:start + self.page_size]
        response = {'Items': [copy.deepcopy(self.items[record_id]) for record_id in page]}
        if start + self.page_size < len(ids):
            response['LastEvaluatedKey'] = {'record_id': page[-1]}
        return response

    def put_item(self, Item):
        _reject_floats(Item)
        if Item['record_id'] == self.failing_put:
            raise RuntimeError('throttled')
        self.items[Item['record_id']] = copy.deepcopy(Item)
        self.written.append(Item['record_id'])


def stored_record(record_id, name, value, since, previous=()):
    return {
        'record_id': record_id,
        'holder': {'pl_name': name, 'value': Decimal(value)},
        'since': since,
        'previous': list(previous),
        'updated_at': since,
    }


def displaced(name, value, since, until):
    return {'pl_name': name, 'value': Decimal(value), 'since': since, 'until': until}


def synced(table, data, timestamp):
    result = update_records(table, data, timestamp)
    assert result.aborted is False
    return result


@pytest.fixture
def tracking():
    table = FakeRecordsTable()
    synced(table, ARCHIVE, EARLIER)
    table.written.clear()
    table.scan_requests.clear()
    return table


def test_fake_table_refuses_a_float_anywhere_in_the_item():
    table = FakeRecordsTable()

    with pytest.raises(TypeError, match='Float types are not supported'):
        table.put_item(Item={'record_id': 'hottest', 'previous': [{'value': 4050.0}]})

    assert table.items == {}


def test_baseline_tracks_every_record_with_no_previous_holders():
    table = FakeRecordsTable()

    result = synced(table, ARCHIVE, NOW)

    assert result == RecordsResult(changed=RECORD_IDS, aborted=False)
    assert table.written == list(RECORD_IDS)
    for record_id in RECORD_IDS:
        item = table.items[record_id]
        assert item['since'] == NOW
        assert item['previous'] == []
        assert item['updated_at'] == NOW


@pytest.mark.parametrize('record_id', RECORD_IDS)
def test_baseline_names_the_archive_holder_and_stores_its_value_as_decimal(record_id):
    table = FakeRecordsTable()

    synced(table, ARCHIVE, NOW)

    holder = table.items[record_id]['holder']
    assert (holder['pl_name'], holder['value']) == EXPECTED_HOLDERS[record_id]
    assert type(holder['value']) is Decimal


def test_registry_ids_are_unique():
    assert len(set(RECORD_IDS)) == len(RECORD_IDS)


def test_unchanged_records_write_nothing(tracking):
    result = synced(tracking, ARCHIVE, NOW)

    assert result == RecordsResult(changed=(), aborted=False)
    assert tracking.written == []
    assert all(item['updated_at'] == EARLIER for item in tracking.items.values())


def test_same_holder_with_an_identical_value_is_not_a_change(tracking):
    refetched = copy.deepcopy(ARCHIVE)

    result = synced(tracking, refetched, NOW)

    assert result.changed == ()
    assert tracking.items['nearest']['holder']['value'] == Decimal('1.3')


def test_same_holder_with_a_moved_value_refreshes_only_the_value(tracking):
    revised = [dict(row, pl_eqt=4100.0) if row['pl_name'] == 'KELT-9 b' else row for row in ARCHIVE]

    result = synced(tracking, revised, NOW)

    assert result.changed == ('hottest',)
    assert tracking.items['hottest'] == {
        'record_id': 'hottest',
        'holder': {'pl_name': 'KELT-9 b', 'value': Decimal('4100.0')},
        'since': EARLIER,
        'previous': [],
        'updated_at': NOW,
    }


def test_new_holder_takes_the_record_and_the_displaced_holder_is_prepended(tracking):
    challenger = planet('WASP-12 b', pl_rade=1.9, pl_bmasse=450.0, pl_eqt=4500.0, pl_orbper=2.0, sy_dist=400.0)

    result = synced(tracking, ARCHIVE + [challenger], NOW)

    assert result.changed == ('hottest',)
    assert tracking.items['hottest'] == {
        'record_id': 'hottest',
        'holder': {'pl_name': 'WASP-12 b', 'value': Decimal('4500.0')},
        'since': NOW,
        'previous': [displaced('KELT-9 b', '4050.0', EARLIER, NOW)],
        'updated_at': NOW,
    }


def test_previous_holders_are_capped_at_twenty():
    history = [displaced(f'Old {index}', f'{3000 - index}', f'2025-0{index % 9 + 1}-01', f'2025-0{index % 9 + 1}-02') for index in range(PREVIOUS_HOLDERS_KEPT)]
    table = FakeRecordsTable([stored_record('hottest', 'Kepler-22 b', '262.0', EARLIER, history)])

    synced(table, ARCHIVE, NOW)

    previous = table.items['hottest']['previous']
    assert len(previous) == PREVIOUS_HOLDERS_KEPT == 20
    assert previous[0] == displaced('Kepler-22 b', '262.0', EARLIER, NOW)
    assert previous[1:] == history[:-1]


def test_a_record_added_to_the_registry_later_starts_as_a_baseline():
    table = FakeRecordsTable([stored_record(record_id, *EXPECTED_HOLDERS[record_id], EARLIER) for record_id in RECORD_IDS if record_id != 'nearest'])

    result = synced(table, ARCHIVE, NOW)

    assert result.changed == ('nearest',)
    assert table.items['nearest']['previous'] == []
    assert table.items['nearest']['since'] == NOW


@pytest.mark.parametrize('order', [1, -1], ids=['alphabetical-first', 'alphabetical-last'])
@pytest.mark.parametrize('record_id', ['hottest', 'shortest-year'], ids=['max', 'min'])
def test_ties_break_on_planet_name_regardless_of_archive_order(record_id, order):
    tied = [planet('Zeta b', pl_eqt=5000.0, pl_orbper=0.5), planet('Alpha b', pl_eqt=5000.0, pl_orbper=0.5)][::order]
    table = FakeRecordsTable()

    synced(table, tied, NOW)

    assert table.items[record_id]['holder']['pl_name'] == 'Alpha b'


@pytest.mark.parametrize(
    'value',
    [
        pytest.param(None, id='none'),
        pytest.param(0.0, id='zero'),
        pytest.param(-0.5, id='negative'),
        pytest.param(float('nan'), id='nan'),
        pytest.param(float('inf'), id='infinity'),
        pytest.param('0.1', id='numeric-string'),
    ],
)
def test_unmeasured_values_are_not_candidates(value):
    table = FakeRecordsTable()

    synced(table, ARCHIVE + [planet('Ghost b', pl_rade=value, pl_orbper=value, sy_dist=value)], NOW)

    assert table.items['smallest']['holder']['pl_name'] == 'TRAPPIST-1 e'
    assert table.items['shortest-year']['holder']['pl_name'] == 'KELT-9 b'
    assert table.items['nearest']['holder']['pl_name'] == 'Proxima Cen b'


def test_most_earth_like_ranks_only_planets_with_all_three_inputs():
    molten_twin = planet('Molten b', pl_rade=1.0, pl_bmasse=1.0, pl_eqt=None)
    table = FakeRecordsTable()

    synced(table, ARCHIVE + [molten_twin], NOW)

    assert table.items['most-earth-like']['holder']['pl_name'] == 'Proxima Cen b'


def test_most_earth_like_ranks_on_the_unrounded_similarity():
    earth = planet('Earth b', pl_rade=1.0, pl_bmasse=1.0, pl_eqt=288.0)
    near_twin = planet('Almost b', pl_rade=1.001, pl_bmasse=1.0, pl_eqt=288.0)
    assert round(100 * esi_similarity(near_twin)) == 100, 'both must round to the same score'
    table = FakeRecordsTable()

    synced(table, [near_twin, earth], NOW)

    holder = table.items['most-earth-like']['holder']
    assert holder == {'pl_name': 'Earth b', 'value': Decimal('1.0')}


def test_a_record_with_no_measurable_candidates_is_left_untouched(caplog):
    table = FakeRecordsTable([stored_record('hottest', 'KELT-9 b', '4050.0', EARLIER)])
    without_temperatures = [dict(row, pl_eqt=None) for row in ARCHIVE]

    with caplog.at_level(logging.WARNING, logger='records'):
        result = synced(table, without_temperatures, NOW)

    assert 'hottest' not in result.changed
    assert table.items['hottest'] == stored_record('hottest', 'KELT-9 b', '4050.0', EARLIER)
    assert 'hottest: no measurable candidates' in caplog.text


def test_empty_archive_writes_nothing():
    table = FakeRecordsTable()

    result = synced(table, [], NOW)

    assert result.changed == ()
    assert table.items == {}


def test_scan_pages_until_the_table_is_exhausted(tracking):
    tracking.page_size = 3

    synced(tracking, ARCHIVE, NOW)

    assert len(tracking.scan_requests) == 3
    assert 'ExclusiveStartKey' not in tracking.scan_requests[0]
    assert tracking.written == []


def test_skips_when_the_sweep_aborted(caplog):
    table = FakeRecordsTable()

    with caplog.at_level(logging.WARNING, logger='records'):
        result = update_records_after_sweep(SweepResult(submitted=(), aborted=True), table, ARCHIVE, NOW)

    assert result == RecordsResult(changed=(), aborted=True)
    assert table.scan_requests == []
    assert table.items == {}
    assert 'records skipped' in caplog.text


def test_runs_when_the_sweep_completed():
    table = FakeRecordsTable()

    result = update_records_after_sweep(SweepResult(submitted=('Retracted b',), aborted=False), table, ARCHIVE, NOW)

    assert result == RecordsResult(changed=RECORD_IDS, aborted=False)


def test_scan_failure_aborts_without_raising(caplog):
    table = FakeRecordsTable(scan_error=RuntimeError('throttled'))

    with caplog.at_level(logging.ERROR, logger='records'):
        result = update_records(table, ARCHIVE, NOW)

    assert result == RecordsResult(changed=(), aborted=True)
    assert table.items == {}
    assert 'records aborted' in caplog.text


def test_put_failure_aborts_and_reports_the_records_already_written(caplog):
    table = FakeRecordsTable(failing_put='largest')

    with caplog.at_level(logging.ERROR, logger='records'):
        result = update_records(table, ARCHIVE, NOW)

    assert result == RecordsResult(changed=('most-earth-like', 'hottest'), aborted=True)
    assert list(table.items) == ['most-earth-like', 'hottest']
    assert 'records aborted after 2 writes' in caplog.text


def test_logs_a_holder_change_by_name(tracking, caplog):
    challenger = planet('WASP-12 b', pl_rade=1.9, pl_bmasse=450.0, pl_eqt=4500.0, pl_orbper=2.0, sy_dist=400.0)

    with caplog.at_level(logging.INFO, logger='records'):
        synced(tracking, ARCHIVE + [challenger], NOW)

    assert 'hottest: WASP-12 b (4500.0) takes the record from KELT-9 b (4050.0)' in caplog.text
