import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/event/ahad-and-rehnuba",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
