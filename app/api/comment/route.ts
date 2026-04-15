import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { temperature, weather } = body;

  const prompt = `
あなたは天気アドバイザーです。

以下の情報から日本語で短いアドバイスを1文作ってください。

気温: ${temperature}℃
天気コード: ${weather}

・短く
・わかりやすく
・外出のアドバイスを含める
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  const message =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return NextResponse.json({
    message: message ?? "生成に失敗しました",
  });
}