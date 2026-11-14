#!/usr/bin/env python3
"""Start the app behind the local reverse proxy and verify production headers/routes."""
from __future__ import annotations
import json, os, signal, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
VENV=os.environ.get("MATSYA_VENV","/tmp/matsya-baseline-venv")
env=os.environ.copy()
env.update({"PYTHONPATH":str(ROOT/"backend"),"DATA_DIR":"/tmp/matsya-proxy-smoke","ANALYZER":"baseline","MPLCONFIGDIR":"/tmp/mpl-smoke"})
processes=[]
def start(cmd,**kwargs):
    p=subprocess.Popen(cmd,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,**kwargs);processes.append(p);return p
def fetch(url,headers=None):
    req=urllib.request.Request(url,headers=headers or {})
    with urllib.request.urlopen(req,timeout=5) as r:return r.status,r.headers, r.read()
try:
    backend=start([f"{VENV}/bin/uvicorn","app.main:app","--host","127.0.0.1","--port","8000"],cwd=ROOT/"backend")
    frontend=start(["npm","run","start","--","-p","3000","-H","127.0.0.1"],cwd=ROOT/"frontend")
    proxy=start([f"{VENV}/bin/python", "scripts/local_proxy.py"],cwd=ROOT)
    ready=False
    for _ in range(60):
        try:
            if fetch("http://127.0.0.1:8080/health")[0]==200 and fetch("http://127.0.0.1:8080/")[0]==200:
                ready=True;break
        except Exception:pass
        if any(p.poll() is not None for p in processes):break
        time.sleep(1)
    if not ready:raise RuntimeError("Production-like local stack did not become healthy")
    checks=[]
    for path in ("/","/about","/science","/how-it-works","/resources","/validation","/app"):
        code,headers,body=fetch("http://127.0.0.1:8080"+path)
        assert code==200,(path,code)
        if path == "/":
            for key in ("x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options", "content-security-policy"):
                assert key in {h.lower() for h in headers.keys()}, ("missing security header", key, list(headers.keys()))
        checks.append({"path":path,"status":code,"bytes":len(body)})
    code,h,b=fetch("http://127.0.0.1:8080/api/v1/system/status")
    status=json.loads(b)
    assert code==200 and status["mode"]=="baseline"
    checks.append({"path":"/api/v1/system/status","status":code,"mode":status["mode"],"onnx_eligible":status.get("onnx_eligible")})
    print(json.dumps({"passed":True,"checks":checks},indent=2))
except Exception as exc:
    print(json.dumps({"passed":False,"error":str(exc)},indent=2));sys.exit(1)
finally:
    for p in reversed(processes):
        if p.poll() is None:
            p.send_signal(signal.SIGTERM)
    for p in processes:
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill()
