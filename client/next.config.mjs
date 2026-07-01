/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  transpilePackages: ["yjs", "y-monaco", "y-protocols"],
};

export default nextConfig;
