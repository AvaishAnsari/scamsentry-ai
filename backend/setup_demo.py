#!/usr/bin/env python3
"""Convenience entry point for running setup_demo from within backend/."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

root_setup = backend_dir.parent / "setup_demo.py"
if root_setup.exists():
    with open(root_setup, "r", encoding="utf-8") as f:
        code = compile(f.read(), str(root_setup), "exec")
        exec(code, {"__name__": "__main__", "__file__": str(root_setup)})
else:
    print(f"Error: {root_setup} not found.")
