import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// APIキーは環境変数
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY が環境変数に設定されていません");
}

app.post("/api/analyze", async (req, res) => {
  const { age, gender, prescription } = req.body;

  if (!age || !gender || !prescription) {
    return res.status(400).json({ error: "入力が不足しています" });
  }

const prompt = `
あなたは日本の保険薬局で勤務する経験豊富な薬剤師であり、
高齢者薬物療法・ポリファーマシー対策の専門家です。

以下の患者情報および処方内容について、
「高齢者の安全な薬物療法ガイドライン2015」、
日本老年医学会、日本高血圧学会、日本糖尿病学会などの
国内ガイドラインおよび一般的な薬学的知見に基づき評価してください。

【重要な前提】
・本評価は薬局での服薬指導・処方監査・疑義照会検討を目的とします
・明らかな問題がない場合でも、高齢者特有の注意点を必ず1点以上挙げてください
・表現は薬剤師が医師に相談・提案しやすい内容としてください
・過度に断定的な表現は避けてください

【患者情報】
年齢: ${age}歳
性別: ${gender}

【処方内容】
${prescription}

以下の形式で **JSONのみ** を出力してください（説明文・マークダウン禁止）：

{
  "overall_assessment": "処方全体の評価（薬局視点、3〜4文）",
  "medication_count": "処方薬剤数（○剤）",
  "risk_level": "低リスク/中リスク/高リスク",
  "issues": [
    {
      "medication": "該当薬剤名",
      "issue": "薬学的に注意すべき点",
      "recommendation": "薬剤師として考えられる対応・提案",
      "evidence": "国内ガイドラインや一般的根拠の要約",
      "reference_url": "参考URL（存在する場合）"
    }
  ],
  "positive_points": [
    "適切と評価できる点"
  ],
  "overall_recommendations": [
    "服薬指導や継続的フォローに関する総合的提案"
  ]
}
`;


  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (err) {
    console.error("API Error:", err.message);
    res.status(500).json({ error: "解析に失敗しました" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
