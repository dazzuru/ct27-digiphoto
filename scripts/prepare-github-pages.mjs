import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../dist/client/", import.meta.url));
const repositoryName = (process.env.GITHUB_REPOSITORY ?? "").split("/").pop() ?? "";
const isUserSite = repositoryName.endsWith(".github.io");
const basePath = repositoryName && !isUserSite ? `/${repositoryName}` : "";
const textExtensions = new Set([".html", ".js", ".json", ".rsc", ".css"]);

async function updateAssetPaths(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await updateAssetPaths(path);
    } else if (textExtensions.has(extname(entry.name))) {
      const source = await readFile(path, "utf8");
      const updated = source.replaceAll("/_next/", `${basePath}/_next/`);
      if (updated !== source) await writeFile(path, updated);
    }
  }
}

await updateAssetPaths(outputDirectory);
await writeFile(join(outputDirectory, ".nojekyll"), "");
console.log(`GitHub Pages files prepared${basePath ? ` for ${basePath}` : ""}.`);
