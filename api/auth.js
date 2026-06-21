// api/auth.js
// 密碼存在 Vercel 環境變數 ADMIN_PASSWORD
// 在 Vercel Dashboard → Settings → Environment Variables 設定

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pwd } = req.body || {};
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    // 環境變數未設定時拒絕所有請求
    return res.status(500).json({ error: '伺服器未設定密碼' });
  }

  if (pwd && pwd === correct) {
    return res.status(200).json({ ok: true });
  }

  // 密碼錯誤：固定延遲 500ms 防暴力破解
  await new Promise(r => setTimeout(r, 500));
  return res.status(401).json({ error: '密碼錯誤' });
};
