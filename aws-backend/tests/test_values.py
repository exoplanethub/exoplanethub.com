from decimal import Decimal

import pytest

from values import measured, to_decimal


@pytest.mark.parametrize(
    'value, expected',
    [
        pytest.param(0.1, Decimal('0.1'), id='float'),
        pytest.param(4050.0, Decimal('4050.0'), id='whole-float'),
        pytest.param(7, Decimal('7'), id='int'),
        pytest.param(1e-9, Decimal('1E-9'), id='scientific'),
    ],
)
def test_to_decimal_goes_through_the_string_form(value, expected):
    converted = to_decimal(value)

    assert type(converted) is Decimal
    assert converted == expected


def test_to_decimal_keeps_none():
    assert to_decimal(None) is None


def test_to_decimal_is_stable_across_a_round_trip():
    # DynamoDB stores the decimal string, so a re-read value compares equal to a fresh conversion.
    stored = Decimal(str(to_decimal(0.1)))

    assert to_decimal(0.1) == stored


@pytest.mark.parametrize('value', [1, 1.0, 1e-9, 4050.0, 10**300])
def test_measured_accepts_finite_positive_numbers(value):
    assert measured(value) is True


@pytest.mark.parametrize(
    'value',
    [
        pytest.param(None, id='none'),
        pytest.param(0, id='zero'),
        pytest.param(-1.0, id='negative'),
        pytest.param(float('nan'), id='nan'),
        pytest.param(float('inf'), id='infinity'),
        pytest.param(10**400, id='int-too-large-for-float'),
        pytest.param(True, id='bool'),
        pytest.param('1.0', id='numeric-string'),
        pytest.param(Decimal('1.0'), id='decimal'),
        pytest.param([1.0], id='list'),
    ],
)
def test_measured_rejects_everything_else(value):
    assert measured(value) is False
