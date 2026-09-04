import pytest

from esi import compute_esi, esi_similarity

EARTH = {'pl_rade': 1.0, 'pl_eqt': 288.0, 'pl_bmasse': 1.0}
SUPER_EARTH = {'pl_rade': 1.6, 'pl_eqt': 250.0, 'pl_bmasse': 3.5}
HOT_JUPITER = {'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_bmasse': 317.8}
TRAPPIST_1E = {'pl_rade': 0.92, 'pl_eqt': 246.0, 'pl_bmasse': 0.69}

# Expected values are hand-computed from the Decision 2 formula, not captured from this module.
SIMILARITY_VECTORS = [
    pytest.param(EARTH, 1.0, id='earth'),
    pytest.param(TRAPPIST_1E, 0.8967, id='trappist-1e'),
    pytest.param(SUPER_EARTH, 0.6824, id='super-earth'),
    pytest.param(HOT_JUPITER, 0.0705, id='hot-jupiter'),
]

SCORE_VECTORS = [
    pytest.param(EARTH, 100, id='earth'),
    pytest.param(TRAPPIST_1E, 90, id='trappist-1e'),
    pytest.param(SUPER_EARTH, 68, id='super-earth'),
    pytest.param(HOT_JUPITER, 7, id='hot-jupiter'),
    pytest.param({'pl_rade': 1.6, 'pl_bmasse': 3.5}, None, id='radius-and-mass'),
    pytest.param({'pl_rade': 1.6, 'pl_eqt': 250.0}, None, id='radius-and-temperature'),
    pytest.param({'pl_eqt': 250.0, 'pl_bmasse': 3.5}, None, id='temperature-and-mass'),
    pytest.param({'pl_rade': 1.0, 'pl_bmasse': 1.0}, None, id='earth-twin-without-temperature'),
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


@pytest.mark.parametrize('record, expected', SIMILARITY_VECTORS)
def test_similarity_pinned_vectors(record, expected):
    assert esi_similarity(record) == pytest.approx(expected, abs=5e-5)


@pytest.mark.parametrize('record, expected', SCORE_VECTORS)
def test_score_pinned_vectors(record, expected):
    assert compute_esi(record) == expected


@pytest.mark.parametrize('record', [SUPER_EARTH, HOT_JUPITER, TRAPPIST_1E])
def test_score_is_the_similarity_rounded_to_a_percentage(record):
    assert compute_esi(record) == round(100 * esi_similarity(record))


def test_similarity_is_an_unrounded_float_in_the_unit_interval():
    similarity = esi_similarity(SUPER_EARTH)

    assert type(similarity) is float
    assert 0 < similarity < 1
    assert similarity != round(similarity, 2)


def test_earth_scores_one_hundred():
    assert esi_similarity(EARTH) == 1.0
    assert compute_esi(EARTH) == 100


def test_hot_jupiter_scores_far_below_earth():
    assert compute_esi(HOT_JUPITER) < 50


@pytest.mark.parametrize('omitted', sorted(EARTH))
def test_any_missing_component_returns_none(omitted):
    record = {field: value for field, value in SUPER_EARTH.items() if field != omitted}

    assert esi_similarity(record) is None
    assert compute_esi(record) is None


@pytest.mark.parametrize('value', OUT_OF_DOMAIN_VALUES)
@pytest.mark.parametrize('field', sorted(EARTH))
def test_any_out_of_domain_component_returns_none(field, value):
    corrupted = {**SUPER_EARTH, field: value}

    assert esi_similarity(corrupted) is None
    assert compute_esi(corrupted) is None


def test_earth_temperature_negated_does_not_divide_by_zero():
    assert compute_esi({**EARTH, 'pl_eqt': -288.0}) is None


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
    assert esi_similarity(record) is None
    assert compute_esi(record) is None


def test_unrelated_fields_are_ignored():
    assert compute_esi({**EARTH, 'pl_dens': 5.5, 'hostname': 'Sun'}) == compute_esi(EARTH)


def test_score_is_a_plain_int_in_range():
    score = compute_esi(SUPER_EARTH)

    assert type(score) is int
    assert 0 <= score <= 100
