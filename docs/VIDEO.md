# Demo video

**DoraHacks form:** https://youtu.be/_jNeXn85wI0

Desk capture of Sky Exec. Empty key = fixture. Hash is the recorded KeeperHub execute, not a new broadcast.

**0:00 — recorded write**
Sky approve 0 USDS for the sUSDS vault on Ethereum. Not a deposit. Not a mock. Open Etherscan on `0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04`.

**0:31 — failure path**
Prompt: `deposit spare USDS above 100 into sUSDS`. **Policy check**. Reject. Amount 100 exceeds cap 10 USDS. Dry-run and Execute never run.

**0:56 — success path**
Prompt: `approve 0 USDS for the sUSDS vault`. **Policy check**. Allow. `sky/approve-usds` · 0 USDS.

**1:20 — dry-run**
**Dry-run**. `wouldRevert false` · gas 31454 · no chain write.

**1:35 — execute**
**Execute** with empty key. Replays the recorded hash. Last run labeled recorded. Fixture desk, live Sky actions, Ethereum mainnet.
