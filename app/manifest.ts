import type { MetadataRoute } from "next";

/*
 * Web app manifest (served at /manifest.webmanifest, linked from every page by Next).
 * Icons are Wilson's cracked lake-bed tile (drylake-ops D27), rendered by
 * scripts/brand/render-app-icons.mjs. The favicon, SVG icon and apple icon live beside this
 * file as Next file conventions; this only adds the 192/512 sizes Android and Chrome use.
 * display "browser": the public site is not offered as an installable app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Drylake",
    short_name: "Drylake",
    start_url: "/",
    display: "browser",
    background_color: "#0f1013",
    theme_color: "#0f1013",
    icons: [
      { src: "/brand/drylake-app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/drylake-app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
