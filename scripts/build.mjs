// NavHub 构建脚本：纯静态项目，直接复制产物到 dist/
// 标准参考：daohangwangzhan（vite 构建 → dist），此处无编译，仅复制
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

// 需要发布的文件/目录
const ITEMS = [
  "index.html",
  "css",
  "js",
  "data",
  "README.md",
];

console.log("🧱 构建 NavHub 静态站点 → dist/");
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const item of ITEMS) {
  cpSync(join(ROOT, item), join(DIST, item), { recursive: true });
  console.log("  ✔", item);
}
console.log("✅ 构建完成");
