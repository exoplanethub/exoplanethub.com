import sys
from pathlib import Path

# `lambda` is a Python keyword, so `import lambda.sync.app` is a SyntaxError; tests import flat.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda" / "sync"))
