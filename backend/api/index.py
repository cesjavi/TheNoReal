import sys

print(">>> Starting TheNoReal backend handler...", file=sys.stderr)

try:
    from mangum import Mangum
    from app.main import app
    handler = Mangum(app)
    print(">>> Handler loaded successfully ✅", file=sys.stderr)
except Exception as e:
    import traceback
    print(">>> ERROR while loading handler:", e, file=sys.stderr)
    traceback.print_exc()
    raise e
