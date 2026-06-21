# Ooniau 暖暖｜綠界會員管理 v2

## 專案結構
```
ooniau-crm-v2/
├── api/
│   ├── members.js    ← 會員 CRUD
│   ├── payments.js   ← 繳費記錄 CRUD
│   ├── rewards.js    ← 獎勵記錄 CRUD
│   ├── holidays.js   ← 節日 CRUD
│   └── setup.js      ← 一次性建立四張 Notion 資料庫
├── public/
│   └── index.html    ← 前端
└── vercel.json
```

## 部署步驟

### 1. 取得 Notion Token
前往 https://www.notion.so/my-integrations → New integration → 複製 token（`secret_xxx`）

### 2. 推上 GitHub + Vercel
- 新建 GitHub repo，上傳這個資料夾
- Vercel import → Framework: Other

### 3. 設定環境變數（先只填這一個）
| 名稱 | 值 |
|------|-----|
| `NOTION_TOKEN` | `secret_xxx...` |

Deploy 後先不急填其他的。

### 4. 在 Notion 新建頁面
- 新建空白 Page，例如「Ooniau CRM」
- 右上角 Share → Invite → 搜尋你的 integration → Editor 權限
- 從網址取得 Page ID（最後32碼）

### 5. 呼叫 setup 建立四張資料庫
```bash
curl -X POST https://你的網址.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"pageId": "你的PageID"}'
```

回傳：
```json
{
  "NOTION_MEMBERS_DB":  "xxx",
  "NOTION_PAYMENTS_DB": "xxx",
  "NOTION_REWARDS_DB":  "xxx",
  "NOTION_HOLIDAYS_DB": "xxx"
}
```

### 6. 填入剩下四個環境變數 → Redeploy

完成！

---

## 功能說明

### 會員等級
- LV.3 里民暖暖包 $520
- LV.4 肌肉暖暖包 $1450
- LV.5 真蒸暖暖包 $3000

### 獎勵邏輯
- 每滿3個月自動產生一筆訂閱獎勵（點「同步獎勵」產生）
- 每滿12個月額外產生週邊獎勵
- LV.3：相印小卡 or 半小時占卜
- LV.4：實體拍立得（填指定插圖）
- LV.5：親簽拍立得（填指定插圖）

### CSV 匯出
會員列表頁右上角「匯出 CSV」，包含所有欄位。
