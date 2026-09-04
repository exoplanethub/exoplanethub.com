from dynamo import scan_all


class FakeTable:
    def __init__(self, items, page_size):
        self.items = items
        self.page_size = page_size
        self.scan_requests = []

    def scan(self, **request):
        self.scan_requests.append(request)
        start = request['ExclusiveStartKey']['position'] if 'ExclusiveStartKey' in request else 0
        page = self.items[start:start + self.page_size]
        response = {'Items': page}
        if start + self.page_size < len(self.items):
            response['LastEvaluatedKey'] = {'position': start + self.page_size}
        return response


ITEMS = [{'name': f'Planet {index}', 'index': index} for index in range(7)]


def test_keys_every_item_by_the_given_attribute():
    table = FakeTable(ITEMS, page_size=100)

    stored = scan_all(table, 'name')

    assert stored == {item['name']: item for item in ITEMS}
    assert table.scan_requests == [{}]


def test_follows_last_evaluated_key_until_the_table_is_exhausted():
    table = FakeTable(ITEMS, page_size=3)

    stored = scan_all(table, 'name')

    assert stored == {item['name']: item for item in ITEMS}
    assert table.scan_requests == [
        {},
        {'ExclusiveStartKey': {'position': 3}},
        {'ExclusiveStartKey': {'position': 6}},
    ]


def test_empty_table_scans_once():
    table = FakeTable([], page_size=3)

    assert scan_all(table, 'name') == {}
    assert table.scan_requests == [{}]
