import logging
from decimal import Decimal

import pytest

from sweep import MAXIMUM_DELETION_FRACTION, sweep_removed

# Wide enough that a couple of stale records stay under the deletion ceiling.
ARCHIVE = {'Kepler-22 b', 'TRAPPIST-1e', 'Proxima Cen b'} | {f'Filler {index}' for index in range(97)}

FLUSH_SIZE = 25  # boto3 BatchWriter's default flush_amount

# 60 stale records span three flushes and stay under 5% of the 1260 stored.
SPANNING_STALE = {f'Retracted {index}' for index in range(60)}
SPANNING_SURVIVORS = {f'Planet {index}' for index in range(1200)}

REMOVED_AT = '2026-09-03T12:00:00'


# More than the key, so a tombstone test can tell a full snapshot from a bare name.
def stored_item(name):
    return {'pl_name': name, 'pl_rade': Decimal('1.5'), 'last_updated': '2026-08-30T06:00:00'}


def tombstone(name):
    return {'pl_name': name, 'removed_at': REMOVED_AT, 'last_known_snapshot': stored_item(name)}


# Mirrors boto3's BatchWriter: buffer, flush every 25, and flush the remainder on exit.
class FakeBatchWriter:
    def __init__(self, table):
        self.table = table
        self.buffer = []

    def put_item(self, Item):
        self._buffer(('put', Item))

    def delete_item(self, Key):
        self.table.handed.append(Key['pl_name'])
        self._buffer(('delete', Key['pl_name']))

    def _buffer(self, operation):
        self.buffer.append(operation)
        if len(self.buffer) >= FLUSH_SIZE:
            self._flush()

    def _flush(self):
        sending, self.buffer = self.buffer[:FLUSH_SIZE], self.buffer[FLUSH_SIZE:]
        self.table.flushes += 1
        failing = self.table.flushes == self.table.failing_flush
        if not failing or self.table.failing_flush_commits:
            self.table.commit(sending)
        if failing:
            raise RuntimeError('throttled')

    def __enter__(self):
        return self

    def __exit__(self, *exception):
        while self.buffer:
            self._flush()


# Serves as both the planets table and the tombstones table.
class FakeTable:
    def __init__(self, stored_names=(), page_size=1000, scan_error=None, failing_flush=None, failing_flush_commits=False):
        self.stored_names = list(stored_names)
        self.page_size = page_size
        self.scan_error = scan_error
        self.failing_flush = failing_flush
        self.failing_flush_commits = failing_flush_commits
        self.deleted = []
        self.written = {}
        self.handed = []
        self.flushes = 0
        self.scan_requests = []

    def scan(self, **request):
        if self.scan_error:
            raise self.scan_error
        self.scan_requests.append(request)
        start = self.stored_names.index(request['ExclusiveStartKey']['pl_name']) + 1 if 'ExclusiveStartKey' in request else 0
        page = self.stored_names[start:start + self.page_size]
        response = {'Items': [stored_item(name) for name in page]}
        if start + self.page_size < len(self.stored_names):
            response['LastEvaluatedKey'] = {'pl_name': page[-1]}
        return response

    def batch_writer(self):
        return FakeBatchWriter(self)

    def commit(self, operations):
        for kind, payload in operations:
            if kind == 'put':
                self.written[payload['pl_name']] = payload
            else:
                self.deleted.append(payload)


@pytest.fixture
def tombstones():
    return FakeTable()


def test_deletes_only_records_absent_from_the_archive(tombstones):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert set(result.submitted) == {'Retracted b', 'Renamed c'}
    assert sorted(table.deleted) == ['Renamed c', 'Retracted b']
    assert result.aborted is False


def test_tombstone_carries_the_last_known_snapshot(tombstones):
    table = FakeTable(ARCHIVE | {'Retracted b'})

    sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert tombstones.written == {'Retracted b': tombstone('Retracted b')}


def test_tombstones_only_the_records_it_deletes(tombstones):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert set(tombstones.written) == {'Retracted b', 'Renamed c'}
    assert tombstones.deleted == []


def test_tombstone_failure_deletes_nothing(caplog):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})
    tombstones = FakeTable(failing_flush=1)

    with caplog.at_level(logging.ERROR, logger='sweep'):
        result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.aborted is True
    assert result.submitted == ()
    assert table.handed == []
    assert table.deleted == []
    assert 'sweep aborted' in caplog.text


def test_deletes_nothing_when_the_table_matches_the_archive(tombstones):
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.submitted == ()
    assert table.deleted == []
    assert tombstones.written == {}
    assert result.aborted is False


