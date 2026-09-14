// Cloudflare Workers 极简入口
// 本项目为纯静态站点，静态资源由 wrangler.toml 的 [assets] 直接托管
// 此文件仅作为 Worker 入口占位，无额外逻辑
export default {
  async fetch() {
    return new Response("NavHub static assets", { status: 200 });
  },
};
