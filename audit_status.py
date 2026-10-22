import json

with open("predictions_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for status in ["未实现", "已实现", "部分实现"]:
    items = [x for x in data if x["status"] == status]
    print(f"\n=================== Status: {status} ({len(items)}) ===================")
    for x in items[:15]:
        print(f"#{x['id']} | Q: {x['question'][:25]} | A: {x['answer'][:35]}")
        print(f"     Core: {x['core_prediction'][:40]}")
        print(f"     FactCheck: {x['fact_check'][:50]}")
