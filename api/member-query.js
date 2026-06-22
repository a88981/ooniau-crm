// api/member-query.js
// 公開 API：用訂單編號或手機號碼查詢會員獎勵

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const MEMBERS_DB   = process.env.NOTION_MEMBERS_DB;
const REWARDS_DB   = process.env.NOTION_REWARDS_DB;

const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

// 拉出所有會員（最多 200 筆，分頁）
async function getAllMembers() {
  let results = [], cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await fetch(`https://api.notion.com/v1/databases/${MEMBERS_DB}/query`, {
      method: 'POST', headers: h, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d));
    results = results.concat(d.results.filter(p => !p.archived));
    cursor = d.has_more ? d.next_cursor : null;
  } while (cursor);
  return results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { orderNo, phone } = req.query;
  if (!orderNo && !phone) return res.status(400).json({ error: '請提供訂單編號或手機號碼' });

  try {
    // 拉所有會員，在後端比對
    const pages = await getAllMembers();

    let page = null;

    if (orderNo) {
      const target = orderNo.trim();
      page = pages.find(p => {
        const val = p.properties['訂單編號']?.rich_text?.[0]?.plain_text || '';
        // 逗號分隔，比對每一筆
        return val.split(',').map(s => s.trim()).includes(target);
      });
    } else if (phone) {
      const target = phone.trim().replace(/[-\s]/g, '');
      page = pages.find(p => {
        const val = (p.properties['電話']?.phone_number || '').replace(/[-\s]/g, '');
        return val === target;
      });
    }

    if (!page) {
      const msg = orderNo ? '找不到此訂單編號的會員' : '找不到此手機號碼的會員';
      return res.status(404).json({ error: msg });
    }

    const pr = page.properties;
    const member = {
      id:         page.id,
      name:       pr['姓名']?.title?.[0]?.plain_text || '',
      memberName: pr['YouTube會員名稱']?.rich_text?.[0]?.plain_text || '',
      level:      pr['會員等級']?.select?.name || '',
      plan:       pr['方案類型']?.select?.name || '',
      join:       pr['加入日期']?.date?.start || '',
      exp:        pr['會員到期日']?.date?.start || '',
      orderNos:   pr['訂單編號']?.rich_text?.[0]?.plain_text || '',
      address:    pr['地址']?.rich_text?.[0]?.plain_text || '',
      bday:       pr['生日']?.date?.start || '',
    };

    // 查獎勵
    const rRes = await fetch(`https://api.notion.com/v1/databases/${REWARDS_DB}/query`, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        filter: { property: '會員', relation: { contains: member.id } },
        page_size: 100,
        sorts: [{ property: '觸發日期', direction: 'ascending' }],
      }),
    });
    const rData = await rRes.json();
    if (!rRes.ok) return res.status(502).json({ error: rData });

    const rewards = rData.results.filter(r => !r.archived).map(r => {
      const rp = r.properties;
      return {
        id:          r.id,
        type:        rp['獎勵類型']?.select?.name || '',
        milestone:   rp['里程碑']?.select?.name || '',
        rewardItem:  rp['兌換內容']?.select?.name || '',
        redeemed:    rp['已兌換']?.checkbox || false,
        redeemedAt:  rp['兌換日期']?.date?.start || '',
        triggerDate: rp['觸發日期']?.date?.start || '',
        note:        rp['備註']?.rich_text?.[0]?.plain_text || '',
      };
    });

    return res.status(200).json({ member, rewards });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
