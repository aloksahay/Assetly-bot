/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@radix-ui/react-slot"],
  env: {
    ZERION_API_KEY: process.env.ZERION_API_KEY,
    BRIAN_API_KEY: process.env.BRIAN_API_KEY,
  }
}

module.exports = nextConfig 