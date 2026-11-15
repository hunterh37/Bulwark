#!/usr/bin/env python3
from pathlib import Path
import json,subprocess,time
ROOT=Path(__file__).resolve().parents[1]
state=ROOT/"work/validation-state.json"
def update(phase,**values):
    state.write_text(json.dumps({"phase":phase,**values},indent=2))
deadline=time.monotonic()+1800
update("waiting_for_model")
while not (ROOT/"logs/model-verified.json").exists():
    if time.monotonic()>deadline:
        update("failed",reason="model download timeout");raise SystemExit(1)
    time.sleep(3)
for phase,command in [
    ("calibration",[str(ROOT/".venv/bin/python"),str(ROOT/"scripts/calibrate.py")]),
    ("lifecycle",[str(ROOT/".venv/bin/python"),str(ROOT/"scripts/test_e2e.py")]),
    ("unit_tests",[str(ROOT/".venv/bin/python"),"-m","pytest","-q"])]:
    update(phase)
    result=subprocess.run(command,cwd=ROOT,stdout=(ROOT/"logs"/(phase+"-run.log")).open("w"),stderr=subprocess.STDOUT)
    if result.returncode:
        update("failed",failed_phase=phase,exit_code=result.returncode)
        raise SystemExit(result.returncode)
update("complete")
