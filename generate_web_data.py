# -*- coding: utf-8 -*-
"""
Regenerate predictions_data.js and predictions.json with:
1. Trump (#12) set to '部分实现'
2. Simplified categories: 政治, 科技, 经济, 环境, 社会, 医疗, 文娱, 哲学, 个人
"""
import json

with open("predictions_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

category_map = {
    "国际地缘与战争": "政治",
    "科技与人工智能": "科技",
    "经济金融与房产": "经济",
    "气候环境与地理": "环境",
    "社会职业与民生": "社会",
    "医疗健康与生命": "医疗",
    "文化娱乐与体育": "文娱",
    "哲学灵学与信仰": "哲学",
    "穿越设定与个人": "个人"
}

override_adjustments = {
    12: {
        "status": "部分实现",
        "core_prediction": "特朗普会继续连任，但他将面临来自亲人与反对他的人给与的巨大压力。",
        "fact_check": "【部分实现】特朗普在2020年总统大选中连任受挫败于拜登（未能实现连续执政），但在经历巨大司法调查与舆论压力后，于2024年大选再次获胜重新当选总统，实现非连续任期的再度执政，故归为部分实现。"
    },
    18: {
        "status": "未实现",
        "core_prediction": "2047年全球人口80亿，2060年减少到53亿。",
        "fact_check": "【时间大幅偏离】联合国官方数据显示全球人口已于2022年11月15日突破80亿，比KFK预测的2047年提前了整整25年；后半段2060降至53亿待检验。"
    },
    113: {
        "status": "未实现",
        "core_prediction": "台湾问题在2022年–2023年会有一次事件（针对何时回归的提问）。",
        "fact_check": "【回归未实现】2022年8月虽发生佩洛西访台及解放军环岛大演训重大事件，但两岸并未在2022-2023年实现统一，若按提问‘何时回归’视为未实现。"
    },
    136: {
        "status": "部分实现",
        "core_prediction": "1. 2032夏季奥运会在雅加达；2. 2020台湾领导人和上一届同一个人。",
        "fact_check": "【一真一假】1. 2020年台湾大选蔡英文连任，确实是‘同一个人’（精准命中）；2. 2021年国际奥委会官方宣布2032年奥运会由澳大利亚布里斯班举办，雅加达落选（预测翻车）。"
    }
}

for item in data:
    item_id = item["id"]
    # Simplify category
    old_cat = item.get("category", "")
    item["category"] = category_map.get(old_cat, old_cat)
    
    # Overrides
    if item_id in override_adjustments:
        adj = override_adjustments[item_id]
        item["status"] = adj["status"]
        item["core_prediction"] = adj["core_prediction"]
        item["fact_check"] = adj["fact_check"]

    # Clean tags so old long category name is replaced
    new_tags = []
    for t in item.get("tags", []):
        new_t = category_map.get(t, t)
        if new_t not in new_tags:
            new_tags.append(new_t)
    item["tags"] = new_tags

# Write to predictions.json
with open("predictions.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Write to predictions_data.js
js_content = f"// KFK 2060 预言完整数据集 (282条)\nwindow.PREDICTIONS_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
with open("predictions_data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Generated predictions.json and predictions_data.js with {len(data)} items successfully!")
