"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { prefectures } from "@/data/prefectures";
import { fetchWeather } from "@/lib/weather";
import { fetchComment } from "@/lib/comment";
import { supabase } from "@/lib/supabase";

type Prefecture = (typeof prefectures)[number];

type CurrentLocation = {
  name: "現在地";
  lat: number;
  lon: number;
};

type SelectedArea = Prefecture | CurrentLocation;

type Weather = {
  temperature: number;
  weathercode: number;
  windspeed: number;
};

type ChatMessage = {
  id: string;
  room: string;
  kind: "message" | "reaction";
  body: string;
  created_at: string;
};

const weatherReactions = ["雨きた", "暑い", "風つよい", "洗濯いける"];

const getChatExpirationCutoff = () => {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "予期しないエラーが発生しました";
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return "晴れ";
  if (code <= 3) return "くもり";
  if (code <= 48) return "霧";
  if (code <= 67) return "雨";
  return "不明";
};

const getWeatherTone = (code: number) => {
  if (code === 0) return "clear";
  if (code <= 3) return "cloud";
  if (code <= 48) return "mist";
  if (code <= 67) return "rain";
  return "unknown";
};

const getWeatherImage = (code: number) => {
  return `/weather/${getWeatherTone(code)}-pictogram.png`;
};

const getNearestPrefecture = (lat: number, lon: number) => {
  return prefectures.reduce((nearest, prefecture) => {
    const nearestDistance =
      (nearest.lat - lat) ** 2 + (nearest.lon - lon) ** 2;
    const prefectureDistance =
      (prefecture.lat - lat) ** 2 + (prefecture.lon - lon) ** 2;

    return prefectureDistance < nearestDistance ? prefecture : nearest;
  }, prefectures[0]);
};

