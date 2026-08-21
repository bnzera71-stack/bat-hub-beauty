import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hub Beauty",
    short_name: "Hub Beauty",
    description: "Agendamento online e gestão para salões e profissionais da beleza.",
    start_url: "/login",
    display: "standalone",
    background_color: "#1b1420",
    theme_color: "#1b1420",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
