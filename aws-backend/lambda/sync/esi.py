import math

EARTH_REFERENCES = {
    'pl_rade': 1.0,
    'pl_eqt': 288.0,
    'pl_bmasse': 1.0,
}


def esi_similarity(record):
    similarities = []
    for field, earth_value in EARTH_REFERENCES.items():
        value = record.get(field)
        if not _is_measured(value):
            return None
        similarities.append(1 - abs((value - earth_value) / (value + earth_value)))

    return math.prod(similarities) ** (1 / len(similarities))


def compute_esi(record):
    similarity = esi_similarity(record)
    if similarity is None:
        return None
    return round(100 * similarity)


def _is_measured(value):
    # bool is an int subclass; the kernel is undefined at x <= 0; huge ints overflow float().
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        number = float(value)
    except OverflowError:
        return False
    return math.isfinite(number) and number > 0
