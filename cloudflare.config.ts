import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "wedding-seating-chart",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    // Both hostnames serve the chart. Custom Domains create the DNS records
    // and certificates on deploy. workers.dev stays on as a fallback URL.
    domains: ["ahadandrehnuba.com", "www.ahadandrehnuba.com"],
    workersDev: true,
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      // Photo booth: originals in R2, metadata and quest progress in D1.
      PHOTOS: bindings.r2({ name: "wedding-photo-booth" }),
      DB: bindings.d1({ name: "wedding-photo-booth" }),
      PHOTO_ADMIN_KEY: bindings.secret(),
    },
  }),
});