export default function Home() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [city, setCity] = useState<SelectedArea | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const presenceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!chatRoom) {
      setChatMessages([]);
      setChatInput("");
      setChatError(null);
      setChatLoading(false);
      return;
    }

    const loadChatMessages = async () => {
      setChatLoading(true);
      setChatError(null);

      const { data, error } = await supabase
        .from("weather_chat_messages")
        .select("id, room, kind, body, created_at")
        .eq("room", chatRoom)
        .gte("created_at", getChatExpirationCutoff())
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setChatError(error.message);
        setChatMessages([]);
      } else {
        setChatMessages([...(data as ChatMessage[])].reverse());
      }

      setChatLoading(false);
    };

    loadChatMessages();
  }, [chatRoom]);

  useEffect(() => {
    if (!chatRoom) return;

    const channel = supabase
      .channel(`weather-chat:${chatRoom}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "weather_chat_messages",
          filter: `room=eq.${chatRoom}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;

          setChatMessages((messages) => {
            if (messages.some((message) => message.id === incoming.id)) {
              return messages;
            }

            return [...messages, incoming].slice(-30);
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setChatError("Realtimeの接続に失敗しました");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoom]);

  useEffect(() => {
    if (!chatRoom) {
      setViewerCount(0);
      return;
    }

    if (!presenceIdRef.current) {
      presenceIdRef.current = crypto.randomUUID();
    }

    const channel = supabase.channel(`weather-presence:${chatRoom}`, {
      config: {
        presence: {
          key: presenceIdRef.current,
        },
      },
    });

    const updateViewerCount = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const count = Object.values(state).reduce(
        (total, presences) => total + presences.length,
        0
      );

      setViewerCount(count);
    };

    channel
      .on("presence", { event: "sync" }, updateViewerCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            room: chatRoom,
            online_at: new Date().toISOString(),
          });
        }

        if (status === "CHANNEL_ERROR") {
          setViewerCount(0);
        }
      });

    return () => {
      setViewerCount(0);
      supabase.removeChannel(channel);
    };
  }, [chatRoom]);

  const getWeather = async (p: Prefecture) => {
    setLoading(true);
    setError(null);
    setComment(null);

    try {
      const weatherData = await fetchWeather(p.lat, p.lon);
      setWeather(weatherData);
      setCity(p);
      setChatRoom(p.name);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
      setChatRoom(getNearestPrefecture(lat, lon).name);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
    } catch {
      setComment("AIの取得に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  const sendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = chatInput.trim();
    if (!chatRoom || !body || chatSending) return;

    setChatSending(true);
    setChatError(null);

    const { data, error } = await supabase
      .from("weather_chat_messages")
      .insert({
        room: chatRoom,
        kind: "message",
        body,
      })
      .select("id, room, kind, body, created_at")
      .single();

    if (error) {
      setChatError(error.message);
    } else if (data) {
      const inserted = data as ChatMessage;

      setChatMessages((messages) => {
        if (messages.some((message) => message.id === inserted.id)) {
          return messages;
        }

        return [...messages, inserted].slice(-30);
      });
      setChatInput("");
    }

    setChatSending(false);
  };

  const sendReaction = async (body: string) => {
    if (!chatRoom || chatSending) return;

    setChatSending(true);
    setChatError(null);

    const { data, error } = await supabase
      .from("weather_chat_messages")
      .insert({
        room: chatRoom,
        kind: "reaction",
        body,
      })
      .select("id, room, kind, body, created_at")
      .single();

    if (error) {
      setChatError(error.message);
    } else if (data) {
      const inserted = data as ChatMessage;

      setChatMessages((messages) => {
        if (messages.some((message) => message.id === inserted.id)) {
          return messages;
        }

        return [...messages, inserted].slice(-30);
      });
    }

    setChatSending(false);
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

        <div className="control-row">
          <label className="field">
            <span>Area</span>
            <select
              value={city?.name === "現在地" ? "" : city?.name ?? ""}
              onChange={(e) => {
                const selected = prefectures.find(
                  (p) => p.name === e.target.value
                );
                if (selected) getWeather(selected);
              }}
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
          </label>

          <button onClick={getLocationWeather} className="secondary-action">
            現在地で見る
          </button>
        </div>

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
          <section
            className={`weather-panel weather-panel--${getWeatherTone(
              weather.weathercode
            )}`}
          >
            <div className="panel-topline">
              <div>
                <p className="condition">{getWeatherLabel(weather.weathercode)}</p>
              </div>
            </div>

            <Image
              className="weather-mark"
              src={getWeatherImage(weather.weathercode)}
              alt=""
              aria-hidden="true"
              width={340}
              height={340}
            />

            <div className="temperature-readout">
              <span>{Math.round(weather.temperature)}</span>
              <small>°C</small>
            </div>

            <dl className="metrics">
              <div>
                <dt>風速</dt>
                <dd>{weather.windspeed} m/s</dd>
              </div>
            </dl>

            <button
              onClick={getComment}
              disabled={!weather || aiLoading}
              className="primary-action"
            >
              {aiLoading ? "生成中..." : "天気アドバイスを生成"}
            </button>
          </section>
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

        {!weather && !loading && (
          <div className="empty-state">
            <span aria-hidden="true" />
            <p>都市を選ぶと天気が表示されます</p>
          </div>
        )}

        {chatRoom && (
          <section className="chat-panel" aria-label={`${chatRoom}のチャット`}>
            <div className="chat-header">
              <div>
                <p className="comment-label">Local Chat</p>
                <h2>{chatRoom}の空模様</h2>
              </div>
              <div className="chat-stats">
                <span>閲覧中 {viewerCount}</span>
                <span>{chatMessages.length} messages</span>
              </div>
            </div>

            <div className="chat-log">
              {chatLoading && <p className="chat-muted">読み込み中...</p>}

              {!chatLoading && chatMessages.length === 0 && (
                <p className="chat-muted">まだ投稿がありません。</p>
              )}

              {!chatLoading &&
                chatMessages.map((message) => (
                  <article
                    className={`chat-message chat-message--${message.kind}`}
                    key={message.id}
                  >
                    <p>{message.body}</p>
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </article>
                ))}
            </div>

            <div className="reaction-row" aria-label="天気リアクション">
              {weatherReactions.map((reaction) => (
                <button
                  className="reaction-button"
                  disabled={chatSending}
                  key={reaction}
                  onClick={() => sendReaction(reaction)}
                  type="button"
                >
                  {reaction}
                </button>
              ))}
            </div>

            {chatError && (
              <p className="chat-error" role="alert">
                {chatError}
              </p>
            )}

            <form className="chat-form" onSubmit={sendChatMessage}>
              <label className="chat-input">
                <span>Message</span>
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  maxLength={240}
                  rows={3}
                  placeholder={`${chatRoom}の天気について投稿`}
                />
              </label>
              <button
                className="primary-action"
                disabled={!chatInput.trim() || chatSending}
                type="submit"
              >
                {chatSending ? "送信中..." : "投稿"}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
