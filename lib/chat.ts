import { prefectures } from "@/data/prefectures";
import { supabase } from "@/lib/supabase";

export type ChatMessage = {
  id: string;
  room: string;
  kind: "message" | "reaction" | "image";
  body: string;
  image_path: string | null;
  created_at: string;
};

export const weatherReactions = ["雨きた", "暑い", "寒い", "風つよい", "洗濯いける"];
export const chatImageBucket = "weather-chat-images";
export const maxChatImageSize = 3 * 1024 * 1024;

export const getChatExpirationCutoff = () => {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
};

export const getImageExtension = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  if (extension === "gif") return "gif";
  return null;
};

export const getChatImageUrl = (path: string) => {
  return supabase.storage.from(chatImageBucket).getPublicUrl(path).data.publicUrl;
};

export const getStorageSafeRoom = (room: string) => {
  const prefectureIndex = prefectures.findIndex(
    (prefecture) => prefecture.name === room
  );

  if (prefectureIndex >= 0) {
    return `prefecture-${prefectureIndex + 1}`;
  }

  return `room-${crypto.randomUUID()}`;
};
