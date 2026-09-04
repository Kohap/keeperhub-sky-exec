# 90-second video script

On screen: Sky Exec landing → **Open the desk**. Clock starts after the desk is up.

**0:00–0:12 — one-liner**
> Sky Protocol is the live savings market. KeeperHub is the execution layer. This agent composes a Sky sUSDS workflow, I gate it, dry-run it, then KeeperHub runs that exact graph.

Show the recorded run id and Etherscan hash already at the top of the page.

**0:12–0:28 — compose**
Type: `approve 0 USDS for the sUSDS vault`
Click **Policy check**. Allow. Action `sky/approve-usds`, chain 1, amount 0.

**0:28–0:48 — dry-run**
Click **Dry-run**. No funds move. `status: simulated`, `wouldRevert: false`, gas estimate visible.

**0:48–1:10 — execute**
Click **Execute**. Paste `kh_` only if this take is live; otherwise cut to the already-mined run.

Show:
- KeeperHub execution `r7grdajtci7hf757zd9xr`
- Tx `0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04` on Etherscan (USDS Approval)

**1:10–1:25 — failure path**
Prompt: `deposit spare USDS above 100 into sUSDS`
Policy reject: amount 100 exceeds cap 10 USDS. Audit row `reject`. Optionally flip `KILL_SWITCH` and show execute blocked.

**1:25–1:30 — close**
Point at [github.com/Kohap/keeperhub-sky-exec](https://github.com/Kohap/keeperhub-sky-exec), run URL, explorer hash. Stop.

Capture in-repo: [`docs/demo-90s.mp4`](demo-90s.mp4). Re-record with `node scripts/record-90s.mjs` while `npm run dev` is on :8080.

## Before recording — GitHub

DoraHacks needs that public source URL live. Create the empty repo, then push:

1. [Create `Kohap/keeperhub-sky-exec` (public, no README)](https://github.com/new?name=keeperhub-sky-exec&visibility=public)
2. `bash scripts/publish-github.sh`

Full create + push commands: README § GitHub.
