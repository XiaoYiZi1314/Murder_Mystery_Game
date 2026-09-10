import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "十三雾剧本杀",
    short_name: "十三雾",
    description: "把今晚留给一个故事",
    lang: "zh-CN",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d1d1f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
