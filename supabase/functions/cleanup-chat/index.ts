import { createClient } from "npm:@supabase/supabase-js@2.105.3";

const chatImageBucket = "weather-chat-images";
const batchSize = 1000;

type ExpiredMessage = {
  id: string;
  image_path: string | null;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, message: "Supabase environment variables are not set." },
      500
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let deletedMessages = 0;
  let deletedImages = 0;

  while (true) {
    const { data: expiredMessages, error: selectError } = await supabaseAdmin
      .from("weather_chat_messages")
      .select("id, image_path")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (selectError) {
      return jsonResponse({ ok: false, message: selectError.message }, 500);
    }

    const messages = (expiredMessages ?? []) as ExpiredMessage[];
    if (messages.length === 0) {
      break;
    }

    const imagePaths = [
      ...new Set(
        messages
          .map((message) => message.image_path)
          .filter((path): path is string => Boolean(path))
      ),
    ];

    if (imagePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(chatImageBucket)
        .remove(imagePaths);

      if (storageError) {
        return jsonResponse({ ok: false, message: storageError.message }, 500);
      }

      deletedImages += imagePaths.length;
    }

    const ids = messages.map((message) => message.id);
    const { error: deleteError } = await supabaseAdmin
      .from("weather_chat_messages")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return jsonResponse({ ok: false, message: deleteError.message }, 500);
    }

    deletedMessages += messages.length;

    if (messages.length < batchSize) {
      break;
    }
  }

  return jsonResponse({
    ok: true,
    deletedMessages,
    deletedImages,
  });
});
