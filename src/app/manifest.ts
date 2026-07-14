import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/content/public-copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3e9",
    theme_color: "#173a31",
    icons: [
      {
        src: "/brand/muslim-association-of-craigavon-logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/muslim-association-of-craigavon-logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
