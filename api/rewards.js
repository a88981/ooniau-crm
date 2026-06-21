const NOTION_TOKEN = process.env.NOTION_TOKEN;
const REWARDS_DB   = process.env.NOTION_REWARDS_DB;
const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

function pageToReward(p) {
  const pr = p.properties;
  return {
    id:         p.id,
    memberId:   pr['會員']?.relation?.[0]?.id || '',
    type:       pr['獎勵類型']?.select?.name   || '',
    milestone:  pr['里程碑']?.select?.name     || '',
    rewardItem: pr['兌換內容']?.select?.name   || '',
    illustration: pr['指定插圖']?.rich_text?.[0]?.plain_text || '',
    redeemed:   pr['已兌換']?.checkbox         || false,
    redeemedAt: pr['兌換日期']?.date?.start    || '',
    triggerDate:pr['觸發日期']?.date?.start    || '',
    note:       pr['備註']?.rich_text?.[0]?.plain_text || '',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const { memberId } = req.query;
      const filter = memberId
        ? { filter: { property:'會員', relation:{ contains: memberId } } }
        : {};
      const r = await fetch(`https://api.notion.com/v1/databases/${REWARDS_DB}/query`,
        { method:'POST', headers:h, body: JSON.stringify({ ...filter, page_size:100,
          sorts:[{ property:'觸發日期', direction:'ascending' }] }) });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(d.results.filter(p=>!p.archived).map(pageToReward));
    }
    if (req.method === 'POST') {
      const { memberId, type, milestone, rewardItem, illustration, triggerDate, note } = req.body;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method:'POST', headers:h,
        body: JSON.stringify({
          parent: { database_id: REWARDS_DB },
          properties: {
            '會員':     { relation:  [{ id: memberId }] },
            '獎勵類型': { select:    { name: type } },
            '里程碑':   { select:    { name: milestone } },
            '兌換內容': { select:    { name: rewardItem||'' } },
            '指定插圖': { rich_text: [{ text:{ content: illustration||'' } }] },
            '已兌換':   { checkbox:  false },
            '觸發日期': { date:      { start: triggerDate } },
            '備註':     { rich_text: [{ text:{ content: note||'' } }] },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToReward(d));
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { redeemed, redeemedAt, rewardItem, illustration, note } = req.body;
      const props = {};
      if (redeemed    !== undefined) props['已兌換']   = { checkbox: redeemed };
      if (redeemedAt  !== undefined) props['兌換日期'] = { date: redeemedAt ? { start: redeemedAt } : null };
      if (rewardItem  !== undefined) props['兌換內容'] = { select: { name: rewardItem } };
      if (illustration !== undefined) props['指定插圖'] = { rich_text: [{ text:{ content: illustration } }] };
      if (note        !== undefined) props['備註']     = { rich_text: [{ text:{ content: note } }] };
      const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method:'PATCH', headers:h, body: JSON.stringify({ properties: props }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToReward(d));
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method:'PATCH', headers:h, body: JSON.stringify({ archived: true }),
      });
      const d = await r.json(); 
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
