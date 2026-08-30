import importlib.util
from pathlib import Path

SYNC_DIR = Path(__file__).resolve().parents[1] / "lambda" / "sync"


# find_spec resolves without executing (app.py hits boto3 at import); app is pinned by template.yaml's Handler.
def test_flat_imports_resolve_against_lambda_sync():
    spec = importlib.util.find_spec("app")

    assert spec is not None, f"no module named 'app' on sys.path; expected {SYNC_DIR / 'app.py'}"
    assert (
        Path(spec.origin).resolve() == SYNC_DIR / "app.py"
    ), f"'app' resolved to {spec.origin}, shadowing the Lambda module"