def test_ignores_archive_records_the_table_has_not_stored_yet(tombstones):
    table = FakeTable({'Kepler-22 b'})

    result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.submitted == ()
    assert result.aborted is False


def test_scan_pages_until_the_table_is_exhausted(tombstones):
    stored = [f'Planet {index}' for index in range(250)]
    table = FakeTable(stored + ['Retracted b'], page_size=100)

    result = sweep_removed(table, tombstones, set(stored), REMOVED_AT)

    assert result.submitted == ('Retracted b',)
    assert len(table.scan_requests) == 3
    assert 'ExclusiveStartKey' not in table.scan_requests[0]


def test_reports_every_removal_when_deletions_span_several_flushes(tombstones):
    table = FakeTable(SPANNING_SURVIVORS | SPANNING_STALE)

    result = sweep_removed(table, tombstones, SPANNING_SURVIVORS, REMOVED_AT)

    assert result.aborted is False
    assert set(result.submitted) == SPANNING_STALE
    assert set(table.deleted) == SPANNING_STALE
    assert set(tombstones.written) == SPANNING_STALE


def test_partial_flush_failure_reports_the_records_it_may_have_committed(tombstones, caplog):
    table = FakeTable(SPANNING_SURVIVORS | SPANNING_STALE, failing_flush=2, failing_flush_commits=True)

    with caplog.at_level(logging.ERROR, logger='sweep'):
        result = sweep_removed(table, tombstones, SPANNING_SURVIVORS, REMOVED_AT)

    assert result.aborted is True
    assert len(table.deleted) == 2 * FLUSH_SIZE
    assert set(result.submitted) == set(table.handed)
    assert set(table.deleted) <= set(result.submitted) <= SPANNING_STALE
    assert set(tombstones.written) == SPANNING_STALE
    assert 'sweep incomplete' in caplog.text


def test_flush_failure_before_anything_commits_still_bounds_the_damage(tombstones):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'}, failing_flush=1)

    result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.aborted is True
    assert table.deleted == []
    assert set(result.submitted) == {'Retracted b', 'Renamed c'}


# 1 of 20 stored records is exactly the 5% ceiling; 2 of 20 is over it.
@pytest.mark.parametrize(
    'stale_count, expected_aborted',
    [(1, False), (2, True)],
    ids=['at-the-ceiling', 'over-the-ceiling'],
)
def test_ceiling_bounds_how_much_one_sweep_may_delete(tombstones, stale_count, expected_aborted):
    assert MAXIMUM_DELETION_FRACTION == 0.05, 'the counts below are hand-computed against a 5% ceiling'

    survivors = {f'Planet {index}' for index in range(20 - stale_count)}
    stale = {f'Retracted {index}' for index in range(stale_count)}
    table = FakeTable(survivors | stale)

    result = sweep_removed(table, tombstones, survivors, REMOVED_AT)

    assert result.aborted is expected_aborted
    assert table.deleted == ([] if expected_aborted else list(stale))
    assert set(tombstones.written) == (set() if expected_aborted else stale)


def test_truncated_archive_fetch_aborts_instead_of_emptying_the_table(tombstones):
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, tombstones, set(), REMOVED_AT)

    assert result.aborted is True
    assert result.submitted == ()
    assert table.deleted == []
    assert tombstones.written == {}


def test_empty_table_is_not_a_division_by_zero(tombstones):
    table = FakeTable()

    result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.submitted == ()
    assert result.aborted is False


def test_scan_failure_aborts_the_sweep_without_raising(tombstones, caplog):
    table = FakeTable(ARCHIVE | {'Retracted b'}, scan_error=RuntimeError('throttled'))

    with caplog.at_level(logging.ERROR, logger='sweep'):
        result = sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    assert result.aborted is True
    assert result.submitted == ()
    assert table.deleted == []
    assert tombstones.written == {}
    assert 'sweep aborted' in caplog.text


def test_logs_every_deleted_name(tombstones, caplog):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    with caplog.at_level(logging.INFO, logger='sweep'):
        sweep_removed(table, tombstones, ARCHIVE, REMOVED_AT)

    logged = '\n'.join(record.getMessage() for record in caplog.records)
    assert 'Retracted b' in logged
    assert 'Renamed c' in logged


def test_logs_an_error_when_the_ceiling_aborts_the_sweep(tombstones, caplog):
    table = FakeTable(ARCHIVE)

    with caplog.at_level(logging.INFO, logger='sweep'):
        sweep_removed(table, tombstones, set(), REMOVED_AT)

    assert [record.levelno for record in caplog.records] == [logging.ERROR]
