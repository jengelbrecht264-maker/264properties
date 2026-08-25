/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 removed `next lint` and the `eslint` config key entirely —
  // there is no build-time lint toggle anymore. Lint with the ESLint CLI
  // directly (or Biome) as a separate step/CI job if you want one; `next
  // build` no longer runs linting at all, so there's nothing to ignore.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

module.exports = nextConfig;
