import pytest

from esi import compute_esi

EARTH = {'pl_rade': 1.0, 'pl_eqt': 288.0, 'pl_bmasse': 1.0}
SUPER_EARTH = {'pl_rade': 1.6, 'pl_eqt': 250.0, 'pl_bmasse': 3.5}
HOT_JUPITER = {'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_bmasse': 317.8}

# Expected scores are hand-computed from the Decision 2 formula, not captured from this module.
PINNED_VECTORS = [
    pytest.param(EARTH, 100, id='earth'),
    pytest.param({'pl_rade': 0.92, 'pl_eqt': 246.0, 'pl_bmasse': 0.69}, 90, id='trappist-1e'),
    pytest.param(SUPER_EARTH, 68, id='super-earth'),
    pytest.param(HOT_JUPITER, 7, id='hot-jupiter'),
    pytest.param({'pl_rade': 1.6, 'pl_bmasse': 3.5}, 58, id='radius-and-mass'),
    pytest.param({'pl_rade': 1.6, 'pl_eqt': 250.0}, 85, id='radius-and-temperature'),
    pytest.param({'pl_eqt': 250.0, 'pl_bmasse': 3.5}, 64, id='temperature-and-mass'),
]

OUT_OF_DOMAIN_VALUES = [
    pytest.param(None, id='none'),
    pytest.param(0, id='zero-int'),
    pytest.param(0.0, id='zero-float'),
    pytest.param(-1.0, id='negative'),
    pytest.param(-288.0, id='negative-earth-temperature'),
    pytest.param(float('nan'), id='nan'),
    pytest.param(float('inf'), id='infinity'),
    pytest.param(10**400, id='int-too-large-for-float'),
    pytest.param(True, id='bool-true'),
    pytest.param('1.0', id='numeric-string'),
    pytest.param('', id='empty-string'),
    pytest.param([1.0], id='list'),
]


@pytest.mark.parametrize('record, expected', PINNED_VECTORS)
def test_pinned_vectors(record, expected):
    assert compute_esi(record) == expected


def test_earth_scores_one_hundred():
    assert compute_esi(EARTH) == 100


def test_hot_jupiter_scores_far_below_earth():
    assert compute_esi(HOT_JUPITER) < 50


@pytest.mark.parametrize('omitted', sorted(EARTH))
def test_two_components_still_score(omitted):
    record = {field: value for field, value in SUPER_EARTH.items() if field != omitted}

    assert compute_esi(record) is not None


@pytest.mark.parametrize('value', OUT_OF_DOMAIN_VALUES)
@pytest.mark.parametrize('field', sorted(EARTH))
def test_out_of_domain_value_scores_as_if_absent(field, value):
    corrupted = {**SUPER_EARTH, field: value}
    absent = {name: known for name, known in SUPER_EARTH.items() if name != field}

    assert compute_esi(corrupted) == compute_esi(absent)


def test_earth_temperature_negated_does_not_divide_by_zero():
    assert compute_esi({**EARTH, 'pl_eqt': -288.0}) == compute_esi({'pl_rade': 1.0, 'pl_bmasse': 1.0})


@pytest.mark.parametrize('value', OUT_OF_DOMAIN_VALUES)
def test_fewer_than_two_valid_components_returns_none(value):
    assert compute_esi({'pl_rade': 1.0, 'pl_eqt': value, 'pl_bmasse': value}) is None


@pytest.mark.parametrize(
    'record',
    [
        pytest.param({}, id='empty'),
        pytest.param({'pl_rade': None, 'pl_eqt': None, 'pl_bmasse': None}, id='all-null'),
        pytest.param({'pl_rade': 1.0}, id='radius-only'),
        pytest.param({'pl_dens': 5.5, 'st_teff': 5778.0}, id='no-esi-fields'),
    ],
)
def test_insufficient_components_returns_none(record):
    assert compute_esi(record) is None


def test_unrelated_fields_are_ignored():
    assert compute_esi({**EARTH, 'pl_dens': 5.5, 'hostname': 'Sun'}) == compute_esi(EARTH)


def test_score_is_a_plain_int_in_range():
    score = compute_esi(SUPER_EARTH)

    assert type(score) is int
    assert 0 <= score <= 100
