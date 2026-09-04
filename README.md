# Sky Exec

A Claude/MCP agent composes a Sky sUSDS deposit or withdraw workflow on KeeperHub. I review it, dry-run with no chain write, then that exact workflow executes. Policy limits, audit trail, and a real KeeperHub transaction hash are in the demo.

This repo is the **agent + policy + dry-run + audit glue**. Sky Protocol is the live project. KeeperHub is the deterministic execution layer. This repo is not KeeperHub.

**Source:** [github.com/Kohap/keeperhub-sky-exec](https://github.com/Kohap/keeperhub-sky-exec)

## Submission facts

| Field | Value |
| --- | --- |
| Live project | **Sky (USDS / sUSDS)** |
| GitHub | [Kohap/keeperhub-sky-exec](https://github.com/Kohap/keeperhub-sky-exec) |
| Demo | [keeperhub-sky-exec.vercel.app](https://keeperhub-sky-exec.vercel.app/) |
| Figma | [Sky Exec desk](https://www.figma.com/design/NY2QOot7eDDTyHhbSXteHT) |
| Proof commit | [`588cf00`](https://github.com/Kohap/keeperhub-sky-exec/commit/588cf000a1659ce9b82219f9e6facfd33e9d2084) (first execute). Desk: `main`. |
| KeeperHub surfaces | MCP (`create_workflow`, `validate_workflow`, `execute_workflow`, `get_execution`, `list_action_schemas`, `search_protocol_actions`, `execute_protocol_action`), REST simulate (`POST /api/execute/contract-call` with `simulate: true`), audit trail, CLI |
| Network | **Ethereum mainnet** (Sky plugin has no testnet). Gas was KeeperHub-sponsored. Amount was **0 USDS approve** so no savings moved. |
| Workflow | `mcwzez7idnh81xj8dofz1` · [open](https://app.keeperhub.com/workflows/mcwzez7idnh81xj8dofz1) |
| Deposit workflow (composed, not funded) | `nmm3kwxaj90uocmrm9m5y` · [open](https://app.keeperhub.com/workflows/nmm3kwxaj90uocmrm9m5y) |
| KeeperHub run | `r7grdajtci7hf757zd9xr` · [open](https://app.keeperhub.com/executions/r7grdajtci7hf757zd9xr) |
| Tx hash | `0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04` · [Etherscan](https://etherscan.io/tx/0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04) |
| Block | 25903693 |
| Action | `sky/approve-usds` spender = sUSDS vault `0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD`, amount `0` |
| Org wallet | `0x0f7cc9e7dadac4d885b8878b7e08761843fe781d` |

Also recorded (direct REST, same org, same Sky token): [`0x13abb364f92e076cea232eda097c2e9201a31d4ab9cacb283d6ceaa9a128d346`](https://etherscan.io/tx/0x13abb364f92e076cea232eda097c2e9201a31d4ab9cacb283d6ceaa9a128d346).

Baked copy: [`proof/keeperhub-run.json`](proof/keeperhub-run.json).

## Pipeline

```
observe → decide → policy → dry-run → KeeperHub execute → audit
```

| Module | Interface |
| --- | --- |
| `packages/policy` | `assertAllowed(intent) → Allow \| Reject(reason)` |
| `packages/keeperhub` | `dryRun(workflow)` / `execute(workflow)` / `getRun(id)` — MCP adapter + fixture adapter |
| `packages/audit` | `append(record)` / `list()` — JSONL on CLI, local rows in the UI |
| `packages/cli` | `npm run compose -- "<prompt>"` |

Policy hides: max amount (default 10 USDS), allowlisted action types, allowlisted assets (USDS/sUSDS only), cooldown, kill switch (`KILL_SWITCH=1`), chain id `1`.

## 90-second demo

1. Prompt: `approve 0 USDS for the sUSDS vault`
2. Policy line: cap 10 USDS, allowlist, cooldown, kill switch. **Policy check** → allow.
3. **Dry-run**: REST simulate of `USDS.approve(sUSDS, 0)` → `wouldRevert: false`, gas on the confirm strip. MCP log shows `contract-call simulate`.
4. **Execute**: MCP `execute_workflow` → run `r7grdajtci7hf757zd9xr`. Copy hash.
5. Explorer hash on Ethereum. Fixture labels say **recorded**.
6. Failure path: `npm run compose -- "deposit spare USDS above 100 into sUSDS"` → **policy reject** (100 > cap 10). Toggle `KILL_SWITCH` to see the other reject.

Script: [`docs/VIDEO.md`](docs/VIDEO.md). Capture: [`docs/demo-90s.mp4`](docs/demo-90s.mp4).

## CLI

```bash
cp .env.example .env   # put a kh_ org key; never commit it
npm run compose -- "deposit spare USDS above 100 into sUSDS"
npm run compose -- "approve 0 USDS for the sUSDS vault" --dry-run
npm run compose -- "approve 0 USDS for the sUSDS vault" --execute
```

`--kill` forces the kill switch. Without `KEEPERHUB_API_KEY` the CLI uses the fixture adapter and prints the recorded live hash instead of inventing one.

## GitHub (DoraHacks source link)

Public source: [`Kohap/keeperhub-sky-exec`](https://github.com/Kohap/keeperhub-sky-exec)

Proof commit: [`588cf000a1659ce9b82219f9e6facfd33e9d2084`](https://github.com/Kohap/keeperhub-sky-exec/commit/588cf000a1659ce9b82219f9e6facfd33e9d2084)

Paste `https://github.com/Kohap/keeperhub-sky-exec` into the DoraHacks source field.

## MCP / OAuth notes

Hosted MCP: `https://app.keeperhub.com/mcp`

**Headless (this repo):** organisation API key.

1. Sign in at [app.keeperhub.com](https://app.keeperhub.com)
2. Avatar → **API Keys** → **Organisation** tab
3. Create a key. It starts with `kh_`. Copy once.
4. `export KEEPERHUB_API_KEY=kh_…`
5. User keys (`wfb_`) authenticate webhook triggers only. They will 401 here.

**Interactive agent (Claude Code):**

```bash
claude mcp add --transport http --scope user keeperhub https://app.keeperhub.com/mcp
```

Then `/mcp` in Claude Code, approve OAuth in the browser.

Wallet: KeeperHub provisions a Turnkey org wallet. Writes go through that wallet, not a raw private-key executor in this repo.

## What still breaks

- **sUSDS deposit needs USDS.** The org wallet USDS balance is `0`. `sky/vault-deposit` of 0.001 USDS is rejected by policy (cap) or, if you raise the cap, by the vault (no assets). The live hash is a Sky **approve**, not a savings movement.
- **Workflow-level `test_workflow` is still on KeeperHub's roadmap.** Dry-run here is `validate_workflow` + `POST /api/execute/contract-call` with `simulate: true`.
- **`POST /api/execute/sky/approve-usds` ignored `simulate: true` and broadcast.** Do not use that REST path for dry-run. The MCP/REST seam in `packages/keeperhub` simulates only via `contract-call`.
- **Mainnet only.** Sky plugin lists Ethereum, Base, Arbitrum — no testnet actions.
- **Hosted preview cannot hold your `kh_` key.** Paste it in the session field to hit live MCP; leave it empty to walk policy + the recorded run.

## Layout

```
packages/policy      assertAllowed
packages/keeperhub   MCP + fixture adapters, composeIntent
packages/audit       JSONL / memory
packages/cli         npm run compose
src/                 thin TanStack control plane
proof/               baked run id + tx
scripts/publish-github.sh  create empty GitHub repo (if allowed) + push main
```

## License

MIT
