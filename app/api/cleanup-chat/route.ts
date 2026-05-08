import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const chatImageBucket = "weather-chat-images";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const supabaseAdmin = createSupabaseAdmin();

  const { data: expiredMessages, error: selectError } = await supabaseAdmin
    .from("weather_chat_messages")
    .select("id, image_path")
    .lt("created_at", cutoff)
    .limit(1000);

  if (selectError) {
    return NextResponse.json(
      { ok: false, message: selectError.message },
      { status: 500 }
    );
  }

  const imagePaths = [
    ...new Set(
      (expiredMessages ?? [])
        .map((message) => message.image_path)
        .filter((path): path is string => Boolean(path))
    ),
  ];

  if (imagePaths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(chatImageBucket)
      .remove(imagePaths);

    if (storageError) {
      return NextResponse.json(
        { ok: false, message: storageError.message },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from("weather_chat_messages")
    .delete()
    .lt("created_at", cutoff);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, message: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deletedMessages: expiredMessages?.length ?? 0,
    deletedImages: imagePaths.length,
  });
}
