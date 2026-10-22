import re
import json

source_file = r"C:\Users\cxv52\.gemini\antigravity\brain\eeaaa3ab-89c6-4314-b826-a073388af4bd\.system_generated\steps\2\content.md"
output_file = r"C:\Users\cxv52\.gemini\antigravity\scratch\kfk-predictions\raw_qa.json"

with open(source_file, "r", encoding="utf-8") as f:
    text = f.read()

# Pattern for headers
pattern = re.compile(r"<h3 class='toch' id='(\d+)'\s*>(.*?)</h3>", re.DOTALL)
matches = list(pattern.finditer(text))
print(f"Total question headers matched: {len(matches)}")

items = []
for i in range(len(matches)):
    m = matches[i]
    toch_id = int(m.group(1)) # 0-indexed in the HTML
    h3_content = m.group(2).strip()
    
    # Parse number and question text from h3_content
    # e.g. "1. 问：未来人类出去旅游，是乘坐什么交通工具？" or "44. 问: 所以海平面..."
    num_match = re.match(r"^(\d+)\.\s*问[：:]\s*(.*)$", h3_content, re.DOTALL)
    if num_match:
        original_num = int(num_match.group(1))
        question_text = num_match.group(2).strip()
    else:
        original_num = toch_id + 1
        question_text = re.sub(r"^\d+\.\s*问[：:]\s*", "", h3_content).strip()
    
    start_pos = m.end()
    if i + 1 < len(matches):
        end_pos = matches[i+1].start()
    else:
        end_pos = text.find('<div class="turn-small"', start_pos)
        if end_pos == -1:
            end_pos = text.find("</div>", start_pos)
            if end_pos == -1:
                end_pos = len(text)
                
    ans_chunk = text[start_pos:end_pos]
    clean_ans = re.sub(r"<br\s*/?>", "\n", ans_chunk)
    clean_ans = re.sub(r"<[^>]+>", "\n", clean_ans)
    ans_lines = [l.strip() for l in clean_ans.split("\n") if l.strip()]
    final_ans = "\n".join(ans_lines)
    
    items.append({
        "order": i + 1,
        "original_num": original_num,
        "question": question_text,
        "answer": final_ans
    })

print(f"Extracted all {len(items)} items successfully!")
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print("Saved to raw_qa.json.")
