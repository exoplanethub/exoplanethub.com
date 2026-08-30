import logging

import pytest

from sweep import MAXIMUM_DELETION_FRACTION, sweep_removed

# Wide enough that a couple of stale records stay under the deletion ceiling.
ARCHIVE = {'Kepler-22 b', 'TRAPPIST-1e', 'Proxima Cen b'} | {f'Filler {index}' for index in range(97)}


class FakeTable:
    def __init__(self, stored_names, page_size=1000, scan_error=None, delete_error=None):
        self.stored_names = list(stored_names)
        self.page_size = page_size
        self.scan_error = scan_error
        self.delete_error = delete_error
        self.deleted = []
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
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exception):
        return False

    def delete_item(self, Key):
        if self.delete_error:
            raise self.delete_error
        self.deleted.append(Key['pl_name'])


def test_deletes_only_records_absent_from_the_archive():
    table = FakeTable(ARCHIVE | {'Retracted b', 'Renamed c'})

    result = sweep_removed(table, ARCHIVE)

    assert set(result.deleted) == {'Retracted b', 'Renamed c'}
    assert sorted(table.deleted) == ['Renamed c', 'Retracted b']
    assert result.aborted is False


def test_deletes_nothing_when_the_table_matches_the_archive():
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, ARCHIVE)

    assert result.deleted == ()
    assert table.deleted == []
    assert result.aborted is False


def test_ignores_archive_records_the_table_has_not_stored_yet():
    table = FakeTable({'Kepler-22 b'})

    result = sweep_removed(table, ARCHIVE)

    assert result.deleted == ()
    assert result.aborted is False


def test_scan_pages_until_the_table_is_exhausted():
    stored = [f'Planet {index}' for index in range(250)]
    table = FakeTable(stored + ['Retracted b'], page_size=100)

    result = sweep_removed(table, set(stored))

    assert result.deleted == ('Retracted b',)
    assert len(table.scan_requests) == 3
    assert 'ExclusiveStartKey' not in table.scan_requests[0]


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
    assert table.deleted == ([] if expected_aborted else list(stale))


def test_truncated_archive_fetch_aborts_instead_of_emptying_the_table():
    table = FakeTable(ARCHIVE)

    result = sweep_removed(table, set())

    assert result.aborted is True
    assert result.deleted == ()
    assert table.deleted == []


def test_empty_table_is_not_a_division_by_zero():
    table = FakeTable([])

    result = sweep_removed(table, ARCHIVE)

    assert result.deleted == ()
    assert result.aborted is False


@pytest.mark.parametrize(
    'failure',
    [
        pytest.param({'scan_error': RuntimeError('throttled')}, id='scan-fails'),
        pytest.param({'delete_error': RuntimeError('throttled')}, id='delete-fails'),
    ],
)
def test_dynamodb_failure_aborts_the_sweep_without_raising(failure):
    table = FakeTable(ARCHIVE | {'Retracted b'}, **failure)

    result = sweep_removed(table, ARCHIVE)

    assert result.aborted is True
    assert result.deleted == ()


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
