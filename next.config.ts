import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // vinext screens every multipart POST as a possible Server Action and caps it at this size
    // (1 MB by default), which would refuse ordinary photo uploads. 25 MB covers the 20 MB
    // originals sent for server-side conversion; videos stream through a PUT and skip this check.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
