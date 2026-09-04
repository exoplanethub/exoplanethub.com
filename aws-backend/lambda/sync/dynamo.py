def scan_all(table, key):
    request = {}
    items = {}
    while True:
        page = table.scan(**request)
        items.update((item[key], item) for item in page['Items'])
        if not page.get('LastEvaluatedKey'):
            return items
        request['ExclusiveStartKey'] = page['LastEvaluatedKey']
