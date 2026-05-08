import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weather Board",
    short_name: "Weather",
    description: "Current weather, local chat, and daily weather advice.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1eb",
    theme_color: "#225c7a",
    icons: [
      {
        src: "/weather/clear-pictogram.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/weather/cloud-pictogram.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
