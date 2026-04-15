"use client";

import { useState } from "react";
import { prefectures } from "@/data/prefectures";
import { fetchWeather } from "@/lib/weather";
import { fetchComment } from "@/lib/comment";

const getWeatherLabel = (code: number) => {
  if (code === 0) return "☀️ 晴れ";
  if (code <= 3) return "🌤️ くもり";
  if (code <= 48) return "🌫️ 霧";
  if (code <= 67) return "🌧️ 雨";
  return "🤔 不明";
};

export default function Home() {
  const [weather, setWeather] = useState<any>(null);
  const [city, setCity] = useState(prefectures[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const getWeather = async (p: any) => {
    setLoading(true);
    setError(null);
    setComment(null);

    try {
      const weatherData = await fetchWeather(p.lat, p.lon);
      setWeather(weatherData);
      setCity(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLocationWeather = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        getWeatherByLocation(lat, lon);
      },
      (err) => {
        console.error(err);
        alert("位置情報の取得に失敗しました");
      }
    );
  };

  const getWeatherByLocation = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );

      const data = await res.json();

      if (!data.current_weather) {
        throw new Error("天気データが取得できません");
      }

      setWeather(data.current_weather);
      setCity({ name: "現在地", lat, lon });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getComment = async () => {
    if (!weather) return;

    setAiLoading(true);

    try {
      const data = await fetchComment({
        temperature: weather.temperature,
        weather: weather.weathercode,
      });
      console.log("COMMENT RAW:", data);
      setComment(data.message);
    } catch (e) {
      setComment("AIの取得に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 to-indigo-200 flex flex-col items-center p-6">

      {/* タイトル */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        🌤️ Weather Dashboard
      </h1>

      {/* 都市ボタン */}
      <div className="flex gap-3 mb-6 items-center">
        
        {/* ドロップダウン */}
        <select
          value={city.name}
          onChange={(e) => {
            const selected = prefectures.find(p => p.name === e.target.value);
            if (selected) getWeather(selected);
          }}
          className="px-4 py-2 rounded-lg shadow bg-white"
        >
          <option value="" disabled>
            都道府県を選択
          </option>

          {prefectures.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 現在地ボタン */}
        <button
          onClick={getLocationWeather}
          className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
        >
          📍 現在地
        </button>
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
            {city.name}
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

      {aiLoading && (
        <div className="mt-4 flex flex-col items-center text-gray-600">
          <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 animate-pulse">🐰 AIが考え中...</p>
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
          都市を選ぶと天気が表示されます
        </p>
      )}

    </main>
  );
}