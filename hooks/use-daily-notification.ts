"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/weather-display";
import { supabase } from "@/lib/supabase";
import { urlBase64ToUint8Array, vapidPublicKey } from "@/lib/push";

export const useDailyNotification = (chatRoom: string | null) => {
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationRoom, setNotificationRoom] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    setNotificationSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
  }, []);

  useEffect(() => {
    if (!notificationSupported) return;

    const checkSubscription = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setNotificationEnabled(false);
        setNotificationRoom(null);
        return;
      }

      setNotificationEnabled(true);

      const { data } = await supabase
        .from("weather_push_subscriptions")
        .select("room, enabled")
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();

      if (data?.enabled && typeof data.room === "string") {
        setNotificationRoom(data.room);
      }
    };

    checkSubscription();
  }, [notificationSupported]);

  const registerDailyNotification = async () => {
    if (!chatRoom || notificationLoading) return;

    setNotificationLoading(true);
    setNotificationMessage(null);

    try {
      if (!notificationSupported) {
        throw new Error("このブラウザはWeb Push通知に対応していません");
      }

      if (!vapidPublicKey) {
        throw new Error("通知用の公開鍵が設定されていません");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("通知が許可されませんでした");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const { error } = await supabase
        .from("weather_push_subscriptions")
        .upsert(
          {
            endpoint: subscription.endpoint,
            subscription: subscription.toJSON(),
            room: chatRoom,
            enabled: true,
          },
          { onConflict: "endpoint" }
        );

      if (error) {
        throw new Error(error.message);
      }

      setNotificationMessage(
        `${chatRoom}の天気を毎朝8時に通知します。iPhoneではホーム画面のアイコンから開いて登録してください。`
      );
      setNotificationEnabled(true);
      setNotificationRoom(chatRoom);
    } catch (err: unknown) {
      setNotificationMessage(getErrorMessage(err));
    } finally {
      setNotificationLoading(false);
    }
  };

  const unregisterDailyNotification = async () => {
    if (notificationLoading) return;

    setNotificationLoading(true);
    setNotificationMessage(null);

    try {
      if (!notificationSupported) {
        throw new Error("このブラウザはWeb Push通知に対応していません");
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setNotificationEnabled(false);
        setNotificationRoom(null);
        setNotificationMessage("この端末では通知が登録されていません。");
        return;
      }

      const { error } = await supabase
        .from("weather_push_subscriptions")
        .update({ enabled: false })
        .eq("endpoint", subscription.endpoint);

      if (error) {
        throw new Error(error.message);
      }

      await subscription.unsubscribe();
      setNotificationEnabled(false);
      setNotificationRoom(null);
      setNotificationMessage("毎朝の天気通知を解除しました。");
    } catch (err: unknown) {
      setNotificationMessage(getErrorMessage(err));
    } finally {
      setNotificationLoading(false);
    }
  };

  const isNotificationForCurrentRoom =
    notificationEnabled && notificationRoom === chatRoom;
  const notificationTitle =
    notificationEnabled && notificationRoom
      ? `毎朝8時に${notificationRoom}の天気を通知中`
      : chatRoom
        ? `毎朝8時に${chatRoom}の天気を通知`
        : "毎朝8時に天気を通知";
  const notificationDescription =
    notificationMessage ??
    (notificationEnabled && notificationRoom
      ? notificationRoom === chatRoom
        ? `${notificationRoom}の天気通知が登録されています。`
        : `現在は${notificationRoom}を通知中です。${chatRoom}に変更できます。`
      : "選択中の地域の天気、気温、アドバイスを毎朝8時に通知します。");
  const notificationButtonLabel = notificationLoading
    ? "処理中..."
    : isNotificationForCurrentRoom
      ? "通知を解除"
      : notificationEnabled
        ? "通知地域を変更"
        : "通知を登録";

  return {
    isNotificationForCurrentRoom,
    notificationButtonLabel,
    notificationDescription,
    notificationLoading,
    notificationSupported,
    notificationTitle,
    registerDailyNotification,
    unregisterDailyNotification,
  };
};
