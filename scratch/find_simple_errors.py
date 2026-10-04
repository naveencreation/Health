import subprocess
import json

res = subprocess.run(["npx.cmd", "eslint", "src", "--format", "json"], capture_output=True, text=True, encoding="utf-8")
data = json.loads(res.stdout)
for f in data:
    for m in f.get("messages", []):
        if m.get("ruleId") in ["react/display-name", "react/no-unescaped-entities"]:
            print(f"{m['ruleId']} | {f['filePath']}:{m['line']} | {m['message']}")
