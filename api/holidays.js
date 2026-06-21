const NOTION_TOKEN = process.env.NOTION_TOKEN;
const HOLIDAYS_DB  = process.env.NOTION_HOLIDAYS_DB;
const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

function pageToHoliday(p) {
  const pr = p.properties;
  return {
    id:   p.id,
    name: pr['名稱']?.title?.[0]?.plain_text   || '',
    date: pr['日期']?.date?.start               || '',
    type: pr['類型']?.select?.name              || '',
    note: pr['備忘']?.rich_text?.[0]?.plain_text || '',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://api.notion.com/v1/databases/${HOLIDAYS_DB}/query`,
        { method:'POST', headers:h, body: JSON.stringify({ page_size:100 }) });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(d.results.filter(p=>!p.archived).map(pageToHoliday));
    }
    if (req.method === 'POST') {
      const { name, date, type, note } = req.body;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method:'POST', headers:h,
        body: JSON.stringify({
          parent: { database_id: HOLIDAYS_DB },
          properties: {
            '名稱': { title:     [{ text:{ content: name } }] },
            '日期': { date:      { start: date } },
            '類型': { select:    { name: type } },
            '備忘': { rich_text: [{ text:{ content: note||'' } }] },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToHoliday(d));
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
