import subprocess
import json
from collections import Counter

res = subprocess.run(["npx.cmd", "eslint", "src", "--format", "json"], capture_output=True, text=True, encoding="utf-8")
try:
    data = json.loads(res.stdout)
    errors = []
    warnings = []
    for file_res in data:
        for m in file_res.get("messages", []):
            item = (file_res["filePath"], m["ruleId"], m["message"], m["line"])
            if m["severity"] == 2:
                errors.append(item)
            else:
                warnings.append(item)
    
    print(f"Total Errors: {len(errors)}")
    print(f"Total Warnings: {len(warnings)}")
    print("\n--- ERROR RULES FREQUENCY ---")
    error_counts = Counter([e[1] for e in errors])
    for rule, count in error_counts.most_common():
        print(f"  {rule}: {count}")
        
    print("\n--- SAMPLE ERRORS ---")
    for e in errors[:25]:
        print(f"  [{e[1]}] {e[0]}:{e[3]} -> {e[2]}")
        
except Exception as ex:
    print("Error parsing json:", ex)
    print("Stdout:", res.stdout[:500])
    print("Stderr:", res.stderr[:500])
