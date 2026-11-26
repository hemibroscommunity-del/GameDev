card: Z
branch: claude/plan-z-sitting-66
prs: 4 lines listed (6 PRs); this PR (tag 6279), the last line
state: ready

## Done (sitting 66, main 739eb6a0; the lighter review: no server/src, wire, money or login in any)
- Heads checked by ls-remote and the PRs: all as the orchestrator listed;
  no body closes another PR. #2354 (PAD) WITHDRAWN by the owner (21:5x,
  via the orchestrator): not listed; its findings are PAD's debts.
- Step 3 and a bug-in-behaviour read (four lanes): every PR its card's
  files and tag; no bug found. Two next jobs (debts CT, 66).
- Rehearsed main + #2360 + #2359(#2358) + #2357(#2355) + #2356 by hand
  (the generated tables met; resolved as written below): tree
  4ea0075f2e02e43257daa463fcabd87b3242365c. precheck 0 FAIL,
  switches-thrown --whole, claims-gain --whole, build, questline: PASS.
  heldsweep's sample red, main's own (main alone redder: 5 over, 3 fail).
- Phone, once each: mp-contextbuttons 26/27 (step 5, its known flake);
  mp-twobuttons on the tree 93/116 (main's 2b, 2c, 6a, 3h; step 7's
  placement guard, debts 65; a closing timeout seen on no helper's run).
  Helpers: main 106/115, #2356 105/117 (main's steps only), #2357's head
  105/119: main's steps and 7d both ways (it skips on main and on the tree).
## The list: merge in this order, "Create a merge commit"
1 #2360 (UI2 6401, docs; a834f593, base main). Its `test` green first.
2 #2359 landing #2358 (EN 6208+6206; a45dbeb2 on fb5f54f2): retarget
  #2359 to main first; one merge base. No server file.
3 #2357 landing #2355 (CT 6557+6556; 545761ec on 557de656): retarget
  #2357 to main first. DEPLOYS (server/test: latch, sight, bow-special).
4 #2356 (CT 6555; 358f9db8, base main) AFTER A MEND: once 3 is in it
  conflicts in tools/guards/lib/systems.mjs, docs/SYSTEMS.md and
  docs/plan/status/CT.md. Merge main; the input row's names end
  `lockFace|bowSpecialNow|aimMarks` (both tag notes); `node
  tools/guards/systems.test.mjs --write`; `switches.test.mjs --write`;
  CT.md: #2356's text; precheck; push. `git diff 4ea0075f HEAD` must
  show only those three files' wording: it lands with no new sitting. DEPLOYS.
5 Z (6279, a draft: mark it ready first).
## Held / To 67
- Nothing held. #2354 waits for PAD part 3's stack.
## Found
- debts.md: CT (66) 7d and bowSpecialMon; PAD (66) three; Found (66):
  a server/test file deploys the worker.
