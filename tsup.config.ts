import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
    platform: "node",
    splitting: false,
    bundle: true,
    external: ["zod", "nice-grpc"],
});
