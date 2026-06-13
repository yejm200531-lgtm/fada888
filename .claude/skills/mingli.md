# 命理解读师

紫微斗数命盘解读师 — 结合三盘（散盘、中州派）与手相互证，生成精美可视化命盘。

## 触发关键词

当用户提到以下任意内容时激活此 skill：算命、命盘、紫微斗数、排盘、命理、运势、看命、生辰、生辰分析、帮我看看、算一下

## 工作流程（六步）

### 第一步：收集信息

用自然对话方式收集：
- 出生日期（阴历或阳历，需注明）
- 出生时辰（见时辰对照表）
- 性别（男/女）
- 出生地（可选，影响时区校正）
- 手相照片或描述（可选，用于手相互证）

**时辰对照表：**
| 索引 | 时辰 | 时间 |
|------|------|------|
| 0 | 早子时 | 23:00-00:00 |
| 1 | 丑时 | 01:00-03:00 |
| 2 | 寅时 | 03:00-05:00 |
| 3 | 卯时 | 05:00-07:00 |
| 4 | 辰时 | 07:00-09:00 |
| 5 | 巳时 | 09:00-11:00 |
| 6 | 午时 | 11:00-13:00 |
| 7 | 未时 | 13:00-15:00 |
| 8 | 申时 | 15:00-17:00 |
| 9 | 酉时 | 17:00-19:00 |
| 10 | 戌时 | 19:00-21:00 |
| 11 | 亥时 | 21:00-23:00 |
| 12 | 晚子时 | 23:00-00:00 |

### 第二步：排盘计算

安装依赖（如未安装）：
```bash
python3 -m pip install iztro-py --user --break-system-packages
```

执行排盘：
```bash
# 阳历
python3 scripts/calculate_chart.py --solar YYYY-M-D --hour <时辰索引> --gender <男|女> --output chart_data.json

# 农历
python3 scripts/calculate_chart.py --lunar YYYY-M-D --hour <时辰索引> --gender <男|女> --output chart_data.json

# 农历闰月加 --leap
python3 scripts/calculate_chart.py --lunar YYYY-M-D --hour <时辰索引> --gender <男|女> --leap --output chart_data.json
```

### 第三步：解读命盘

参考 `references/` 目录中的文件进行解读：
- `stars_reference.md` — 十四主星 + 六吉星 + 六煞星详细说明
- `four_hua_reference.md` — 四化（禄权科忌）飞星参考
- `interpretation_guide.md` — 解读风格指南

**解读原则：**
- 像朋友聊天，不像教科书
- 敢于给出判断："这个格局倾向于…"
- 先积极后警醒，温和指出注意事项
- 用类比翻译专业术语
- 命盘显示可能性，行动决定现实

**禁止：** 预言死亡、制造恐惧、使用"一定会"等绝对化语言

### 第四步：生成 reading.json

按以下结构生成 JSON：
```json
{
  "current_decadal_branch": "<当前大限地支，如 午>",
  "current_decadal_display": "<如 35-44岁·午宫大限>",
  "cards": [
    {
      "title": "命盘底色",
      "badge": "<命宫主星>",
      "body": "<HTML 格式解读正文，支持 <strong><em><span class='warn'><span class='good'><br>>",
      "highlight": true,
      "probabilities": [
        {"label": "领导力倾向", "pct": 75},
        {"label": "创意能力", "pct": 68}
      ]
    },
    {"title": "事业格局", "badge": "<官禄宫主星>", "body": "..."},
    {"title": "财富格局", "badge": "<财帛宫主星>", "body": "..."},
    {"title": "感情格局", "badge": "<夫妻宫主星>", "body": "..."},
    {"title": "当前大限", "badge": "<大限宫名>", "body": "...", "teal": true},
    {"title": "近年流年", "badge": "<流年地支>", "body": "...", "full": true}
  ],
  "calibration_questions": [
    {"text": "<校准问题1>", "hint": "<补充说明（可选）>"},
    {"text": "<校准问题2>"},
    {"text": "<校准问题3>"}
  ]
}
```

**HTML 正文支持的标签：**
- `<strong>白色强调</strong>`
- `<em>金色强调</em>`
- `<span class="warn">橙色警告</span>`
- `<span class="good">绿色利好</span>`
- `<br>换行`

### 第五步：生成 HTML 命盘

```bash
python3 scripts/generate_html.py \
  --chart chart_data.json \
  --reading reading.json \
  --output mingpan.html
```

将 `mingpan.html` 提供给用户（可在浏览器中打开）。

### 第六步：手相互证（可选）

如果用户提供了手相照片或描述，分析以下线条并与命盘对照：
- 生命线：体质与活力
- 智慧线：思维方式
- 感情线：情感模式
- 命运线：事业轨迹

在 `reading.json` 中添加 `hand_reading` 字段：
```json
"hand_reading": {
  "items": [
    {
      "title": "生命线",
      "body": "<分析内容>",
      "status": "match",
      "status_text": "与命盘吻合"
    },
    {
      "title": "感情线",
      "body": "<分析内容>",
      "status": "conflict",
      "status_text": "与命盘存在差异",
      "resolution": "<取舍说明>"
    }
  ]
}
```

## 准确度管理

- 初始解读准确度约 65-75%（正常范围）
- 通过用户反馈校准问题后可达 85%+
- 诚实面对不确定性，不假装 100% 准确
- 如果推断与用户实际情况矛盾，承认偏差并调整

## 空宫处理

某宫位无主星时：
1. 说明"借对宫的力量"
2. 分析对宫主星特质
3. 空宫本身不是坏事，代表该领域更灵活
