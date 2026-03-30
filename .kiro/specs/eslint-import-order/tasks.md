# Implementation Plan: ESLint Import Order Rule

## Overview

Install `eslint-plugin-import`, update the ESLint config, auto-fix existing violations, and add tests that verify the rule behaves correctly using the ESLint Node.js API.

## Tasks

- [ ] 1. Install eslint-plugin-import
  - Add `eslint-plugin-import@^2.29.0` to `devDependencies` in `frontend/package.json`
  - Run `npm install` inside the `frontend` directory to update `package-lock.json`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Configure the import/order rule in .eslintrc.cjs
  - [ ] 2.1 Add `'import'` to the `plugins` array in `frontend/.eslintrc.cjs`
    - _Requirements: 2.1_
  - [ ] 2.2 Add the `import/order` rule to the `rules` object with `'error'` severity, groups `['builtin', 'external', 'internal', 'parent', 'sibling', 'index']`, and `'newlines-between': 'always'`
    - _Requirements: 2.2, 2.3, 2.4_

- [ ] 3. Auto-fix existing import order violations
  - Run `npx eslint --fix . --ext ts,tsx` inside the `frontend` directory to reorder imports and insert missing blank lines between groups in all existing source files
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint — verify lint passes
  - Run `npm run lint` inside `frontend` and confirm it exits with code 0 and zero violations
  - _Requirements: 4.1, 4.2_

- [ ] 5. Write tests for ESLint config and rule behavior
  - [ ] 5.1 Write example tests that verify the ESLint config shape
    - Use vitest to read and parse `frontend/.eslintrc.cjs`
    - Assert `plugins` contains `'import'`
    - Assert `rules['import/order']` is `'error'` or an array whose first element is `'error'`
    - Assert the groups array equals `['builtin', 'external', 'internal', 'parent', 'sibling', 'index']`
    - Assert `newlines-between` is `'always'`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 5.2 Write property test for Property 1: out-of-order imports trigger a violation
    - Use fast-check to generate TypeScript import blocks with randomly shuffled import groups
    - Lint each generated file in-process using the ESLint Node.js API (`new ESLint({ fix: false })`)
    - Assert at least one `import/order` error is reported for every out-of-order input
    - Tag: `Feature: eslint-import-order, Property 1: out-of-order imports trigger a violation`
    - Minimum 100 iterations
    - _Requirements: 2.5, 4.3_

  - [ ]* 5.3 Write property test for Property 2: auto-fix eliminates all import/order violations
    - Use fast-check to generate TypeScript import blocks with randomly shuffled import groups
    - Apply fix in-process using the ESLint Node.js API (`new ESLint({ fix: true })`)
    - Lint the fixed output and assert zero `import/order` violations remain
    - Tag: `Feature: eslint-import-order, Property 2: auto-fix eliminates all import/order violations`
    - Minimum 100 iterations
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The ESLint Node.js API is used in property tests to avoid spawning child processes
- `npm run lint` uses `--max-warnings 0`, so the rule must be at `'error'` severity (not `'warn'`)
