# DoraHacks form — Main track

**Hackathon:** [KeeperHub — The Agent Economy](https://dorahacks.io/hackathon/agent-economy)  
**Track (one BUIDL only):** Main — Best Integration into a Live Project  
**Deadline:** 18 Sep 2026 12:00 CEST  
**Do not also attach this BUIDL to the bounty.** Bounty needs a separate BUIDL + a PR to [KeeperHub/keeperhub](https://github.com/KeeperHub/keeperhub).

Incomplete submissions cannot be judged. Paste these three first:

| Required | Paste |
| --- | --- |
| Source | https://github.com/Kohap/keeperhub-sky-exec |
| Demo video | https://keeperhub-sky-exec.vercel.app/demo-90s.mp4 |
| KeeperHub tx | https://etherscan.io/tx/0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04 |

Demo: https://keeperhub-sky-exec.vercel.app/ · desk https://keeperhub-sky-exec.vercel.app/desk · pitch https://keeperhub-sky-exec.vercel.app/pitch · mechanism https://keeperhub-sky-exec.vercel.app/docs

---

## Form answers

**Which project did you integrate with, and what does the integration do?**

Sky Protocol savings (USDS ↔ sUSDS) on Ethereum mainnet. Vault `0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD`. A Claude/MCP (or CLI) agent composes a Sky approve / deposit / withdraw workflow on KeeperHub. Policy gates it. Dry-run simulates with no chain write. That exact graph executes. This repo is the glue, not Sky and not KeeperHub.

**Which KeeperHub surfaces did you use?**

MCP: `create_workflow`, `validate_workflow`, `execute_workflow`, `get_execution`, `list_action_schemas`, `search_protocol_actions`, `execute_protocol_action`. REST dry-run: `POST /api/execute/contract-call` with `simulate: true`. Audit trail. CLI. Agent-authored workflow id `mcwzez7idnh81xj8dofz1`. Not x402 / MPP.

**Testnet or mainnet?**

Mainnet. Sky plugin has no testnet actions. Amount was **0 USDS approve** so no savings moved. Gas was KeeperHub-sponsored.

**What still breaks or is unfinished?**

- Guest `app.keeperhub.com/executions/:id` 404s. Run id `r7grdajtci7hf757zd9xr` is real; the public proof is Etherscan.
- Org wallet USDS balance is 0, so a funded sUSDS deposit is not in the demo.
- `POST /api/execute/sky/approve-usds` ignored `simulate: true` in our testing; dry-run is contract-call simulate only.
- Fixture mode (empty `kh_` key) replays the recorded hash on purpose. It will not invent a new one.

**Reachable contact**

Fill on the form: email + X or Discord. In-repo copyright: Gift, 2026.

---

## One-liner for the BUIDL title / description

A Claude/MCP agent composes a Sky sUSDS deposit or withdraw workflow on KeeperHub. I review it, dry-run with no chain write, then that exact workflow executes. Policy limits, audit trail, and a real KeeperHub transaction hash are in the demo.

---

## Rubric (self-score)

| Criterion | Evidence | Risk |
| --- | --- | --- |
| 1. Integration depth | Named live project: Sky. Action `sky/approve-usds`, vault allowlist, chain 1 only. | Do not call KeeperHub “the live project.” |
| 2. Execution through KeeperHub | MCP `execute_workflow` → tx `0x28a94c…` block 25903693. | Amount 0. Judges asked “did value move?” — gas + USDS allowance did; savings did not. Say that. |
| 3. Reliability | Policy reject at 100 USDS, kill switch, dry-run `wouldRevert`, fixture vs live chip, audit rows. | Guest KH run UI 404. Tests exist but are thin vs prior winners. |
| 4. Usefulness | Last-mile for Sky savings agents: compose → gate → simulate → execute. | No Sky end-user deposit in the demo. |
| 5. DX | `packages/policy`, MCP adapter, CLI, `.env.example`, fixture so judges can click without a key. | No in-repo Claude skill; MCP is hosted KeeperHub. No bounty PR. |
