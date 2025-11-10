import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // 删除错误的 api 配置，因为 API 路由的配置应在各自的 API 路由文件中设置
};

export default nextConfig;
