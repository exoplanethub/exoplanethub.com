import math
from decimal import Decimal


# bool is an int subclass; a measurement is a finite positive number; huge ints overflow float().
def measured(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        number = float(value)
    except OverflowError:
        return False
    return math.isfinite(number) and number > 0


# Via str(): Decimal(0.1) would expose the float's binary expansion, and boto3 refuses raw floats.
def to_decimal(value):
    if value is None:
        return None
    return Decimal(str(value))
