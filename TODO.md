# TODO: Fix Token Factory Issue #543

## Steps:

- [ ] 1. Checkout new branch `blackboxai/fix-token-factory-543`
- [ ] 2. Edit contracts/token-factory/src/lib.rs: 
  - Add `token_wasm_hash: BytesN<32>` to `FactoryState`
  - Add `token_wasm_hash` param to `initialize`
  - Remove `token_wasm_hash` param from `create_token`, use `state.token_wasm_hash`
  - Update `BatchTokenParams` remove `token_wasm_hash`
  - Update `deploy_one` use `state.token_wasm_hash`
- [ ] 3. Edit contracts/token-factory/src/test.rs:
  - Update `Setup::new()` call `initialize` with dummy hash
  - Remove `&s.dummy_hash()` from all `create_token` calls
  - Update `batch_param` remove `token_wasm_hash`
  - Update batch tests params
- [ ] 4. Verify compilation: `cd contracts/token-factory && cargo build --target wasm32-unknown-unknown --release`
- [ ] 5. Commit changes: `git add . && git commit -m "Fix #543: Store token wasm hash in state, simplify create_token"`
- [ ] 6. Create PR: `gh pr create --title "Fix #543: Fix Token Factory deploy_token API and fee transfer" --body "..."`

Progress marked as completed when checked.
