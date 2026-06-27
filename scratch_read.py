import json
import re

transcript_path = r"C:\Users\hp\.gemini\antigravity-ide\brain\975bd77d-97fb-4507-a1b3-bbbccf6862f1\.system_generated\logs\transcript_full.jsonl"
output_path = r"c:\Users\hp\OneDrive\Documents\CONSTRUCTO\full_modules.txt"

try:
    with open(transcript_path, "r", encoding="utf-8") as f:
        first_line = f.readline()

    data = json.loads(first_line)
    content = data.get("content", "")

    # Let's find all occurrences of MODULE \d+ and extract their context fully
    matches = list(re.finditer(r"MODULE\s+(\d+)", content))
    results = []
    for i, m in enumerate(matches):
        mod_num = m.group(1)
        start = m.start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(content)
        snippet = content[start:end]
        # replace literal \r and \n with actual formatting
        formatted = snippet.replace("\\r\\n", "\n").replace("\\n", "\n")
        results.append(f"=== MODULE {mod_num} ===\n{formatted}\n")

    with open(output_path, "w", encoding="utf-8") as f_out:
        f_out.write("\n".join(results))
    print("Success: modules written to full_modules.txt")
except Exception as e:
    print(f"Error: {e}")
