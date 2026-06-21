const NOTION_TOKEN = process.env.NOTION_TOKEN;
const MEMBERS_DB   = process.env.NOTION_MEMBERS_DB;

const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

function pageToMember(p) {
  const pr = p.properties;
  const txt  = k => pr[k]?.rich_text?.[0]?.plain_text || '';
  const ttl  = k => pr[k]?.title?.[0]?.plain_text    || '';
  const sel  = k => pr[k]?.select?.name              || '';
  const dt   = k => pr[k]?.date?.start               || '';
  const ph   = k => pr[k]?.phone_number              || '';
  const em   = k => pr[k]?.email                     || '';
  return {
    id: p.id,
    name:        ttl('姓名'),
    memberName:  txt('YouTube會員名稱'),
    phone:       ph('電話'),
    email:       em('Email'),
    bday:        dt('生日'),
    level:       sel('會員等級'),
    plan:        sel('方案類型'),
    join:        dt('加入日期'),
    exp:         dt('會員到期日'),
    address:     txt('地址'),
    note:        txt('備註'),
    orderNos:    txt('訂單編號'), // 逗號分隔多筆
  };
}

function memberToProps(m) {
  const props = {};
  if (m.name        !== undefined) props['姓名']           = { title:        [{ text: { content: m.name } }] };
  if (m.memberName  !== undefined) props['YouTube會員名稱'] = { rich_text:   [{ text: { content: m.memberName } }] };
  if (m.phone       !== undefined) props['電話']           = { phone_number: m.phone };
  if (m.email       !== undefined) props['Email']          = { email:        m.email || null };
  if (m.bday        !== undefined) props['生日']           = { date:         m.bday   ? { start: m.bday  } : null };
  if (m.level       !== undefined) props['會員等級']       = m.level ? { select: { name: m.level } } : { select: null };
  if (m.plan        !== undefined) props['方案類型']       = m.plan ? { select: { name: m.plan } } : { select: null };
  if (m.join        !== undefined) props['加入日期']       = { date:         m.join   ? { start: m.join  } : null };
  if (m.exp         !== undefined) props['會員到期日']     = { date:         m.exp    ? { start: m.exp   } : null };
  if (m.address     !== undefined) props['地址']       = { rich_text:   [{ text: { content: m.address } }] };
  if (m.note        !== undefined) props['備註']           = { rich_text:   [{ text: { content: m.note } }] };
  if (m.orderNos    !== undefined) props['訂單編號']       = { rich_text:   [{ text: { content: m.orderNos } }] };
  return props;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://api.notion.com/v1/databases/${MEMBERS_DB}/query`,
        { method:'POST', headers:h, body: JSON.stringify({ page_size:100 }) });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(d.results.filter(p=>!p.archived).map(pageToMember));
    }
    if (req.method === 'POST') {
      const r = await fetch('https://api.notion.com/v1/pages', {
        method:'POST', headers:h,
        body: JSON.stringify({ parent:{ database_id: MEMBERS_DB }, properties: memberToProps(req.body) }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToMember(d));
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method:'PATCH', headers:h, body: JSON.stringify({ properties: memberToProps(req.body) }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToMember(d));
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
