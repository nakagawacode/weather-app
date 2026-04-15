"use client";

import { useState } from "react";

const cities = {
  tokyo: { name: "東京", lat: 35.6812, lon: 139.7671 },
  osaka: { name: "大阪", lat: 34.6937, lon: 135.5023 },
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return "☀️ 晴れ";
  if (code <= 3) return "🌤️ くもり";
  if (code <= 48) return "🌫️ 霧";
  if (code <= 67) return "🌧️ 雨";
  return "🤔 不明";
};

export default function Home() {
  const [weather, setWeather] = useState<any>(null);
  const [cityKey, setCityKey] = useState<keyof typeof cities>("tokyo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);

  const getWeather = async (key: keyof typeof cities) => {
    setLoading(true);
    setError(null);
    setComment(null);

    try {
      const city = cities[key];

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`
      );

      const data = await res.json();

      if (!data.current_weather) {
        throw new Error("天気データが取得できません");
      }

      setWeather(data.current_weather);
      setCityKey(key);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getComment = async () => {
    if (!weather) return;

    const res = await fetch("/api/comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        temperature: weather.temperature,
        weather: weather.weathercode,
      }),
    });

    const data = await res.json();
    setComment(data.message);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 to-indigo-200 flex flex-col items-center p-6">

      {/* タイトル */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        🌤️ Weather Dashboard🐇
      </h1>

      {/* 都市ボタン */}
      <div className="flex gap-3 mb-6">
        {Object.keys(cities).map((key) => (
          <button
            key={key}
            onClick={() => getWeather(key as keyof typeof cities)}
            className={`px-5 py-2 rounded-full shadow transition
              ${cityKey === key ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}
            `}
          >
            {cities[key as keyof typeof cities].name}
          </button>
        ))}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="mt-6 flex flex-col items-center text-gray-600">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 animate-pulse">天気を取得中...</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="text-red-500 bg-white px-4 py-2 rounded-lg shadow">
          ⚠️ {error}
        </div>
      )}

      {/* 天気カード */}
      {weather && !loading && (
        <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-8 w-80 text-center mt-6 transform transition hover:scale-105">

          <h2 className="text-xl font-semibold text-gray-700">
            {cities[cityKey].name}
          </h2>

          <div className="text-6xl font-bold mt-3 text-gray-800">
            {weather.temperature}°
          </div>

          <div className="text-lg mt-2 text-gray-600">
            {getWeatherLabel(weather.weathercode)}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            💨 風速: {weather.windspeed} m/s
          </div>

          {/* AIボタン */}
          <button
            onClick={getComment}
            disabled={!weather}
            className={`mt-5 px-5 py-2 rounded-full shadow transition
              ${weather ? "bg-pink-500 text-white hover:scale-105 active:scale-95" : "bg-gray-300 text-gray-500"}
            `}
          >
            🐰 天気アドバイス生成
          </button>
        </div>
      )}

      {/* AI吹き出し */}
      {comment && (
        <div className="mt-6 flex justify-center">
          <div className="relative bg-white shadow-lg rounded-2xl px-5 py-4 max-w-xs text-gray-700">

            {/* 吹き出しのしっぽ */}
            <div className="absolute -top-2 left-6 w-4 h-4 bg-white rotate-45 shadow" />

            <p className="text-sm leading-relaxed">
              🐰 {comment}
            </p>
          </div>
        </div>
      )}

      {/* 初期状態 */}
      {!weather && !loading && (
        <p className="text-gray-600 mt-10">
          都市を選ぶと天気が表示されます ☝️
        </p>
      )}

    </main>
  );
}