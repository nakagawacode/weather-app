import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\n/)
    .filter(Boolean)
    .map((line) => line.split(/=(.*)/s).filter((_, index) => index < 2))
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const notificationSecret = env.NOTIFICATION_SECRET;

if (!supabaseUrl || !supabaseKey || !notificationSecret) {
  console.error("Supabase environment variables are missing in .env.local.");
  process.exit(1);
}

const response = await fetch(
  `${supabaseUrl}/functions/v1/send-daily-weather-notifications`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "x-notification-secret": notificationSecret,
    },
    body: "{}",
  }
);

console.log("status", response.status);
console.log(await response.text());

if (!response.ok) {
  process.exit(1);
}
