export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    // 健康自检：供 GitHub Actions 每日探活与监控使用
    if (p === "/api/health") {
      return Response.json({
        ok: true,
        service: "astrakit",
        time: new Date().toISOString(),
      });
    }

    // 命中计数（KV 可选，未配置时优雅降级，不影响站点）
    if (p === "/api/hit" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch {}
      const key = "hit:" + (body.tool || "total");
      if (!env.COUNTS) {
        return Response.json({ key, count: 0, note: "kv-not-configured" });
      }
      const prev = parseInt((await env.COUNTS.get(key)) || "0", 10);
      const next = prev + 1;
      await env.COUNTS.put(key, String(next));
      return Response.json({ key, count: next });
    }

    // 汇总统计
    if (p === "/api/stats") {
      if (!env.COUNTS) {
        return Response.json({ total: 0, note: "kv-not-configured" });
      }
      const total = parseInt((await env.COUNTS.get("hit:total")) || "0", 10);
      return Response.json({ total });
    }

    // 其余请求落到静态资源
    return env.ASSETS.fetch(request);
  },
};