// api/member-query.js
// 用訂單編號查詢會員獎勵（公開 API，不需要 auth）

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const MEMBERS_DB   = process.env.NOTION_MEMBERS_DB;
const REWARDS_DB   = process.env.NOTION_REWARDS_DB;

const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { orderNo } = req.query;
  if (!orderNo) return res.status(400).json({ error: '請提供訂單編號' });

  try {
    // 1. 用訂單編號查會員
    const mRes = await fetch(`https://api.notion.com/v1/databases/${MEMBERS_DB}/query`, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        filter: { property: '訂單編號', rich_text: { equals: orderNo.trim() } },
        page_size: 1,
      }),
    });
    const mData = await mRes.json();
    if (!mRes.ok) return res.status(502).json({ error: mData });

    const pages = mData.results.filter(p => !p.archived);
    if (!pages.length) return res.status(404).json({ error: '找不到此訂單編號的會員' });

    const p = pages[0];
    const pr = p.properties;
    const member = {
      id:         p.id,
      name:       pr['姓名']?.title?.[0]?.plain_text || '',
      level:      pr['會員等級']?.select?.name || '',
      plan:       pr['方案類型']?.select?.name || '',
      join:       pr['加入日期']?.date?.start || '',
      exp:        pr['會員到期日']?.date?.start || '',
    };

    // 2. 查該會員的獎勵
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
