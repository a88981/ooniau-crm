const NOTION_TOKEN = process.env.NOTION_TOKEN;
const h = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

async function createDB(pageId, title, properties) {
  const r = await fetch('https://api.notion.com/v1/databases', {
    method:'POST', headers:h,
    body: JSON.stringify({ parent:{ type:'page_id', page_id: pageId },
      title:[{ type:'text', text:{ content: title } }], properties }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d.id;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { pageId } = req.body;
  if (!pageId) return res.status(400).json({ error: 'Missing pageId' });
  try {
    const membersId = await createDB(pageId, 'Ooniau 暖暖｜會員資料', {
      '姓名':           { title: {} },
      'YouTube會員名稱': { rich_text: {} },
      '電話':           { phone_number: {} },
      'Email':          { email: {} },
      '生日':           { date: {} },
      '會員等級': { select: { options: [
        { name:'LV.3 里民暖暖包', color:'green'  },
        { name:'LV.4 肌肉暖暖包', color:'yellow' },
        { name:'LV.5 真蒸暖暖包', color:'purple' },
      ]}},
      '方案類型': { select: { options: [
        { name:'年繳', color:'purple' },
        { name:'單筆', color:'blue'   },
      ]}},
      '加入日期':   { date: {} },
      '會員到期日': { date: {} },
      '收件方式': { select: { options: [
        { name:'宅配',     color:'green'  },
        { name:'超商取貨', color:'orange' },
      ]}},
      '宅配地址': { rich_text: {} },
      '超商門市': { rich_text: {} },
      '備註':     { rich_text: {} },
    });

    const paymentsId = await createDB(pageId, 'Ooniau 暖暖｜繳費記錄', {
      '繳費日期': { title: {} },
      '會員':     { relation: { database_id: membersId, single_property: {} } },
      '金額':     { number: { format: 'number' } },
      '備註':     { rich_text: {} },
    });

    const rewardsId = await createDB(pageId, 'Ooniau 暖暖｜獎勵記錄', {
      '觸發日期': { title: {} },
      '會員':     { relation: { database_id: membersId, single_property: {} } },
      '獎勵類型': { select: { options: [
        { name:'3個月獎勵',  color:'green'  },
        { name:'12個月獎勵', color:'purple' },
      ]}},
      '里程碑': { select: { options: [
        { name:'3個月',  color:'gray'   },
        { name:'6個月',  color:'gray'   },
        { name:'9個月',  color:'gray'   },
        { name:'12個月', color:'blue'   },
        { name:'15個月', color:'gray'   },
        { name:'18個月', color:'gray'   },
        { name:'21個月', color:'gray'   },
        { name:'24個月', color:'purple' },
      ]}},
      '兌換內容': { select: { options: [
        { name:'相印小卡',   color:'blue'   },
        { name:'半小時占卜', color:'green'  },
        { name:'實體拍立得', color:'yellow' },
        { name:'親簽拍立得', color:'purple' },
        { name:'專屬週邊',   color:'red'    },
      ]}},
      '指定插圖': { rich_text: {} },
      '已兌換':   { checkbox: {} },
      '兌換日期': { date: {} },
      '備註':     { rich_text: {} },
    });

    return res.status(200).json({
      success: true,
      NOTION_MEMBERS_DB:  membersId,
      NOTION_PAYMENTS_DB: paymentsId,
      NOTION_REWARDS_DB:  rewardsId,
      message: '請把以上三個 ID 填入 Vercel 環境變數',
    });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
