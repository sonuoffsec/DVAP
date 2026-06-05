import type { NextConfig } from "next"

const config: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://api:8000/api/:path*`,
      },
    ]
  },
}

export default config
