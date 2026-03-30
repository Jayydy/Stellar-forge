# Implementation Plan: Cargo.lock Version Control

## Overview

Three surgical changes: verify `.gitignore` has no suppressing rule, generate and commit `contracts/Cargo.lock`, and add `--locked` to the CI `cargo build` step.

## Tasks

- [x] 1. Verify .gitignore does not suppress Cargo.lock
  - Inspect `.gitignore` and confirm no pattern matches `Cargo.lock` files under `contracts/`
  - If a suppressing rule exists, remove it
  - _Requirements: 1.1_

  - [ ]* 1.1 Write shell-level check for gitignore property
    - **Property 2: .gitignore does not suppress Cargo.lock**
    - Assert `git check-ignore -v contracts/Cargo.lock` exits non-zero (file is NOT ignored)
    - **Validates: Requirements 1.1**

- [x] 2. Generate and commit contracts/Cargo.lock
  - Run `cargo generate-lockfile --manifest-path contracts/Cargo.toml` (or `cargo check`) inside the `contracts/` workspace to produce `contracts/Cargo.lock`
  - Ensure the file is staged and committed to the repository
  - _Requirements: 1.2, 1.3_

  - [ ]* 2.1 Write shell-level check for lock file presence property
    - **Property 1: Cargo.lock is present and tracked**
    - Assert `git ls-files --error-unmatch contracts/Cargo.lock` succeeds
    - **Validates: Requirements 1.2, 1.3**

- [x] 3. Add --locked flag to CI WASM build step
  - In `.github/workflows/wasm-build.yml`, update the `Build wasm` step from:
    `cargo build --target wasm32-unknown-unknown --release --manifest-path contracts/token-factory/Cargo.toml`
    to:
    `cargo build --locked --target wasm32-unknown-unknown --release --manifest-path contracts/token-factory/Cargo.toml`
  - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 3.1 Write shell-level check for --locked flag property
    - **Property 3: CI build uses --locked flag**
    - Assert that `.github/workflows/wasm-build.yml` contains the string `--locked`
    - **Validates: Requirements 2.1**

  - [ ]* 3.2 Write shell-level check for CI failure on missing/inconsistent Cargo.lock
    - **Property 4: CI fails on missing or inconsistent Cargo.lock**
    - Assert that removing `contracts/Cargo.lock` and running `cargo build --locked ...` exits non-zero
    - **Validates: Requirements 2.2**

- [x] 4. Final checkpoint
  - Ensure all checks pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Properties 1–4 are configuration invariants enforced by Git and Cargo's `--locked` mechanism, not algorithmic properties requiring a PBT library
- Every push to `main` or PR targeting `main` will exercise Properties 3 and 4 automatically via the updated `wasm-build.yml`
