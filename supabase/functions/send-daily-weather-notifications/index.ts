import { createClient } from "npm:@supabase/supabase-js@2.105.3";
import webpush from "npm:web-push@3.6.7";

type WeatherPushSubscription = {
  id: string;
  room: string;
  subscription: webpush.PushSubscription;
};

type Prefecture = {
  name: string;
  lat: number;
  lon: number;
};

type CurrentWeather = {
  temperature: number;
  weathercode: number;
  windspeed: number;
  precipitationProbability: number | null;
};

const prefectures: Prefecture[] = [
  { name: "北海道", lat: 43.06417, lon: 141.34694 },
  { name: "青森", lat: 40.82444, lon: 140.74 },
  { name: "岩手", lat: 39.70361, lon: 141.1525 },
  { name: "宮城", lat: 38.26889, lon: 140.87194 },
  { name: "秋田", lat: 39.71861, lon: 140.1025 },
  { name: "山形", lat: 38.24056, lon: 140.36333 },
  { name: "福島", lat: 37.75, lon: 140.46778 },
  { name: "東京", lat: 35.6812, lon: 139.7671 },
  { name: "神奈川", lat: 35.44778, lon: 139.6425 },
  { name: "埼玉", lat: 35.85694, lon: 139.64889 },
  { name: "千葉", lat: 35.60472, lon: 140.12333 },
  { name: "新潟", lat: 37.90222, lon: 139.02361 },
  { name: "富山", lat: 36.69528, lon: 137.21139 },
  { name: "石川", lat: 36.59444, lon: 136.62556 },
  { name: "福井", lat: 36.06528, lon: 136.22194 },
  { name: "山梨", lat: 35.66389, lon: 138.56833 },
  { name: "長野", lat: 36.65139, lon: 138.18111 },
  { name: "岐阜", lat: 35.39111, lon: 136.72222 },
  { name: "静岡", lat: 34.97694, lon: 138.38306 },
  { name: "愛知", lat: 35.18028, lon: 136.90667 },
  { name: "大阪", lat: 34.6937, lon: 135.5023 },
  { name: "京都", lat: 35.01164, lon: 135.7681 },
  { name: "兵庫", lat: 34.69139, lon: 135.18306 },
  { name: "奈良", lat: 34.68528, lon: 135.83278 },
  { name: "滋賀", lat: 35.00444, lon: 135.86833 },
  { name: "和歌山", lat: 34.22611, lon: 135.1675 },
  { name: "鳥取", lat: 35.50361, lon: 134.23833 },
  { name: "島根", lat: 35.47222, lon: 133.05056 },
  { name: "岡山", lat: 34.66167, lon: 133.935 },
  { name: "広島", lat: 34.39639, lon: 132.45944 },
  { name: "山口", lat: 34.18583, lon: 131.47139 },
  { name: "徳島", lat: 34.06583, lon: 134.55944 },
  { name: "香川", lat: 34.34028, lon: 134.04333 },
  { name: "愛媛", lat: 33.84167, lon: 132.76611 },
  { name: "高知", lat: 33.55972, lon: 133.53111 },
  { name: "福岡", lat: 33.60639, lon: 130.41806 },
  { name: "佐賀", lat: 33.24944, lon: 130.29889 },
  { name: "長崎", lat: 32.74472, lon: 129.87361 },
  { name: "熊本", lat: 32.78972, lon: 130.74167 },
  { name: "大分", lat: 33.23806, lon: 131.6125 },
  { name: "宮崎", lat: 31.91111, lon: 131.42389 },
  { name: "鹿児島", lat: 31.56028, lon: 130.55806 },
  { name: "沖縄", lat: 26.2125, lon: 127.68111 },
];

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getWeatherLabel = (code: number) => {
  if (code === 0) return "晴れ";
  if (code <= 3) return "くもり";
  if (code <= 48) return "霧";
  if (code <= 67) return "雨";
  return "不明";
};

const fetchWeather = async (prefecture: Prefecture): Promise<CurrentWeather> => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${prefecture.lat}&longitude=${prefecture.lon}&current_weather=true&daily=precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=1`
  );
  const data = await response.json();

  if (!data.current_weather) {
    throw new Error(`${prefecture.name}の天気データが取得できません`);
  }

  return {
    ...data.current_weather,
    precipitationProbability:
      data.daily?.precipitation_probability_max?.[0] ?? null,
  } as CurrentWeather;
};

const generateAdvice = async (weather: CurrentWeather) => {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    return "外出前に空模様を確認して、服装を調整しましょう。";
  }

  const prompt = `
あなたは天気アドバイザーです。

以下の情報から日本語で短いアドバイスを1文作ってください。

気温: ${weather.temperature}℃
天気コード: ${weather.weathercode}
風速: ${weather.windspeed}m/s
今日の最大降水確率: ${
    weather.precipitationProbability === null
      ? "不明"
      : `${weather.precipitationProbability}%`
  }

・短く
・わかりやすく
・外出のアドバイスを含める
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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

  const data = await response.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
    "外出前に空模様を確認して、服装を調整しましょう。"
  );
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  const notificationSecret = Deno.env.get("NOTIFICATION_SECRET");
  if (
    notificationSecret &&
    request.headers.get("x-notification-secret") !== notificationSecret
  ) {
    return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:weather@example.com";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse(
      { ok: false, message: "Notification environment variables are not set." },
      500
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabaseAdmin
    .from("weather_push_subscriptions")
    .select("id, room, subscription")
    .eq("enabled", true)
    .limit(5000);

  if (error) {
    return jsonResponse({ ok: false, message: error.message }, 500);
  }

  const subscriptions = (data ?? []) as WeatherPushSubscription[];
  const subscriptionsByRoom = new Map<string, WeatherPushSubscription[]>();

  for (const subscription of subscriptions) {
    const roomSubscriptions = subscriptionsByRoom.get(subscription.room) ?? [];
    roomSubscriptions.push(subscription);
    subscriptionsByRoom.set(subscription.room, roomSubscriptions);
  }

  let sent = 0;
  let failed = 0;
  const disabledSubscriptionIds: string[] = [];

  for (const [room, roomSubscriptions] of subscriptionsByRoom) {
    const prefecture = prefectures.find((item) => item.name === room);
    if (!prefecture) continue;

    const weather = await fetchWeather(prefecture);
    const advice = await generateAdvice(weather);
    const payload = JSON.stringify({
      title: `${room}の朝の天気`,
      body: `${getWeatherLabel(weather.weathercode)} / ${Math.round(
        weather.temperature
      )}℃ / 降水確率${
        weather.precipitationProbability === null
          ? "不明"
          : `${weather.precipitationProbability}%`
      }。${advice}`,
      url: "/",
    });

    const results = await Promise.allSettled(
      roomSubscriptions.map((item) =>
        webpush.sendNotification(item.subscription, payload)
      )
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }

      failed += 1;
      const reason = result.reason as { statusCode?: number };
      if (reason.statusCode === 404 || reason.statusCode === 410) {
        disabledSubscriptionIds.push(roomSubscriptions[index].id);
      }
    });
  }

  if (disabledSubscriptionIds.length > 0) {
    await supabaseAdmin
      .from("weather_push_subscriptions")
      .update({ enabled: false })
      .in("id", disabledSubscriptionIds);
  }

  return jsonResponse({
    ok: true,
    subscriptions: subscriptions.length,
    sent,
    failed,
    disabled: disabledSubscriptionIds.length,
  });
});
