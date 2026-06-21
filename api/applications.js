const NOTION_TOKEN = process.env.NOTION_TOKEN;
const APPLICATIONS_DB = process.env.NOTION_APPLICATIONS_DB;
const MEMBERS_DB = process.env.NOTION_MEMBERS_DB;
const PAYMENTS_DB = process.env.NOTION_PAYMENTS_DB;

const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

function pageToApp(p) {
  const pr = p.properties;
  return {
    id: p.id,
    name:        pr['姓名']?.title?.[0]?.plain_text || '',
    memberName:  pr['YouTube會員名稱']?.rich_text?.[0]?.plain_text || '',
    phone:       pr['電話']?.phone_number || '',
    email:       pr['Email']?.email || '',
    bday:        pr['生日']?.date?.start || '',
    level:       pr['會員等級']?.select?.name || '',
    plan:        pr['方案類型']?.select?.name || '',
    reason:      pr['訂閱原因']?.rich_text?.[0]?.plain_text || '',
    joinDate:    pr['加入日期']?.date?.start || '',
    shipType:    pr['收件方式']?.select?.name || '',
    address:     pr['宅配地址']?.rich_text?.[0]?.plain_text || '',
    convenience: pr['超商門市']?.rich_text?.[0]?.plain_text || '',
    screenshot:  pr['截圖網址']?.url || '',
    status:      pr['狀態']?.select?.name || '待審核',
    createdAt:   p.created_time || '',
  };
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET：取得所有申請
    if (req.method === 'GET') {
      const { status } = req.query;
      const filter = status ? {
        filter: { property: '狀態', select: { equals: status } }
      } : {};
      const r = await fetch(`https://api.notion.com/v1/databases/${APPLICATIONS_DB}/query`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ ...filter, page_size: 100, sorts: [{ property: '加入日期', direction: 'descending' }] }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(d.results.filter(p => !p.archived).map(pageToApp));
    }

    // POST：新增申請
    if (req.method === 'POST') {
      const { name, memberName, phone, email, bday, level, plan, reason, joinDate, shipType, address, convenience, screenshot } = req.body;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST', headers: h,
        body: JSON.stringify({
          parent: { database_id: APPLICATIONS_DB },
          properties: {
            '姓名':          { title:      [{ text: { content: name } }] },
            'YouTube會員名稱': { rich_text: [{ text: { content: memberName || '' } }] },
            '電話':          { phone_number: phone || null },
            'Email':         { email: email || null },
            '生日':          { date: bday ? { start: bday } : null },
            '會員等級':      { select: { name: level } },
            '方案類型':      { select: { name: plan } },
            '訂閱原因':      { rich_text: [{ text: { content: reason || '' } }] },
            '加入日期':      { date: joinDate ? { start: joinDate } : null },
            '收件方式':      shipType ? { select: { name: shipType } } : { select: null },
            '宅配地址':      { rich_text: [{ text: { content: address || '' } }] },
            '超商門市':      { rich_text: [{ text: { content: convenience || '' } }] },
            '截圖網址':      { url: screenshot || null },
            '狀態':          { select: { name: '待審核' } },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: d });
      return res.status(200).json(pageToApp(d));
    }

    // PATCH：審核（核准或拒絕）
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { action } = req.body;

      if (action === 'reject') {
        const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
          method: 'PATCH', headers: h,
          body: JSON.stringify({ properties: { '狀態': { select: { name: '已拒絕' } } } }),
        });
        const d = await r.json();
        if (!r.ok) return res.status(502).json({ error: d });
        return res.status(200).json({ ok: true });
      }

      if (action === 'approve') {
        // 1. 取得申請資料
        const appR = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers: h });
        const appD = await appR.json();
        if (!appR.ok) return res.status(502).json({ error: appD });
        const app = pageToApp(appD);

        // 2. 計算到期日
        const expDate = app.plan === '單月' ? addMonths(app.joinDate, 1) : addMonths(app.joinDate, 12);

        // 3. 比對 YouTube 名稱找現有會員
        const searchR = await fetch(`https://api.notion.com/v1/databases/${MEMBERS_DB}/query`, {
          method: 'POST', headers: h,
          body: JSON.stringify({
            filter: { property: 'YouTube會員名稱', rich_text: { equals: app.memberName } },
            page_size: 1,
          }),
        });
        const searchD = await searchR.json();
        let memberId;

        if (searchD.results && searchD.results.length > 0) {
          // 找到舊會員 → 更新到期日
          memberId = searchD.results[0].id;
          await fetch(`https://api.notion.com/v1/pages/${memberId}`, {
            method: 'PATCH', headers: h,
            body: JSON.stringify({
              properties: {
                '會員到期日': { date: { start: expDate } },
                '方案類型':   { select: { name: app.plan } },
              },
            }),
          });
        } else {
          // 找不到 → 新增會員
          const newMemberR = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST', headers: h,
            body: JSON.stringify({
              parent: { database_id: MEMBERS_DB },
              properties: {
                '姓名':           { title:      [{ text: { content: app.name } }] },
                'YouTube會員名稱': { rich_text: [{ text: { content: app.memberName || '' } }] },
                '電話':           { phone_number: app.phone || null },
                'Email':          { email: app.email || null },
                '生日':           { date: app.bday ? { start: app.bday } : null },
                '會員等級':       { select: { name: app.level } },
                '方案類型':       { select: { name: app.plan } },
                '加入日期':       { date: { start: app.joinDate } },
                '會員到期日':     { date: { start: expDate } },
                ...(app.shipType ? { '收件方式': { select: { name: app.shipType } } } : {}),
                '宅配地址':       { rich_text: [{ text: { content: app.address || '' } }] },
                '超商門市':       { rich_text: [{ text: { content: app.convenience || '' } }] },
              },
            }),
          });
          const newMemberD = await newMemberR.json();
          if (!newMemberR.ok) return res.status(502).json({ error: newMemberD });
          memberId = newMemberD.id;
        }

        // 4. 新增繳費記錄
        const prices = { 'LV.3 里民暖暖包': app.plan === '單月' ? 520 : 520, 'LV.4 肌肉暖暖包': app.plan === '單月' ? 1450 : 1450, 'LV.5 真蒸暖暖包': app.plan === '單月' ? 3000 : 3000 };
        await fetch('https://api.notion.com/v1/pages', {
          method: 'POST', headers: h,
          body: JSON.stringify({
            parent: { database_id: PAYMENTS_DB },
            properties: {
              '繳費日期': { title: [{ text: { content: app.joinDate } }] },
              '會員':     { relation: [{ id: memberId }] },
              '金額':     { number: prices[app.level] || 0 },
              '備註':     { rich_text: [{ text: { content: `${app.plan} 方案` } }] },
            },
          }),
        });

        // 5. 更新申請狀態為已核准
        await fetch(`https://api.notion.com/v1/pages/${id}`, {
          method: 'PATCH', headers: h,
          body: JSON.stringify({ properties: { '狀態': { select: { name: '已核准' } } } }),
        });

        return res.status(200).json({ ok: true, memberId });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
