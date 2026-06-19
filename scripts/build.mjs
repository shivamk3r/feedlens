import { mkdir, rm, cp, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(root, "dist");
const assetDir = path.join(distDir, "assets");

const development = process.env.NODE_ENV === "development" || process.argv.includes("--development");
const production = !development;

await rm(distDir, { recursive: true, force: true });
await mkdir(assetDir, { recursive: true });

await cp(path.join(root, "public"), distDir, {
  recursive: true,
  filter: (source) => !source.endsWith(".DS_Store")
});

const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  legalComments: "none",
  logLevel: "info",
  target: ["chrome122"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development")
  }
};

const builds = [
  {
    ...common,
    entryPoints: [path.join(root, "src/background/index.ts")],
    outfile: path.join(assetDir, "background.js"),
    format: "esm"
  },
  {
    ...common,
    entryPoints: [path.join(root, "src/content/index.ts")],
    outfile: path.join(assetDir, "content.js"),
    format: "iife"
  },
  {
    ...common,
    entryPoints: [path.join(root, "src/popup/index.ts")],
    outfile: path.join(assetDir, "popup.js"),
    format: "iife"
  },
  {
    ...common,
    entryPoints: [path.join(root, "src/options/index.ts")],
    outfile: path.join(assetDir, "options.js"),
    format: "iife"
  },
  {
    ...common,
    entryPoints: [path.join(root, "src/sidepanel/index.ts")],
    outfile: path.join(assetDir, "sidepanel.js"),
    format: "iife"
  }
];

if (development) {
  builds.push({
    ...common,
    entryPoints: [path.join(root, "src/debug/index.ts")],
    outfile: path.join(assetDir, "debug.js"),
    format: "iife"
  });
}

await Promise.all(builds.map((options) => esbuild.build(options)));

await Promise.all([
  copyFile(path.join(root, "src/popup/popup.html"), path.join(distDir, "popup.html")),
  copyFile(path.join(root, "src/options/options.html"), path.join(distDir, "options.html")),
  copyFile(path.join(root, "src/sidepanel/sidepanel.html"), path.join(distDir, "sidepanel.html")),
  copyFile(path.join(root, "src/styles/feedlens.css"), path.join(assetDir, "feedlens.css"))
]);

if (development) {
  await copyFile(path.join(root, "src/debug/debug.html"), path.join(distDir, "debug.html"));
}

console.log(`Built FeedLens extension into ${path.relative(root, distDir)}`);
