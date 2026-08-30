import logging

import pytest

from sweep import MAXIMUM_DELETION_FRACTION, sweep_removed

# Wide enough that a couple of stale records stay under the deletion ceiling.
ARCHIVE = {'Kepler-22 b', 'TRAPPIST-1e', 'Proxima Cen b'} | {f'Filler {index}' for index in range(97)}

FLUSH_SIZE = 25  # boto3 BatchWriter's default flush_amount

# 60 stale records span three flushes and stay under 5% of the 1260 stored.
SPANNING_STALE = {f'Retracted {index}' for index in range(60)}
SPANNING_SURVIVORS = {f'Planet {index}' for index in range(1200)}


# Mirrors boto3's BatchWriter: buffer, flush every 25, and flush the remainder on exit.
class FakeBatchWriter:
    def __init__(self, table):
        self.table = table
        self.buffer = []

    def delete_item(self, Key):
        self.table.handed.append(Key['pl_name'])
        self.buffer.append(Key['pl_name'])
        if len(self.buffer) >= FLUSH_SIZE:
            self._flush()

    def _flush(self):
        sending, self.buffer = self.buffer[:FLUSH_SIZE], self.buffer[FLUSH_SIZE:]
        self.table.flushes += 1
        failing = self.table.flushes == self.table.failing_flush
        if not failing or self.table.failing_flush_commits:
            self.table.committed.extend(sending)
        if failing:
            raise RuntimeError('throttled')

    def __enter__(self):
        return self

    def __exit__(self, *exception):
        while self.buffer:
            self._flush()


class FakeTable:
    def __init__(self, stored_names, page_size=1000, scan_error=None, failing_flush=None, failing_flush_commits=False):
        self.stored_names = list(stored_names)
        self.page_size = page_size
        self.scan_error = scan_error
        self.failing_flush = failing_flush
        self.failing_flush_commits = failing_flush_commits
        self.committed = []
        self.handed = []
        self.flushes = 0
        self.scan_requests = []

    def scan(self, **request):
        if self.scan_error:
            raise self.scan_error
        self.scan_requests.append(request)
        start = self.stored_names.index(request['ExclusiveStartKey']['pl_name']) + 1 if 'ExclusiveStartKey' in request else 0
        page = self.stored_names[start:start + self.page_size]
        response = {'Items': [{'pl_name': name} for name in page]}
        if start + self.page_size < len(self.stored_names):
            response['LastEvaluatedKey'] = {'pl_name': page[-1]}
        return response

    def batch_writer(self):
        return FakeBatchWriter(self)


def test_deletes_only_records_absent_from_the_archive():
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    result = sweep_removed(table, ARCHIVE)

    assert set(result.submitted) == {'Retracted b', 'Renamed c'}
    assert sorted(table.committed) == ['Renamed c', 'Retracted b']
    assert result.aborted is False


def test_deletes_nothing_when_the_table_matches_the_archive():
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, ARCHIVE)

    assert result.submitted == ()
    assert table.committed == []
    assert result.aborted is False


def test_ignores_archive_records_the_table_has_not_stored_yet():
    table = FakeTable({'Kepler-22 b'})

    result = sweep_removed(table, ARCHIVE)

    assert result.submitted == ()
    assert result.aborted is False


def test_scan_pages_until_the_table_is_exhausted():
    stored = [f'Planet {index}' for index in range(250)]
    table = FakeTable(stored + ['Retracted b'], page_size=100)

    result = sweep_removed(table, set(stored))

    assert result.submitted == ('Retracted b',)
    assert len(table.scan_requests) == 3
    assert 'ExclusiveStartKey' not in table.scan_requests[0]


def test_reports_every_removal_when_deletions_span_several_flushes():
    table = FakeTable(SPANNING_SURVIVORS | SPANNING_STALE)

    result = sweep_removed(table, SPANNING_SURVIVORS)

    assert result.aborted is False
    assert set(result.submitted) == SPANNING_STALE
    assert set(table.committed) == SPANNING_STALE


def test_partial_flush_failure_reports_the_records_it_may_have_committed(caplog):
    table = FakeTable(SPANNING_SURVIVORS | SPANNING_STALE, failing_flush=2, failing_flush_commits=True)

    with caplog.at_level(logging.ERROR, logger='sweep'):
        result = sweep_removed(table, SPANNING_SURVIVORS)

    assert result.aborted is True
    assert len(table.committed) == 2 * FLUSH_SIZE
    assert set(result.submitted) == set(table.handed)
    assert set(table.committed) <= set(result.submitted) <= SPANNING_STALE
    assert 'sweep incomplete' in caplog.text


def test_flush_failure_before_anything_commits_still_bounds_the_damage():
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'}, failing_flush=1)

    result = sweep_removed(table, ARCHIVE)

    assert result.aborted is True
    assert table.committed == []
    assert set(result.submitted) == {'Retracted b', 'Renamed c'}


# 1 of 20 stored records is exactly the 5% ceiling; 2 of 20 is over it.
@pytest.mark.parametrize(
    'stale_count, expected_aborted',
    [(1, False), (2, True)],
    ids=['at-the-ceiling', 'over-the-ceiling'],
)
def test_ceiling_bounds_how_much_one_sweep_may_delete(stale_count, expected_aborted):
    assert MAXIMUM_DELETION_FRACTION == 0.05, 'the counts below are hand-computed against a 5% ceiling'

    survivors = {f'Planet {index}' for index in range(20 - stale_count)}
    stale = {f'Retracted {index}' for index in range(stale_count)}
    table = FakeTable(survivors | stale)

    result = sweep_removed(table, survivors)

    assert result.aborted is expected_aborted
    assert table.committed == ([] if expected_aborted else list(stale))


def test_truncated_archive_fetch_aborts_instead_of_emptying_the_table():
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, set())

    assert result.aborted is True
    assert result.submitted == ()
    assert table.committed == []


def test_empty_table_is_not_a_division_by_zero():
    table = FakeTable([])

    result = sweep_removed(table, ARCHIVE)

    assert result.submitted == ()
    assert result.aborted is False


def test_scan_failure_aborts_the_sweep_without_raising(caplog):
    table = FakeTable(ARCHIVE | {'Retracted b'}, scan_error=RuntimeError('throttled'))

    with caplog.at_level(logging.ERROR, logger='sweep'):
        result = sweep_removed(table, ARCHIVE)

    assert result.aborted is True
    assert result.submitted == ()
    assert table.committed == []
    assert 'sweep aborted' in caplog.text


def test_logs_every_deleted_name(caplog):
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    with caplog.at_level(logging.INFO, logger='sweep'):
        sweep_removed(table, ARCHIVE)

    logged = '\n'.join(record.getMessage() for record in caplog.records)
    assert 'Retracted b' in logged
    assert 'Renamed c' in logged


def test_logs_an_error_when_the_ceiling_aborts_the_sweep(caplog):
    table = FakeTable(ARCHIVE)

    with caplog.at_level(logging.INFO, logger='sweep'):
        sweep_removed(table, set())

    assert [record.levelno for record in caplog.records] == [logging.ERROR]
