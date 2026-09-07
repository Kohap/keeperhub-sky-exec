# Mechanism

Sky Exec is glue. Sky Protocol is the live USDS/sUSDS market. KeeperHub is the execution layer. This document is the pipeline, not the demo. The demo is the [desk](https://keeperhub-sky-exec.vercel.app/desk).

```
prompt
  → sanitize + Zod
  → composeIntent
  → assertAllowed (policy)
  → workflowFromIntent
  → dryRun (validate_workflow + contract-call simulate of the *same* write)
  → execute_workflow
  → audit
```

Same path in the desk, the CLI (`npm run compose`), and `runPipeline` in `src/lib/sky-pipeline.ts`.

---

## 1. Three layers

| Layer | What it is | What it is not |
| --- | --- | --- |
| **Sky** | Live savings. USDS `0xdC035D45d973E3EC169d2276DDab16f1e407384F`. sUSDS vault `0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD`. Ethereum mainnet. | This website. |
| **KeeperHub** | MCP at `https://app.keeperhub.com/mcp`. Turnkey org wallet. Gas, nonce, retries. | Sky. |
| **This repo** | Policy, compose, dry-run adapter, audit, desk. | A lending market. |

Guest `app.keeperhub.com/executions/:id` 404s. The public proof is Etherscan.

---

## 2. Input

Desk and server fns share `src/lib/pipeline-input.ts`.

- Prompt: trim, strip tags/nulls, 1–400 characters.
- API key: empty (fixture) or `kh_[A-Za-z0-9]+`. User keys `wfb_` 401 here.
- Kill switch: boolean. Client may force **ON**. Server `KILL_SWITCH=1` cannot be forced off (`false` does not win over env).
- Last execute timestamp: accepted for old clients, **ignored**. Cooldown is a server-side store (`packages/policy/src/cooldown.ts`). CLI also writes `data/last-execute.json`.

The server re-parses. The client is not trusted.

---

## 3. Compose

`packages/keeperhub/src/compose.ts` · `composeIntent(prompt)`

The first number-like token in the prompt is the amount. Scientific notation (`1e2`) is kept so policy can reject it. No number + “approve” → `0`. No number otherwise → `1`. Amounts are canonical human decimals (no IEEE `Number()`).

| Prompt contains | Action | Asset |
| --- | --- | --- |
| withdraw | `sky/vault-withdraw` | sUSDS |
| redeem | `sky/vault-redeem` | sUSDS |
| approve | `sky/approve-usds` | USDS |
| deposit / save / susds | `sky/vault-deposit` | USDS |

Chain is always `1`. Approve spender is always the sUSDS vault.

Receiver/owner for deposit, withdraw, and redeem: `KEEPERHUB_ORG_WALLET` or the recorded Turnkey org wallet `0x0f7cc9e7dadac4d885b8878b7e08761843fe781d`. **Never `0x0`.** ERC-4626 `deposit(assets, 0x0)` mints shares to the burn address.

`workflowFromIntent` then builds a KeeperHub graph:

- **approve** — Manual trigger → one `sky/approve-usds` node. Amount in wei-18.
- **withdraw** — Manual trigger → `sky/vault-withdraw`.
- **redeem** — Manual trigger → `sky/vault-redeem`. (Does not fall through to deposit.)
- **deposit** — Manual trigger → approve, then `sky/vault-deposit`. Two writes. Edges are sequential.

Workflows are created `enabled: false`. Execution is on demand, not a schedule.

---

## 4. Policy

`packages/policy/src/index.ts` · `assertAllowed(intent, limits)`

Deterministic. Order:

1. Kill switch → reject. Env ON is sticky; overrides can only force ON.
2. Chain must be 1.
3. Action must be in the Sky allowlist (`sky/approve-usds`, vault deposit/withdraw/redeem, plus read helpers).
4. Asset must be USDS or sUSDS.
5. Amount must be a canonical human decimal ≥ 0, compared to the cap in wei-18 (not IEEE). Default cap 10 USDS.
6. Deposit / withdraw / redeem require a non-zero receiver.
7. Cooldown (default 30s) since last execute, from the **server store**, not the request body.

A reject never calls KeeperHub execute. The DoraHacks failure path is `deposit spare USDS above 100 into sUSDS` (100 > 10).

Limits load from env: `POLICY_MAX_USDS`, `POLICY_CHAIN_ID`, `POLICY_COOLDOWN_SECONDS`, `KILL_SWITCH`.

`loadLimitsForRequest` is what the desk and `runPipeline` use.

---

## 5. Dry-run

KeeperHub’s workflow-level `test_workflow` is still on their roadmap. We do not pretend it exists.

Live adapter (`packages/keeperhub/src/mcp.ts` · `simulatePlan`):

1. `validate_workflow` if we already have an id.
2. `POST /api/execute/contract-call` with `simulate: true` for **every** Sky write, in order. A two-node deposit graph simulates approve **and** deposit. Any hop that would revert fails the dry-run.
   - Approve: USDS `approve(spender, amount)` at `0xdC03…384F`.
   - Deposit: vault `deposit(assets, receiver)` at `0xa393…27fbD`.
   - Withdraw: vault `withdraw(assets, receiver, owner)`.
   - Redeem: vault `redeem(shares, receiver, owner)`.

A withdraw/redeem must not be simulated as `deposit()`. That used to false-OK a live withdraw.

We do **not** dry-run via `POST /api/execute/sky/approve-usds`. In testing that path ignored `simulate: true` and broadcast.

Success: `ok`, `wouldRevert: false`, gas estimate. Failure: `dry_run_fail`. Execute is skipped.

---

## 6. Execute

1. `create_workflow` if the graph has no id (`enabled: false`).
2. MCP `execute_workflow` with `idempotency_key = exec:<workflowId>:<cooldownBucket>`. Double-clicks inside the cooldown window reuse the key. `Date.now()` is not part of the key.
3. Poll `get_execution` up to ~60s.
4. First transaction hash is the explorer proof.

`runPipeline` records the cooldown timestamp **synchronously before** `await execute()`, so two in-flight requests in one process cannot both pass the gate.

Turnkey org wallet: `0x0f7cc9e7dadac4d885b8878b7e08761843fe781d`. This repo never holds a raw private key.

Recorded live run (2026-09-04):

- Workflow `mcwzez7idnh81xj8dofz1`
- Execution `r7grdajtci7hf757zd9xr`
- Tx [`0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04`](https://etherscan.io/tx/0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04)
- Action `sky/approve-usds` amount **0**. Gas sponsored. Not a deposit.

---

## 7. Fixture vs live

`pickClient` in `sky-pipeline.ts`:

- `kh_…` → `createMcpAdapter` (live MCP).
- Empty or anything else → `createFixtureAdapter`.

Fixture **does not invent a hash**. Execute returns the recorded live run. The desk labels those rows `recorded`. Empty key is how a judge walks the 90s path without an org. Fixture will not pretend a deposit or withdraw landed.

---

## 8. Audit

CLI writes JSONL. Desk stores rows in `localStorage` (`sky-exec-audit-v1`). Each row: intent, policy, dry-run, run id, tx hash, mode, error.

---

## 9. Failure paths

| Path | What you see | Chain write |
| --- | --- | --- |
| Amount 100 | policy reject, exceeds cap 10 | No |
| `10.000000000000000001` | policy reject (wei cap, not IEEE) | No |
| `1e2` | policy reject, not a valid decimal | No |
| Kill switch (env or client ON) | Execute blocked | No |
| Client `killSwitch: false` while env is on | Still blocked | No |
| Cooldown (server store) | Wait Ns | No |
| Receiver `0x0` | policy + simulate reject | No |
| Dry-run wouldRevert | `dry_run_fail` | No |
| Unfunded deposit | vault would revert (0 USDS on the org wallet) | No |
| Fixture execute | recorded hash, labeled recorded | No new tx |

---

## 10. What this is not

- Not Sky.money.
- Not a KeeperHub dashboard.
- Not a funded sUSDS deposit (org wallet USDS = 0).
- Not x402 / MPP / a bounty PR.
- Not a docs site as the product. This page explains the desk.
