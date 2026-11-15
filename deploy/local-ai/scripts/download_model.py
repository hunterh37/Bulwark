#!/usr/bin/env python3
"""Download only the pinned instruct IQ4_XS GGUF, then verify published SHA256."""
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ["HF_HOME"]=str(ROOT/"work/huggingface")
os.environ["HF_HUB_DISABLE_XET"]="1"
import hashlib
import json
import shutil
import urllib.request
from huggingface_hub import hf_hub_download

REPOSITORY="gabriellarson/Foundation-Sec-8B-Instruct-GGUF"
REVISION="a50bbd0bbb46a333c6cda11e9e8d7717ced39777"
FILENAME="Foundation-Sec-8B-Instruct-IQ4_XS.gguf"
SIZE=4448378112
SHA256="3ffda7f9c9952e41e6b70d211be09facea176d0e9cff88f8d042ac5e587a1962"

def main():
    target=ROOT/"models"/FILENAME
    if not target.exists():
        if shutil.disk_usage(ROOT).free<SIZE*2:
            raise SystemExit("At least twice the model size must be free.")
        url="https://huggingface.co/api/models/"+REPOSITORY+"/revision/"+REVISION+"?blobs=true"
        metadata=json.load(urllib.request.urlopen(url,timeout=30))
        item=next(x for x in metadata["siblings"] if x["rfilename"]==FILENAME)
        if item["size"]!=SIZE or item["lfs"]["sha256"]!=SHA256:
            raise SystemExit("Published metadata differs from the pinned provenance record.")
        (ROOT/"logs/model-repository.json").write_text(json.dumps(metadata,indent=2))
        target=Path(hf_hub_download(REPOSITORY,FILENAME,revision=REVISION,local_dir=ROOT/"models"))
    if target.stat().st_size!=SIZE:
        raise SystemExit("Model size differs; existing file was not overwritten.")
    with target.open("rb") as stream:
        actual=hashlib.file_digest(stream,"sha256").hexdigest()
    if actual!=SHA256:
        raise SystemExit("SHA256 mismatch; do not start inference.")
    result={"repository":REPOSITORY,"revision":REVISION,"filename":FILENAME,
            "size":SIZE,"sha256":actual,"verified":True}
    (ROOT/"logs/model-verified.json").write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__=="__main__":main()
