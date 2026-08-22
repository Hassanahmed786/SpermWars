import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["socket.io", "socket.io-client"],
  turbopack: {},
};

export default nextConfig;
