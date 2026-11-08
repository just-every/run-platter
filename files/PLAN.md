# sx-platter-timing-1-push-1 plan

1. Initialize the fleet Git identity, launcher credentials, cloud Git guard and preserved repository hooks.
2. Make a shallow blob-filtered clone of just-every/run-platter; fetch main and the source cloud branch with enough history to establish complete candidate ancestry.
3. Require the source branch head to equal 1e5ec5dc9db032ea1319d6bb65d506a93d38004b. Point cloud/sx-platter-timing-1-push-1 at that exact existing commit without creating or rewriting a product commit.
4. Confirm existing Verify run 42512950991 is completed/success on exactly that SHA. Do not rerun tests or dispatch/rerun workflows.
5. Audit every candidate commit, including side parents, for fleet author, committer and trailer policy; verify a clean worktree and unchanged contract/views.
6. Push the named product branch through cloud-push.py without force; verify the remote ref and unchanged product HEAD/index.
7. Write the complete public-safe report and actual receipts outside the product checkout; publish only selected files through cloud_evidence.py to evidence/sx-platter-timing-1-push-1.
8. Verify evidence transfer and product custody, then remove the disposable product clone as requested. Return the evidence line, sx inbox line and exact requested READY line.
