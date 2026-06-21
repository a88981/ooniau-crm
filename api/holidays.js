// 節日資料直接內建，不需要 Notion 資料庫
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const holidays = [
    { id: 'h1',  name: '元旦',     date: '2026-01-01', type: '傳統節日', note: '新年第一讀' },
    { id: 'h2',  name: '情人節',   date: '2026-02-14', type: '西洋節日', note: '情人節限定活動' },
    { id: 'h3',  name: '母親節',   date: '2026-05-10', type: '西洋節日', note: '母親節限定優惠' },
    { id: 'h4',  name: '端午節',   date: '2026-06-19', type: '傳統節日', note: '記得寄祝福訊息' },
    { id: 'h5',  name: '七夕情人節', date: '2026-08-08', type: '傳統節日', note: '推薦主題占卜活動' },
    { id: 'h6',  name: '中秋節',   date: '2026-09-25', type: '傳統節日', note: '中秋限定優惠' },
    { id: 'h7',  name: '聖誕節',   date: '2026-12-25', type: '西洋節日', note: '聖誕特別版牌陣' },
    { id: 'h8',  name: '元旦',     date: '2027-01-01', type: '傳統節日', note: '新年第一讀' },
    { id: 'h9',  name: '情人節',   date: '2027-02-14', type: '西洋節日', note: '情人節限定活動' },
  ];

  return res.status(200).json(holidays);
}
