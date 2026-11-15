#!/usr/bin/env python3
"""Create persistent credentials once. Never print or replace existing keys."""
from pathlib import Path
import os
import secrets
ROOT=Path(__file__).resolve().parents[1]
def create(path,text):
    try:
        fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    except FileExistsError:
        print("Preserved:",path.relative_to(ROOT))
        return
    with os.fdopen(fd,"w") as stream:stream.write(text)
    print("Created:",path.relative_to(ROOT))
def main():
    for folder in ["models","gateway","config","scripts","tests","logs","docs","work","runtime/llama"]:
        (ROOT/folder).mkdir(parents=True,exist_ok=True)
    create(ROOT/"config/internal-api-key",secrets.token_urlsafe(48)+"\n")
    create(ROOT/"config/environment","MODEL_API_KEY="+secrets.token_urlsafe(48)+"\nPROJECT_DIR="+str(ROOT)+"\n")
if __name__=="__main__":main()
