import json

with open("predictions_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total: {len(data)}")
for x in data:
    txt = x["question"] + " " + x["answer"]
    for y in ["2019", "2020", "2021", "2022", "2023", "2024", "2025"]:
        if y in txt:
            q_clean = x["question"].replace("\n", " ")[:30]
            a_clean = x["answer"].replace("\n", " ")[:40]
            print(f"#{x['id']} [{x['status']}] Year:{y} | Q:{q_clean} | A:{a_clean}")
            break
