# Token Factory Contract ABI

This document is the authoritative reference for integrating with the `TokenFactory` Soroban smart contract. It covers all public functions, data structures, error codes, and XDR encoding notes.

## Table of Contents

- [Data Structures](#data-structures)
- [Error Codes](#error-codes)
- [Functions](#functions)
  - [initialize](#initialize)
  - [create_token](#create_token)
  - [set_metadata](#set_metadata)
  - [mint_tokens](#mint_tokens)
  - [burn](#burn)
  - [set_burn_enabled](#set_burn_enabled)
  - [pause](#pause)
  - [unpause](#unpause)
  - [update_fees](#update_fees)
  - [upgrade](#upgrade)
  - [migrate](#migrate)
  - [transfer_admin](#transfer_admin)
  - [get_state](#get_state)
  - [get_base_fee](#get_base_fee)
  - [get_metadata_fee](#get_metadata_fee)
  - [get_token_info](#get_token_info)
  - [get_tokens_by_creator](#get_tokens_by_creator)
- [Events](#events)

---

## Data Structures

### `TokenInfo`

Stored per token at the time of creation. Retrieved via [`get_token_info`](#get_token_info).

| Field          | Type      | XDR Type        | Description                                                  |
|----------------|-----------|-----------------|--------------------------------------------------------------|
| `name`         | `String`  | `ScVal::String` | Human-readable token name. 1–32 characters.                  |
| `symbol`       | `String`  | `ScVal::String` | Token ticker symbol. 1–12 characters.                        |
| `decimals`     | `u32`     | `ScVal::U32`    | Number of decimal places (e.g. `7` for Stellar convention).  |
| `creator`      | `Address` | `ScVal::Address`| The account that called `create_token`.                      |
| `created_at`   | `u64`     | `ScVal::U64`    | Ledger timestamp at the time of creation (Unix seconds).     |
| `burn_enabled` | `bool`    | `ScVal::Bool`   | Whether token holders can burn this token. Defaults to `true`.|

### `FactoryState`

Global factory configuration. Retrieved via [`get_state`](#get_state).

| Field          | Type      | XDR Type        | Description                                                                 |
|----------------|-----------|-----------------|-----------------------------------------------------------------------------|
| `admin`        | `Address` | `ScVal::Address`| Account with admin privileges (pause, update fees, upgrade, transfer admin).|
| `paused`       | `bool`    | `ScVal::Bool`   | When `true`, `create_token`, `set_metadata`, and `mint_tokens` are blocked. |
| `locked`       | `bool`    | `ScVal::Bool`   | Reentrancy guard. `true` while `create_token` is executing.                 |
| `treasury`     | `Address` | `ScVal::Address`| Recipient of all fee payments.                                              |
| `fee_token`    | `Address` | `ScVal::Address`| SEP-41 token contract used for fee payments.                                |
| `base_fee`     | `i128`    | `ScVal::I128`   | Fee (in `fee_token` stroops) required to create a token or mint.            |
| `metadata_fee` | `i128`    | `ScVal::I128`   | Fee (in `fee_token` stroops) required to set metadata.                      |
| `token_count`  | `u32`     | `ScVal::U32`    | Total number of tokens created. Also the index of the last token.           |

---

## Error Codes

All functions return `Result<T, Error>`. On failure the XDR envelope contains `ScVal::Error` with a contract error code.

| Code | Variant                   | Trigger Condition                                                                                   |
|------|---------------------------|-----------------------------------------------------------------------------------------------------|
| 1    | `InsufficientFee`         | `fee_payment` is less than the required fee (`base_fee` or `metadata_fee`).                         |
| 2    | `Unauthorized`            | Caller is not the required admin or token creator for the operation.                                |
| 3    | `InvalidParameters`       | A parameter fails validation: empty/oversized name or symbol, zero/negative mint amount, or `transfer_admin` called with the same address. |
| 4    | `TokenNotFound`           | No token is registered at the given index or address in factory storage.                            |
| 5    | `MetadataAlreadySet`      | `set_metadata` was already called for this token address. Metadata is immutable once set.           |
| 6    | `AlreadyInitialized`      | `initialize` was called on a contract that has already been initialized.                            |
| 7    | `BurnAmountExceedsBalance`| The `amount` passed to `burn` is greater than the caller's current token balance.                   |
| 8    | `BurnNotEnabled`          | `burn` was called on a token whose `burn_enabled` flag is `false`.                                  |
| 9    | `InvalidBurnAmount`       | `amount` passed to `burn` is zero or negative.                                                      |
| 10   | `ContractPaused`          | `create_token`, `set_metadata`, or `mint_tokens` was called while the factory is paused.            |
| 11   | `Reentrancy`              | `create_token` was called while a previous `create_token` invocation is still executing.            |
| 12   | `ArithmeticOverflow`      | An integer overflow occurred (e.g. `token_count` reached `u32::MAX`).                              |
| 13   | `StateNotFound`           | Factory state storage key is missing — contract has not been initialized.                           |

---

## Functions

### `initialize`

One-time setup. Must be called before any other function. Fails if called again.

```
initialize(admin, treasury, fee_token, base_fee, metadata_fee) -> Result<(), Error>
```

**Parameters**

| Name           | Type      | XDR Type        | Description                                              |
|----------------|-----------|-----------------|----------------------------------------------------------|
| `admin`        | `Address` | `ScVal::Address`| Account granted admin privileges.                        |
| `treasury`     | `Address` | `ScVal::Address`| Account that receives all fee payments.                  |
| `fee_token`    | `Address` | `ScVal::Address`| SEP-41 token contract address used for fee payments.     |
| `base_fee`     | `i128`    | `ScVal::I128`   | Fee in `fee_token` stroops for `create_token`/`mint_tokens`. |
| `metadata_fee` | `i128`    | `ScVal::I128`   | Fee in `fee_token` stroops for `set_metadata`.           |

**Returns** `Ok(())` on success.

**Errors**

| Error                | Condition                          |
|----------------------|------------------------------------|
| `AlreadyInitialized` | Contract was already initialized.  |

**Event emitted:** `("init",)` → `(admin: Address)`

---

### `create_token`

Deploys a new SEP-41 token contract, initializes it, optionally mints an initial supply to the creator, and registers it with the factory. Requires `creator` authorization.

```
create_token(creator, salt, token_wasm_hash, name, symbol, decimals, initial_supply, fee_payment) -> Result<Address, Error>
```

**Parameters**

| Name              | Type         | XDR Type          | Description                                                                                   |
|-------------------|--------------|-------------------|-----------------------------------------------------------------------------------------------|
| `creator`         | `Address`    | `ScVal::Address`  | Account deploying the token. Must authorize this call.                                        |
| `salt`            | `BytesN<32>` | `ScVal::Bytes`    | 32-byte unique salt for deterministic deployment. Must be unique per `creator`.               |
| `token_wasm_hash` | `BytesN<32>` | `ScVal::Bytes`    | Hash of the SEP-41 token WASM to deploy.                                                      |
| `name`            | `String`     | `ScVal::String`   | Token name. Must be 1–32 characters.                                                          |
| `symbol`          | `String`     | `ScVal::String`   | Token symbol. Must be 1–12 characters.                                                        |
| `decimals`        | `u32`        | `ScVal::U32`      | Decimal places. Stellar convention is `7`.                                                    |
| `initial_supply`  | `i128`       | `ScVal::I128`     | Tokens to mint to `creator` on creation. Pass `0` to skip minting.                           |
| `fee_payment`     | `i128`       | `ScVal::I128`     | Amount of `fee_token` to transfer to treasury. Must be ≥ `base_fee`.                         |

**Returns** `Ok(Address)` — the address of the newly deployed token contract.

**Errors**

| Error               | Condition                                                    |
|---------------------|--------------------------------------------------------------|
| `ContractPaused`    | Factory is paused.                                           |
| `Reentrancy`        | A `create_token` call is already in progress.                |
| `InvalidParameters` | `name` is empty or > 32 chars, or `symbol` is empty or > 12 chars. |
| `InsufficientFee`   | `fee_payment < base_fee`.                                    |
| `ArithmeticOverflow`| `token_count` has reached `u32::MAX`.                        |

**Event emitted:** `("created",)` → `(token_address: Address, creator: Address, index: u32)`

> **Note:** The token address is deterministic: `deploy_with_address(creator, salt, token_wasm_hash)`. The same `creator` + `salt` pair always produces the same address. Reusing a salt will cause the deploy to fail at the Soroban level.

---

### `set_metadata`

Attaches an IPFS (or other) metadata URI to a token. Can only be called once per token. Only the token's original creator can call this.

```
set_metadata(token_address, admin, metadata_uri, fee_payment) -> Result<(), Error>
```

**Parameters**

| Name            | Type      | XDR Type        | Description                                                          |
|-----------------|-----------|-----------------|----------------------------------------------------------------------|
| `token_address` | `Address` | `ScVal::Address`| Address of the token contract to attach metadata to.                 |
| `admin`         | `Address` | `ScVal::Address`| Must be the original creator of the token. Must authorize this call. |
| `metadata_uri`  | `String`  | `ScVal::String` | URI pointing to token metadata (e.g. `ipfs://Qm...`).               |
| `fee_payment`   | `i128`    | `ScVal::I128`   | Amount of `fee_token` to transfer to treasury. Must be ≥ `metadata_fee`. |

**Returns** `Ok(())` on success.

**Errors**

| Error               | Condition                                          |
|---------------------|----------------------------------------------------|
| `ContractPaused`    | Factory is paused.                                 |
| `InsufficientFee`   | `fee_payment < metadata_fee`.                      |
| `TokenNotFound`     | `token_address` is not registered in the factory.  |
| `Unauthorized`      | `admin` is not the token's creator.                |
| `MetadataAlreadySet`| Metadata has already been set for this token.      |

**Event emitted:** `("meta",)` → `(token_address: Address, metadata_uri: String)`

---

### `mint_tokens`

Mints additional tokens to a recipient. Only the token's original creator can call this.

```
mint_tokens(token_address, admin, to, amount, fee_payment) -> Result<(), Error>
```

**Parameters**

| Name            | Type      | XDR Type        | Description                                                          |
|-----------------|-----------|-----------------|----------------------------------------------------------------------|
| `token_address` | `Address` | `ScVal::Address`| Address of the token contract to mint from.                          |
| `admin`         | `Address` | `ScVal::Address`| Must be the original creator of the token. Must authorize this call. |
| `to`            | `Address` | `ScVal::Address`| Recipient of the newly minted tokens.                                |
| `amount`        | `i128`    | `ScVal::I128`   | Number of tokens to mint. Must be > 0.                               |
| `fee_payment`   | `i128`    | `ScVal::I128`   | Amount of `fee_token` to transfer to treasury. Must be ≥ `base_fee`. |

**Returns** `Ok(())` on success.

**Errors**

| Error               | Condition                                         |
|---------------------|---------------------------------------------------|
| `ContractPaused`    | Factory is paused.                                |
| `InvalidParameters` | `amount` is zero or negative.                     |
| `InsufficientFee`   | `fee_payment < base_fee`.                         |
| `TokenNotFound`     | `token_address` is not registered in the factory. |
| `Unauthorized`      | `admin` is not the token's creator.               |

**Event emitted:** `("minted",)` → `(token_address: Address, to: Address, amount: i128)`

---

### `burn`

Burns tokens from the caller's balance, reducing total supply. Requires `from` authorization.

```
burn(token_address, from, amount) -> Result<(), Error>
```

**Parameters**

| Name            | Type      | XDR Type        | Description                                                    |
|-----------------|-----------|-----------------|----------------------------------------------------------------|
| `token_address` | `Address` | `ScVal::Address`| Address of the token contract to burn from.                    |
| `from`          | `Address` | `ScVal::Address`| Account whose tokens are burned. Must authorize this call.     |
| `amount`        | `i128`    | `ScVal::I128`   | Number of tokens to burn. Must be > 0 and ≤ `from`'s balance. |

**Returns** `Ok(())` on success.

**Errors**

| Error                     | Condition                                                                                   |
|---------------------------|---------------------------------------------------------------------------------------------|
| `InvalidBurnAmount`       | `amount` is zero or negative.                                                               |
| `BurnAmountExceedsBalance`| `amount` exceeds `from`'s current balance.                                                  |
| `TokenNotFound`           | Token is registered in the factory but its `TokenInfo` record is missing (storage corrupt). |
| `BurnNotEnabled`          | The token's `burn_enabled` flag is `false`.                                                 |

> **Note:** If `token_address` is not registered in the factory at all (no `idx` mapping), the burn proceeds without checking `burn_enabled`. Only tokens created through this factory have the `burn_enabled` guard enforced.

**Event emitted:** `("burned",)` → `(token_address: Address, from: Address, amount: i128)`

---

### `set_burn_enabled`

Enables or disables burning for a specific token. Only the token's original creator can call this.

```
set_burn_enabled(token_address, admin, enabled) -> Result<(), Error>
```

**Parameters**

| Name            | Type      | XDR Type        | Description                                                          |
|-----------------|-----------|-----------------|----------------------------------------------------------------------|
| `token_address` | `Address` | `ScVal::Address`| Address of the token contract.                                       |
| `admin`         | `Address` | `ScVal::Address`| Must be the original creator of the token. Must authorize this call. |
| `enabled`       | `bool`    | `ScVal::Bool`   | `true` to allow burning; `false` to prevent it.                      |

**Returns** `Ok(())` on success.

**Errors**

| Error           | Condition                                         |
|-----------------|---------------------------------------------------|
| `TokenNotFound` | `token_address` is not registered in the factory. |
| `Unauthorized`  | `admin` is not the token's creator.               |

---

### `pause`

Pauses the factory, blocking `create_token`, `set_metadata`, and `mint_tokens`. Only the admin can call this.

```
pause(admin) -> Result<(), Error>
```

**Parameters**

| Name    | Type      | XDR Type        | Description                                    |
|---------|-----------|-----------------|------------------------------------------------|
| `admin` | `Address` | `ScVal::Address`| Factory admin address. Must authorize this call.|

**Returns** `Ok(())` on success.

**Errors**

| Error          | Condition                          |
|----------------|------------------------------------|
| `Unauthorized` | `admin` is not the factory admin.  |

---

### `unpause`

Resumes normal factory operation. Only the admin can call this.

```
unpause(admin) -> Result<(), Error>
```

**Parameters**

| Name    | Type      | XDR Type        | Description                                    |
|---------|-----------|-----------------|------------------------------------------------|
| `admin` | `Address` | `ScVal::Address`| Factory admin address. Must authorize this call.|

**Returns** `Ok(())` on success.

**Errors**

| Error          | Condition                         |
|----------------|-----------------------------------|
| `Unauthorized` | `admin` is not the factory admin. |

---

### `update_fees`

Updates `base_fee`, `metadata_fee`, or both. Pass `None` for a fee to leave it unchanged. Only the admin can call this.

```
update_fees(admin, base_fee, metadata_fee) -> Result<(), Error>
```

**Parameters**

| Name           | Type           | XDR Type                    | Description                                                    |
|----------------|----------------|-----------------------------|----------------------------------------------------------------|
| `admin`        | `Address`      | `ScVal::Address`            | Factory admin address. Must authorize this call.               |
| `base_fee`     | `Option<i128>` | `ScVal::Void` or `ScVal::I128` | New base fee in `fee_token` stroops. `None` leaves it unchanged. |
| `metadata_fee` | `Option<i128>` | `ScVal::Void` or `ScVal::I128` | New metadata fee in `fee_token` stroops. `None` leaves it unchanged. |

**Returns** `Ok(())` on success.

**Errors**

| Error          | Condition                         |
|----------------|-----------------------------------|
| `Unauthorized` | `admin` is not the factory admin. |

**Event emitted:** `("fees",)` → `(base_fee: Option<i128>, metadata_fee: Option<i128>)`

---

### `upgrade`

Replaces the contract's WASM with a new version identified by `new_wasm_hash`. Contract state is fully preserved. Call [`migrate`](#migrate) immediately after if the new version requires data layout changes. Only the admin can call this.

```
upgrade(admin, new_wasm_hash) -> Result<(), Error>
```

**Parameters**

| Name            | Type         | XDR Type        | Description                                                                  |
|-----------------|--------------|-----------------|------------------------------------------------------------------------------|
| `admin`         | `Address`    | `ScVal::Address`| Factory admin address. Must authorize this call.                             |
| `new_wasm_hash` | `BytesN<32>` | `ScVal::Bytes`  | Hash of the new WASM, obtained from `stellar contract upload`.               |

**Returns** `Ok(())` on success.

**Errors**

| Error          | Condition                         |
|----------------|-----------------------------------|
| `Unauthorized` | `admin` is not the factory admin. |

---

### `migrate`

No-op stub for post-upgrade state migrations. Call this after [`upgrade`](#upgrade) when a new WASM version requires data layout changes. Currently performs no operations.

```
migrate(admin) -> Result<(), Error>
```

**Parameters**

| Name    | Type      | XDR Type        | Description                      |
|---------|-----------|-----------------|----------------------------------|
| `admin` | `Address` | `ScVal::Address`| Factory admin address (reserved).|

**Returns** `Ok(())` always.

---

### `transfer_admin`

Transfers admin privileges to a new address. The current admin must authorize this call.

```
transfer_admin(admin, new_admin) -> Result<(), Error>
```

**Parameters**

| Name        | Type      | XDR Type        | Description                                          |
|-------------|-----------|-----------------|------------------------------------------------------|
| `admin`     | `Address` | `ScVal::Address`| Current factory admin. Must authorize this call.     |
| `new_admin` | `Address` | `ScVal::Address`| Address to grant admin privileges to.                |

**Returns** `Ok(())` on success.

**Errors**

| Error               | Condition                                    |
|---------------------|----------------------------------------------|
| `Unauthorized`      | `admin` is not the current factory admin.    |
| `InvalidParameters` | `admin` and `new_admin` are the same address.|

---

### `get_state`

Returns the full factory state.

```
get_state() -> Result<FactoryState, Error>
```

**Returns** `Ok(FactoryState)`. See [FactoryState](#factorystate).

**Errors**

| Error          | Condition                                    |
|----------------|----------------------------------------------|
| `StateNotFound`| Contract has not been initialized.           |

---

### `get_base_fee`

Returns the current fee required to create a token or mint.

```
get_base_fee() -> Result<i128, Error>
```

**Returns** `Ok(i128)` — fee in `fee_token` stroops.

**Errors**

| Error          | Condition                          |
|----------------|------------------------------------|
| `StateNotFound`| Contract has not been initialized. |

---

### `get_metadata_fee`

Returns the current fee required to set token metadata.

```
get_metadata_fee() -> Result<i128, Error>
```

**Returns** `Ok(i128)` — fee in `fee_token` stroops.

**Errors**

| Error          | Condition                          |
|----------------|------------------------------------|
| `StateNotFound`| Contract has not been initialized. |

---

### `get_token_info`

Returns the `TokenInfo` record for a token by its factory index.

```
get_token_info(index) -> Result<TokenInfo, Error>
```

**Parameters**

| Name    | Type  | XDR Type     | Description                                                    |
|---------|-------|--------------|----------------------------------------------------------------|
| `index` | `u32` | `ScVal::U32` | 1-based token index (first token is `1`, last is `token_count`). |

**Returns** `Ok(TokenInfo)`. See [TokenInfo](#tokeninfo).

**Errors**

| Error           | Condition                                    |
|-----------------|----------------------------------------------|
| `TokenNotFound` | No token exists at the given index.          |

---

### `get_tokens_by_creator`

Returns the list of factory token indices created by a given address.

```
get_tokens_by_creator(creator) -> Vec<u32>
```

**Parameters**

| Name      | Type      | XDR Type        | Description                    |
|-----------|-----------|-----------------|--------------------------------|
| `creator` | `Address` | `ScVal::Address`| Address to look up tokens for. |

**Returns** `Vec<u32>` — list of token indices in creation order. Returns an empty list if the address has created no tokens. This function does not return a `Result`; it never fails.

---

## Events

All events are published via `env.events().publish(topics, data)`.

| Topic        | Data                                                    | Emitted By        |
|--------------|---------------------------------------------------------|-------------------|
| `"init"`     | `(admin: Address)`                                      | `initialize`      |
| `"created"`  | `(token_address: Address, creator: Address, index: u32)`| `create_token`    |
| `"meta"`     | `(token_address: Address, metadata_uri: String)`        | `set_metadata`    |
| `"minted"`   | `(token_address: Address, to: Address, amount: i128)`   | `mint_tokens`     |
| `"burned"`   | `(token_address: Address, from: Address, amount: i128)` | `burn`            |
| `"fees"`     | `(base_fee: Option<i128>, metadata_fee: Option<i128>)`  | `update_fees`     |

Events can be queried from Horizon using the contract ID and topic filters. Topic symbols are encoded as `ScVal::Symbol` in XDR.
