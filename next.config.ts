import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/admin/canales',
        destination: '/dashboard/admin/productos?tab=canales',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "znmqvjxdnslrrvsjquej.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "znmqvjxdnslrrvsjquej.supabase.co",
        pathname: "/storage/v1/render/image/public/**",
      },
    ],
  },
};

export default nextConfig;
