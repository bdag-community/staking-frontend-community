import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseName = process.env.BDAG_ABI_RELEASE || "governance-devnet-v5";
if (!["governance-devnet-v5", "governance-testnet-release-v1"].includes(releaseName)) throw new Error("Unreviewed ABI release");
const release = resolve(root, "../Contract-Staking/out", releaseName);
const outputs = {
  "src/contract/abi.ts": ["abi", releaseName === "governance-testnet-release-v1" ? "StakingContractV2Testnet.abi.json" : "StakingContractV2Devnet.abi.json"],
  "src/contract/credential-abi.ts": ["credentialAbi", "EpochCredential.abi.json"],
  "src/contract/chain-tally-reader-abi.ts": ["chainTallyReaderAbi", "ChainTallyReader.abi.json"],
};

for (const [target, [exportName, source]] of Object.entries(outputs)) {
  const abi = JSON.parse(await readFile(resolve(release, source), "utf8"));
  if (!Array.isArray(abi) || !abi.some((item) => item?.type === "function")) throw new Error(`${source} is not a compiled ABI array`);
  const generated = `// GENERATED from the reviewed ${releaseName} release. Do not edit by hand.\nexport const ${exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  await writeFile(resolve(root, target), generated, "utf8");
}
console.log(`Synced ${Object.keys(outputs).length} ABIs from ${releaseName}`);
