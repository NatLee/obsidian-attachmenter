import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const baseConfig = {
  entryPoints: ["main.ts"],
  bundle: true,
  sourcemap: isWatch,
  treeShaking: true,
  outfile: "main.js",
  format: "cjs",
  target: "es2018",
  platform: "browser",
  external: ["obsidian"],
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(baseConfig);
    await ctx.watch();
    console.log("watching for changes...");
  } else {
    await esbuild.build(baseConfig);
    console.log("build finished.");
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

