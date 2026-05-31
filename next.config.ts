import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js does not infer a parent
  // directory when other lockfiles exist higher up the filesystem.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
