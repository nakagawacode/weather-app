"use client";

import { useRef, useState } from "react";
import { AreaSelector } from "@/components/AreaSelector";
import { ChatPanel } from "@/components/ChatPanel";
import { DailyNotificationPanel } from "@/components/DailyNotificationPanel";
import { WeatherPanel } from "@/components/WeatherPanel";
import { useChatRoom } from "@/hooks/use-chat-room";
import { useDailyNotification } from "@/hooks/use-daily-notification";
import { fetchComment } from "@/lib/comment";
import {
  getNearestPrefecture,
  Prefecture,
  SelectedArea,
} from "@/lib/prefecture";
import { fetchWeather, Weather } from "@/lib/weather";
import { getErrorMessage } from "@/lib/weather-display";

export default function Home() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [city, setCity] = useState<SelectedArea | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    chatError,
    chatImage,
    chatInput,
    chatLoading,
    chatMessages,
    chatSending,
    clearSelectedImage,
    sendChatMessage,
    sendReaction,
    setChatImage,
    setChatInput,
    viewerCount,
  } = useChatRoom(chatRoom, chatFileInputRef);

  const {
    isNotificationForCurrentRoom,
    notificationButtonLabel,
    notificationDescription,
    notificationLoading,
    notificationSupported,
    notificationTitle,
    registerDailyNotification,
    unregisterDailyNotification,
  } = useDailyNotification(chatRoom);

  const getWeather = async (prefecture: Prefecture) => {
    setLoading(true);
    setError(null);
    setComment(null);

    try {
      const weatherData = await fetchWeather(prefecture.lat, prefecture.lon);
      setWeather(weatherData);
      setCity(prefecture);
      setChatRoom(prefecture.name);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getWeatherByLocation = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    setComment(null);

    try {
      const weatherData = await fetchWeather(lat, lon);
      setWeather(weatherData);
      setCity({ name: "現在地", lat, lon });
      setChatRoom(getNearestPrefecture(lat, lon).name);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getLocationWeather = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeatherByLocation(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (err) => {
        console.error(err);
        alert("位置情報の取得に失敗しました");
      }
    );
  };

  const getComment = async () => {
    if (!weather) return;

    setAiLoading(true);

    try {
      const data = await fetchComment({
        temperature: weather.temperature,
        weather: weather.weathercode,
        windspeed: weather.windspeed,
        precipitationProbability: weather.precipitationProbability,
      });
      setComment(data.message);
    } catch {
      setComment("AIの取得に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="weather-shell">
      <section className="weather-console" aria-label="Weather dashboard">
        <header className="weather-header">
          <div>
            <h1>Weather Board</h1>
            <p className="lead">都道府県を選んで、現在の空模様を確認します。</p>
          </div>
        </header>

        <AreaSelector
          city={city}
          onCurrentLocation={getLocationWeather}
          onSelectPrefecture={getWeather}
        />

        {loading && (
          <div className="status-message" role="status">
            <span className="loader" aria-hidden="true" />
            <span>天気を取得中...</span>
          </div>
        )}

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {weather && !loading && (
          <WeatherPanel
            aiLoading={aiLoading}
            onGenerateAdvice={getComment}
            weather={weather}
          />
        )}

        {aiLoading && !weather && (
          <div className="status-message" role="status">
            <span className="loader loader--small" aria-hidden="true" />
            <span>AIが考え中...</span>
          </div>
        )}

        {comment && (
          <aside className="comment-panel">
            <p className="comment-label">Advice</p>
            <p>{comment}</p>
          </aside>
        )}

        {chatRoom && (
          <DailyNotificationPanel
            buttonLabel={notificationButtonLabel}
            description={notificationDescription}
            disabled={notificationLoading || !notificationSupported}
            isCurrentRoom={isNotificationForCurrentRoom}
            onRegister={registerDailyNotification}
            onUnregister={unregisterDailyNotification}
            title={notificationTitle}
          />
        )}

        {!weather && !loading && (
          <div className="empty-state">
            <span aria-hidden="true" />
            <p>都市を選ぶと天気が表示されます</p>
          </div>
        )}

        {chatRoom && (
          <ChatPanel
            chatError={chatError}
            chatFileInputRef={chatFileInputRef}
            chatImage={chatImage}
            chatInput={chatInput}
            chatLoading={chatLoading}
            chatMessages={chatMessages}
            chatRoom={chatRoom}
            chatSending={chatSending}
            clearSelectedImage={clearSelectedImage}
            onSubmit={sendChatMessage}
            sendReaction={sendReaction}
            setChatImage={setChatImage}
            setChatInput={setChatInput}
            viewerCount={viewerCount}
          />
        )}
      </section>
    </main>
  );
}
