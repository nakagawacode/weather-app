"use client";

import {
  FormEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  chatImageBucket,
  ChatMessage,
  getChatExpirationCutoff,
  getImageExtension,
  getStorageSafeRoom,
  maxChatImageSize,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";

const appendMessage = (messages: ChatMessage[], incoming: ChatMessage) => {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }

  return [...messages, incoming].slice(-30);
};

export const useChatRoom = (
  chatRoom: string | null,
  chatFileInputRef: RefObject<HTMLInputElement | null>
) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatImage, setChatImage] = useState<File | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const presenceIdRef = useRef<string | null>(null);

  const clearSelectedImage = useCallback(() => {
    setChatImage(null);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = "";
    }
  }, [chatFileInputRef]);

  useEffect(() => {
    if (!chatRoom) return;

    const loadChatMessages = async () => {
      setChatLoading(true);
      setChatError(null);

      const { data, error } = await supabase
        .from("weather_chat_messages")
        .select("id, room, kind, body, image_path, created_at")
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
          setChatMessages((messages) => appendMessage(messages, incoming));
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
    if (!chatRoom) return;

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

  const sendTextMessage = async (body: string) => {
    const { data, error } = await supabase
      .from("weather_chat_messages")
      .insert({
        room: chatRoom,
        kind: "message",
        body,
      })
      .select("id, room, kind, body, image_path, created_at")
      .single();

    if (error) {
      setChatError(error.message);
    } else if (data) {
      setChatMessages((messages) => appendMessage(messages, data as ChatMessage));
      setChatInput("");
    }
  };

  const sendImageMessage = async (body: string, file: File) => {
    const extension = getImageExtension(file);

    if (!extension) {
      setChatError("投稿できる画像は jpg / png / webp / gif です");
      return;
    }

    if (file.size > maxChatImageSize) {
      setChatError("画像は3MB以内にしてください");
      return;
    }

    const imagePath = `${getStorageSafeRoom(
      chatRoom!
    )}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(chatImageBucket)
      .upload(imagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setChatError(uploadError.message);
      return;
    }

    const { data, error } = await supabase
      .from("weather_chat_messages")
      .insert({
        room: chatRoom,
        kind: "image",
        body: body || "画像",
        image_path: imagePath,
      })
      .select("id, room, kind, body, image_path, created_at")
      .single();

    if (error) {
      setChatError(error.message);
    } else if (data) {
      setChatMessages((messages) => appendMessage(messages, data as ChatMessage));
      setChatInput("");
      clearSelectedImage();
    }
  };

  const sendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = chatInput.trim();
    if (!chatRoom || (!body && !chatImage) || chatSending) return;

    setChatSending(true);
    setChatError(null);

    if (chatImage) {
      await sendImageMessage(body, chatImage);
    } else {
      await sendTextMessage(body);
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
      .select("id, room, kind, body, image_path, created_at")
      .single();

    if (error) {
      setChatError(error.message);
    } else if (data) {
      setChatMessages((messages) => appendMessage(messages, data as ChatMessage));
    }

    setChatSending(false);
  };

  return {
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
  };
};
