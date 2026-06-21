const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PAYMENTS_DB  = process.env.NOTION_PAYMENTS_DB;

const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

function pageToPayment(p) {
  const pr = p.properties;
  return {
    id:       p.id,
    memberId: pr['會員']?.relation?.[0]?.id || '',
    date:     pr['繳費日期']?.date?.start   || '',
    amount:   pr['金額']?.number            || 0,
    note:     pr['備註']?.rich_text?.[0]?.plain_text || '',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const { memberId } = req.query;
      const filter = memberId ? { filter: { property:'會員', relation:{ contains: memberId } } } : {};
      const r = await fetch(`https://api.notion.com/v1/databases/${PAYMENTS_DB}/query`,
        { method:'POST', headers:h, body: JSON.stringify({ ...filter, page_size:100, sorts:[{ property:'繳費日期', direction:'descending' }] }) });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(d.results.filter(p=>!p.archived).map(pageToPayment));
    }
    if (req.method === 'POST') {
      const { memberId, date, amount, note } = req.body;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method:'POST', headers:h,
        body: JSON.stringify({
          parent: { database_id: PAYMENTS_DB },
          properties: {
            '繳費日期': { date:     { start: date } },
            '金額':     { number:   Number(amount) },
            '備註':     { rich_text:[{ text:{ content: note||'' } }] },
            '會員':     { relation: [{ id: memberId }] },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToPayment(d));
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
