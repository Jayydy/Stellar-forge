# Contract Fuzz Testing

This directory contains fuzz testing targets for the token factory contract using `libfuzzer` and the `arbitrary` crate. The fuzz targets are designed to test critical contract logic with randomly generated inputs to uncover edge cases and potential panics.

## Overview

Fuzz testing generates random inputs to discover edge cases and potential crashes in arithmetic and validation logic. The fuzz targets focus on three critical areas:

1. **create_token**: UTF-8 string validation, name/symbol/decimals parsing, fee arithmetic with random inputs
2. **fee_arithmetic**: Integer overflow checking in fee calculations, saturation arithmetic, boundary conditions
3. **burn**: Burn amount arithmetic, balance invariants, total supply calculations with random amounts

## Setup

### Prerequisites

- Rust toolchain (latest stable)
- `cargo-fuzz` (optional, for full libfuzzer integration):
  ```bash
  cargo install cargo-fuzz
  ```

### Building Fuzz Targets

```bash
cd contracts/token-factory/fuzz
cargo build --release
```

## Running Fuzz Tests

### Using cargo-fuzz

```bash
cd contracts/token-factory/fuzz
cargo fuzz run fuzz_create_token
```

### Using cargo directly

```bash
cd contracts/token-factory/fuzz
cargo +nightly run --release --bin fuzz_create_token
```

### Run with time and input limits

```bash
cargo +nightly run --release --bin fuzz_create_token -- -max_len=10000 -timeout=60
```

## Fuzz Targets

### fuzz_create_token

**Focus**: Input validation and string creation with random data

**Tests**:
- UTF-8 validation of random byte sequences
- String creation with various name/symbol values
- Decimals clamping (0-255)
- Saturation arithmetic on supply and fee values
- No panics on any valid input combination

**Success Criteria**: No panics on valid inputs; all assertions pass

**File**: `fuzz_targets/fuzz_create_token.rs`

### fuzz_fee_arithmetic

**Focus**: Fee calculation logic and overflow checking

**Tests**:
- Saturation arithmetic properties
- Base fee and metadata fee combinations
- Fee multiplication with operation counts
- Monotonic increase property (fees never decrease)
- No signed integer overflow

**Success Criteria**:
- No integer overflow panics
- All saturation operations complete safely
- Arithmetic properties maintained

**File**: `fuzz_targets/fuzz_fee_arithmetic.rs`

### fuzz_burn

**Focus**: Burn amount validation and balance calculations

**Tests**:
- Burn amount clamping and validation
- Sequential balance updates
- Full balance burns
- Negative amount handling
- Unsigned vs signed arithmetic edge cases

**Success Criteria**:
- No panics on any input value
- Balance invariants maintained (never negative)
- Saturation arithmetic works correctly

**File**: `fuzz_targets/fuzz_burn.rs`

## CI Integration

Fuzz tests are automatically run by GitHub Actions:

- **Trigger**: Pull requests modifying contract code
- **Schedule**: Daily at 2 AM UTC
- **Duration**: 60 seconds per target
- **Artifacts**: Crash artifacts uploaded on failure

See `.github/workflows/fuzz-testing.yml` for the workflow configuration.

## Interpreting Results

### Successful Run

```
...
artifact summary: 0 new, 0 unique
```

No artifacts = no crashes found ✓

### Crash Found

A crash will be saved to the work directory. The file contains the input that triggered the crash.

**Next Steps**:
1. Note the failing input sequence
2. Add regression test to contract test suite with the failing case
3. Fix the underlying bug
4. Verify crash is resolved in next fuzz run

## Known Limitations

1. **Simplified Targets**: Fuzz targets focus on pure Rust logic, not full contract interaction
2. **No WASM Execution**: Contract WASM execution is tested separately via integration tests
3. **Mock Environment**: Contract setup uses mocked Soroban environment

## Future Improvements

- [ ] Integration with continuous fuzzing service (OSS-Fuzz)
- [ ] More comprehensive contract interaction fuzzing
- [ ] Generational corpus for improved coverage
- [ ] Cross-contract fuzz testing
- [ ] Memory safety checking with sanitizers

## Resources

- [libfuzzer Documentation](https://llvm.org/docs/LibFuzzer/)
- [arbitrary Crate](https://docs.rs/arbitrary/)
- [cargo-fuzz Book](https://rust-fuzz.github.io/book/cargo-fuzz.html)
- [Fuzzing Rust Code](https://rust-lang.github.io/rustlings/fuzzing/)

