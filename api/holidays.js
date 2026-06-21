module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const holidays = [
    // 2026
    { id: '2026-01', name: '元旦',       date: '2026-01-01', type: '國定假日', note: '新年第一讀' },
    { id: '2026-02', name: '春節除夕',   date: '2026-02-16', type: '傳統節日', note: '除夕快樂' },
    { id: '2026-03', name: '春節',       date: '2026-02-17', type: '傳統節日', note: '新年快樂' },
    { id: '2026-04', name: '情人節',     date: '2026-02-14', type: '西洋節日', note: '情人節限定活動' },
    { id: '2026-05', name: '元宵節',     date: '2026-03-04', type: '傳統節日', note: '湯圓與燈謎' },
    { id: '2026-06', name: '婦女節',     date: '2026-03-08', type: '節慶',     note: '女神們的節日' },
    { id: '2026-07', name: '兒童節',     date: '2026-04-04', type: '國定假日', note: '兒童節快樂' },
    { id: '2026-08', name: '清明節',     date: '2026-04-05', type: '國定假日', note: '清明時節' },
    { id: '2026-09', name: '母親節',     date: '2026-05-10', type: '節慶',     note: '母親節限定優惠' },
    { id: '2026-10', name: '端午節',     date: '2026-06-19', type: '國定假日', note: '記得寄祝福訊息' },
    { id: '2026-11', name: '父親節',     date: '2026-08-08', type: '節慶',     note: '父親節快樂' },
    { id: '2026-12', name: '七夕情人節', date: '2026-08-08', type: '傳統節日', note: '推薦主題占卜活動' },
    { id: '2026-13', name: '中元節',     date: '2026-08-29', type: '傳統節日', note: '中元普渡' },
    { id: '2026-14', name: '教師節',     date: '2026-09-28', type: '節慶',     note: '感謝老師' },
    { id: '2026-15', name: '中秋節',     date: '2026-09-25', type: '國定假日', note: '中秋限定優惠' },
    { id: '2026-16', name: '重陽節',     date: '2026-10-17', type: '傳統節日', note: '敬老尊賢' },
    { id: '2026-17', name: '國慶日',     date: '2026-10-10', type: '國定假日', note: '雙十國慶' },
    { id: '2026-18', name: '萬聖節',     date: '2026-10-31', type: '西洋節日', note: '萬聖節限定活動' },
    { id: '2026-19', name: '聖誕節',     date: '2026-12-25', type: '西洋節日', note: '聖誕特別版牌陣' },
    { id: '2026-20', name: '跨年夜',     date: '2026-12-31', type: '節慶',     note: '跨年倒數' },
    // 2027
    { id: '2027-01', name: '元旦',       date: '2027-01-01', type: '國定假日', note: '新年第一讀' },
    { id: '2027-02', name: '情人節',     date: '2027-02-14', type: '西洋節日', note: '情人節限定活動' },
    { id: '2027-03', name: '婦女節',     date: '2027-03-08', type: '節慶',     note: '女神們的節日' },
    { id: '2027-04', name: '兒童節',     date: '2027-04-04', type: '國定假日', note: '兒童節快樂' },
    { id: '2027-05', name: '母親節',     date: '2027-05-09', type: '節慶',     note: '母親節限定優惠' },
    { id: '2027-06', name: '端午節',     date: '2027-06-09', type: '國定假日', note: '記得寄祝福訊息' },
    { id: '2027-07', name: '父親節',     date: '2027-08-08', type: '節慶',     note: '父親節快樂' },
    { id: '2027-08', name: '七夕情人節', date: '2027-07-28', type: '傳統節日', note: '推薦主題占卜活動' },
    { id: '2027-09', name: '中秋節',     date: '2027-09-15', type: '國定假日', note: '中秋限定優惠' },
    { id: '2027-10', name: '教師節',     date: '2027-09-28', type: '節慶',     note: '感謝老師' },
    { id: '2027-11', name: '國慶日',     date: '2027-10-10', type: '國定假日', note: '雙十國慶' },
    { id: '2027-12', name: '萬聖節',     date: '2027-10-31', type: '西洋節日', note: '萬聖節限定活動' },
    { id: '2027-13', name: '聖誕節',     date: '2027-12-25', type: '西洋節日', note: '聖誕特別版牌陣' },
    { id: '2027-14', name: '跨年夜',     date: '2027-12-31', type: '節慶',     note: '跨年倒數' },
    // 暖暖品牌
    { id: 'oo-01', name: '暖暖生日 🎂',   date: '2026-08-22', type: '品牌活動', note: '暖暖生日快樂！' },
    { id: 'oo-02', name: '頻道週年 🎉',   date: '2026-12-26', type: '品牌活動', note: '頻道成立週年紀念' },
    { id: 'oo-03', name: '暖暖生日 🎂',   date: '2027-08-22', type: '品牌活動', note: '暖暖生日快樂！' },
    { id: 'oo-04', name: '頻道週年 🎉',   date: '2027-12-26', type: '品牌活動', note: '頻道成立週年紀念' },
  ];

  return res.status(200).json(holidays);
}
