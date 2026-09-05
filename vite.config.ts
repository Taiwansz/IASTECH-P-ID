import vinext from "vinext";
import { defineConfig } from "vite";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [],
  r2_buckets: [],
};

export default defineConfig(async ({ command }) => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const buildPlugins = [];
  if (command === "build") {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    buildPlugins.push(
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    );
  }

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      watch: {
        ignored: ["**/dist/**", "**/.wrangler/**"],
      },
    },
    plugins: [vinext(), ...buildPlugins],
  };
});
