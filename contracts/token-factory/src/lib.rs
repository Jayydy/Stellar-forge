#![no_std]
#![cfg_attr(not(test), deny(clippy::unwrap_used))]
#![cfg_attr(not(test), deny(clippy::expect_used))]
#![cfg_attr(not(test), deny(clippy::panic))]
#![cfg_attr(not(test), deny(clippy::arithmetic_side_effects))]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractclient,
    Address, BytesN, Env, Map, String, Vec, vec, symbol_short, token,
};

/// Minimal interface for initializing a deployed SEP-41 token contract.
#[contractclient(name = "TokenInitClient")]
pub trait TokenInit {
    fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String);
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    /// Global factory state
    State,
    /// Token info stored by index
    TokenInfo(u32),
    /// List of token indices created by a specific creator
    CreatorTokens(Address),
    /// Reverse mapping: token address -> index
    TokenIndex(Address),
    /// Metadata URI for a token
    Metadata(Address),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BatchTokenParams {
    pub salt: BytesN<32>,
    pub token_wasm_hash: BytesN<32>,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub initial_supply: i128,
    pub max_supply: Option<i128>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub creator: Address,
    pub created_at: u64,
    /// Whether burning is enabled for this token. Defaults to true.
    pub burn_enabled: bool,
    /// Optional maximum supply cap. `None` means unlimited minting.
    pub max_supply: Option<i128>,
}

#[contracttype]
#[derive(Clone)]
pub struct FactoryState {
    pub admin: Address,
    pub paused: bool,
    /// Reentrancy guard flag. Set to `true` at the start of `create_token`
    /// and cleared to `false` before returning (success or error).
    pub locked: bool,
    pub treasury: Address,
    pub fee_token: Address,
    pub base_fee: i128,
    pub metadata_fee: i128,
    pub token_count: u32,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    InsufficientFee = 1,
    Unauthorized = 2,
    InvalidParameters = 3,
    TokenNotFound = 4,
    MetadataAlreadySet = 5,
    AlreadyInitialized = 6,
    BurnAmountExceedsBalance = 7,
    BurnNotEnabled = 8,
    InvalidBurnAmount = 9,
    ContractPaused = 10,
    /// Soroban's execution model is single-threaded and atomic per transaction,
    /// which eliminates classic EVM-style reentrancy. However, `create_token`
    /// performs cross-contract calls (deploy + initialize + mint) that could
    /// theoretically be chained in unexpected ways via a malicious token
    /// contract. This guard adds defense-in-depth: if `create_token` is somehow
    /// re-entered before the first invocation completes, the second call is
    /// rejected immediately rather than corrupting factory state.
    Reentrancy = 11,
    /// Integer overflow error during arithmetic operations (fee calculation, token count, etc.)
    ArithmeticOverflow = 12,
    /// Storage read failed - contract state not found
    StateNotFound = 13,
    /// Invalid token parameters (e.g. negative supply, invalid name/symbol)
    InvalidTokenParams = 14,
    /// Invalid decimals value (must be 0-18 inclusive)
    InvalidDecimals = 15,
}

#[contract]
pub struct TokenFactory;

// ── TTL constants ─────────────────────────────────────────────────────────────
//
// Soroban persistent storage entries expire after their TTL (time-to-live)
// lapses. We extend TTL on every write so that active contract state never
// becomes inaccessible under normal usage patterns.
//
// Ledger cadence on Stellar is ~5 seconds, so:
//   MIN_TTL = 100_000 ledgers ≈ ~6 days   (minimum acceptable TTL before extension)
//   MAX_TTL = 535_000 ledgers ≈ ~31 days  (target TTL after extension)
//
// These values align with Soroban's recommended persistent-storage strategy:
// extend whenever the remaining TTL drops below MIN_TTL, pushing it out to MAX_TTL.
const MIN_TTL: u32 = 100_000;
const MAX_TTL: u32 = 535_000;

#[contractimpl]
impl TokenFactory {
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        fee_token: Address,
        base_fee: i128,
        metadata_fee: i128,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::State) {
            return Err(Error::AlreadyInitialized);
        }
        let state = FactoryState {
            admin: admin.clone(),
            paused: false,
            locked: false,
            treasury,
            fee_token,
            base_fee,
            metadata_fee,
            token_count: 0,
        };
        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
        env.events().publish((symbol_short!("init"),), (admin,));
        Ok(())
    }

    fn load_state(env: &Env) -> Result<FactoryState, Error> {
        env.storage().instance().get(&DataKey::State).ok_or(Error::StateNotFound)
    }

    fn save_state(env: &Env, state: &FactoryState) {
        env.storage().instance().set(&DataKey::State, state);
        // Extend instance TTL on every state write so the contract never expires.
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
    }

    /// Distribute `amount` of `fee_token` from `payer` according to the stored
    /// fee split. Falls back to a single transfer to `treasury` when no split
    /// is configured. Basis-point rounding is truncated per recipient; any
    /// remainder (due to integer division) also goes to treasury.
    fn distribute_fee(env: &Env, state: &FactoryState, payer: &Address, amount: i128) -> Result<(), Error> {
        let fee_client = token::TokenClient::new(env, &state.fee_token);
        let split_key = symbol_short!("split");

        if let Some(splits) = env.storage().instance().get::<_, Map<Address, u32>>(&split_key) {
            let mut distributed: i128 = 0;
            // Pay every recipient their proportional share (truncated).
            for (recipient, bps) in splits.iter() {
                // amount * bps / 10_000 — use i128 arithmetic; bps <= 10_000
                let share = amount
                    .checked_mul(bps as i128).ok_or(Error::ArithmeticOverflow)?
                    / 10_000;
                if share > 0 {
                    fee_client.transfer(payer, &recipient, &share);
                }
                distributed = distributed.checked_add(share).ok_or(Error::ArithmeticOverflow)?;
            }
            // Send any remainder (rounding dust) to treasury.
            let remainder = amount.checked_sub(distributed).ok_or(Error::ArithmeticOverflow)?;
            if remainder > 0 {
                fee_client.transfer(payer, &state.treasury, &remainder);
            }
        } else {
            fee_client.transfer(payer, &state.treasury, &amount);
        }
        Ok(())
    }

    /// Extend TTL for all per-token storage keys associated with `token_address`
    /// and `index`. Called after any write that touches token-specific entries.
    fn extend_token_ttl(env: &Env, token_address: &Address, index: u32) {
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
        let _ = (token_address, index); // keys live in instance storage; one call covers all
    }

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if Self::load_state(env)?.paused {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }

    /// Deploy a new token contract from `token_wasm_hash`, initialize it,
    /// and register it with the factory. `salt` must be unique per creator.
    ///
    /// # Parameters
    /// - `decimals`: Number of decimal places for the token (0-18 inclusive).
    ///   Stellar conventionally uses 7 decimals. Values outside 0-18 are rejected.
    pub fn create_token(
        env: Env,
        creator: Address,
        salt: BytesN<32>,
        token_wasm_hash: BytesN<32>,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: u128,
        fee_payment: i128,
    ) -> Result<Address, Error> {
        Self::require_not_paused(&env)?;
        creator.require_auth();

        let mut state = Self::load_state(&env)?;

        // Reentrancy guard: reject if a create_token call is already in progress.
        if state.locked {
            return Err(Error::Reentrancy);
        }
        state.locked = true;
        Self::save_state(&env, &state);

        let result = Self::create_token_inner(&env, creator, salt, token_wasm_hash, name, symbol, decimals, initial_supply, fee_payment, &mut state);

        // Always release the lock, regardless of success or error.
        state.locked = false;
        Self::save_state(&env, &state);

        result
    }

    fn create_token_inner(
        env: &Env,
        creator: Address,
        salt: BytesN<32>,
        token_wasm_hash: BytesN<32>,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: u128,
        fee_payment: i128,
        state: &mut FactoryState,
    ) -> Result<Address, Error> {
        // Validate token name: non-empty and at most 32 characters
        if name.len() == 0 || name.len() > 32 {
            return Err(Error::InvalidTokenParams);
        }

        // Validate token symbol: non-empty and at most 12 characters
        if symbol.len() == 0 || symbol.len() > 12 {
            return Err(Error::InvalidTokenParams);
        }

        // Validate decimals: must be between 0 and 18 inclusive
        if decimals > 18 {
            return Err(Error::InvalidDecimals);
        }

        if fee_payment < state.base_fee {
            return Err(Error::InsufficientFee);
        }

        // Fail fast if token count would overflow
        state.token_count.checked_add(1).ok_or(Error::ArithmeticOverflow)?;

        // Transfer fee to treasury using the stored fee token
        Self::distribute_fee(env, state, &creator, fee_payment)?;

        // Deploy token contract deterministically from creator + salt
        let token_address = env
            .deployer()
            .with_address(creator.clone(), salt)
            .deploy(token_wasm_hash);

        // Initialize the deployed token
        TokenInitClient::new(env, &token_address).initialize(
            &creator,
            &decimals,
            &name,
            &symbol,
        );

        // Mint initial supply to creator if requested
        if initial_supply > 0 {
            token::StellarAssetClient::new(env, &token_address).mint(
                &creator,
                &(initial_supply as i128),
            );
        }

        // Increment token_count (already checked for overflow above)
        state.token_count = state.token_count.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
        let index = state.token_count;

        env.storage().instance().set(&DataKey::TokenInfo(index), &TokenInfo {
        let token_name = name.clone();
        let token_symbol = symbol.clone();
        env.storage().instance().set(&index, &TokenInfo {
            name,
            symbol,
            decimals,
            creator: creator.clone(),
            created_at: env.ledger().timestamp(),
            burn_enabled: true,
            max_supply: None,
        });

        let creator_key = DataKey::CreatorTokens(creator.clone());
        let mut list: Vec<u32> = env
            .storage()
            .instance()
            .get(&creator_key)
            .unwrap_or_else(|| vec![env]);
        list.push_back(index);
        env.storage().instance().set(&creator_key, &list);

        // Store reverse mapping: token_address -> index (for burn_enabled lookup)
        env.storage().instance().set(&DataKey::TokenIndex(token_address.clone()), &index);
        // Store direct mapping: token_address -> creator (for security checks)
        env.storage().instance().set(&(&token_address, symbol_short!("owner")), &creator);

        // Store reverse mapping: token_address -> index (for other lookups if needed)
        env.storage().instance().set(&(&token_address, symbol_short!("idx")), &index);

        // Extend TTL for all token-related storage entries written above.
        Self::extend_token_ttl(env, &token_address, index);

        env.events()
            .publish((symbol_short!("created"),), (token_address.clone(), creator, token_name, token_symbol));
        Ok(token_address)
    }

    /// Validate a single batch entry's params without deploying anything.
    fn validate_batch_params(p: &BatchTokenParams) -> Result<(), Error> {
        if p.name.len() == 0 || p.name.len() > 32 {
            return Err(Error::InvalidParameters);
        }
        if p.symbol.len() == 0 || p.symbol.len() > 12 {
            return Err(Error::InvalidParameters);
        }
        if let Some(cap) = p.max_supply {
            if cap <= 0 || p.initial_supply > cap {
                return Err(Error::InvalidParameters);
            }
        }
        Ok(())
    }

    /// Deploy and register one token from a `BatchTokenParams` entry.
    /// Assumes params are already validated and fee already paid.
    fn deploy_one(
        env: &Env,
        creator: &Address,
        p: BatchTokenParams,
        state: &mut FactoryState,
    ) -> Result<Address, Error> {
        let token_address = env
            .deployer()
            .with_address(creator.clone(), p.salt)
            .deploy(p.token_wasm_hash);

        TokenInitClient::new(env, &token_address).initialize(
            creator,
            &p.decimals,
            &p.name,
            &p.symbol,
        );

        if p.initial_supply > 0 {
            token::StellarAssetClient::new(env, &token_address).mint(creator, &p.initial_supply);
        }

        let new_count = state.token_count.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
        state.token_count = new_count;
        let index = state.token_count;

        let token_name = p.name.clone();
        let token_symbol = p.symbol.clone();
        env.storage().instance().set(&index, &TokenInfo {
            name: p.name,
            symbol: p.symbol,
            decimals: p.decimals,
            creator: creator.clone(),
            created_at: env.ledger().timestamp(),
            burn_enabled: true,
            max_supply: p.max_supply,
        });

        let creator_key = (symbol_short!("crtoks"), creator.clone());
        let mut list: Vec<u32> = env
            .storage()
            .instance()
            .get(&creator_key)
            .unwrap_or_else(|| vec![env]);
        list.push_back(index);
        env.storage().instance().set(&creator_key, &list);

        env.storage().instance().set(&(&token_address, symbol_short!("idx")), &index);
        Self::extend_token_ttl(env, &token_address, index);

        env.events()
            .publish((symbol_short!("created"),), (token_address.clone(), creator.clone(), token_name, token_symbol));
        Ok(token_address)
    }

    /// Create multiple tokens in a single transaction.
    /// All params are validated before any token is deployed or fees are charged.
    /// Total fee = base_fee * tokens.len().
    pub fn create_tokens_batch(
        env: Env,
        creator: Address,
        tokens: Vec<BatchTokenParams>,
        fee_payment: i128,
    ) -> Result<Vec<Address>, Error> {
        Self::require_not_paused(&env)?;
        creator.require_auth();

        let mut state = Self::load_state(&env)?;

        if state.locked {
            return Err(Error::Reentrancy);
        }

        let count = tokens.len() as i128;
        if count == 0 {
            return Err(Error::InvalidParameters);
        }

        // Validate all params upfront — no deployment happens until this passes.
        for p in tokens.iter() {
            Self::validate_batch_params(&p)?;
        }

        // Total fee = base_fee * number of tokens
        let total_fee = state.base_fee.checked_mul(count).ok_or(Error::ArithmeticOverflow)?;
        if fee_payment < total_fee {
            return Err(Error::InsufficientFee);
        }

        // Charge the full fee once before any deployment.
        state.locked = true;
        Self::save_state(&env, &state);

        let mut addresses: Vec<Address> = vec![&env];
        let mut result: Result<(), Error> = Ok(());

        for p in tokens.into_iter() {
            match Self::deploy_one(&env, &creator, p, &mut state) {
                Ok(addr) => addresses.push_back(addr),
                Err(e) => { result = Err(e); break; }
            }
        }

        state.locked = false;

        if let Err(e) = result {
            Self::save_state(&env, &state);
            return Err(e);
        }

        Self::distribute_fee(&env, &state, &creator, fee_payment)?;
        Self::save_state(&env, &state);
        Ok(addresses)
    }

    pub fn set_metadata(
        env: Env,
        token_address: Address,
        admin: Address,
        metadata_uri: String,
        fee_payment: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        admin.require_auth();

        let state = Self::load_state(&env)?;

        if fee_payment < state.metadata_fee {
            return Err(Error::InsufficientFee);
        }

        // Fetch TokenInfo to verify creator authorization
        let index: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TokenIndex(token_address.clone()))
            .ok_or(Error::TokenNotFound)?;

        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo(index))
        // Verify admin is the token creator using direct mapping
        let creator: Address = env.storage().instance().get(&(&token_address, symbol_short!("owner")))
            .ok_or(Error::TokenNotFound)?;
        
        if creator != admin {
            return Err(Error::Unauthorized);
        }

        // Guard: prevent overwriting existing metadata
        if env.storage().instance().has(&DataKey::Metadata(token_address.clone())) {
            return Err(Error::MetadataAlreadySet);
        }

        Self::distribute_fee(&env, &state, &admin, fee_payment)?;

        env.storage()
            .instance()
            .set(&DataKey::Metadata(token_address.clone()), &metadata_uri);

        // Extend TTL so the metadata entry remains accessible.
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);

        env.events()
            .publish((symbol_short!("meta"),), (token_address, metadata_uri));
        Ok(())
    }

    pub fn mint_tokens(
        env: Env,
        token_address: Address,
        admin: Address,
        to: Address,
        amount: i128,
        fee_payment: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        admin.require_auth();

        // Validate mint amount is positive
        if amount <= 0 {
            return Err(Error::InvalidParameters);
        }

        let state = Self::load_state(&env)?;

        if fee_payment < state.base_fee {
            return Err(Error::InsufficientFee);
        }

        // Fetch TokenInfo to verify creator authorization
        let index: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TokenIndex(token_address.clone()))
            .ok_or(Error::TokenNotFound)?;

        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo(index))
        // Verify admin is the token creator using direct mapping
        let creator: Address = env.storage().instance().get(&(&token_address, symbol_short!("owner")))
            .ok_or(Error::TokenNotFound)?;
        
        if creator != admin {
            return Err(Error::Unauthorized);
        }

        // Enforce max supply cap if set
        if let Some(cap) = token_info.max_supply {
            let current = token::TokenClient::new(&env, &token_address).total_supply();
            let new_total = current.checked_add(amount).ok_or(Error::ArithmeticOverflow)?;
            if new_total > cap {
                return Err(Error::MaxSupplyExceeded);
            }
        }

        Self::distribute_fee(&env, &state, &admin, fee_payment)?;

        token::StellarAssetClient::new(&env, &token_address).mint(&to, &amount);

        env.events()
            .publish((symbol_short!("minted"),), (token_address, to, amount));
        Ok(())
    }

    pub fn burn(
        env: Env,
        token_address: Address,
        from: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidBurnAmount);
        }

        let token = token::TokenClient::new(&env, &token_address);
        let balance = token.balance(&from);
        if amount > balance {
            return Err(Error::BurnAmountExceedsBalance);
        }

        // Check burn_enabled via reverse index lookup before burning
        if let Some(index) = env.storage().instance().get::<_, u32>(&DataKey::TokenIndex(token_address.clone())) {
            let info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo(index)).ok_or(Error::TokenNotFound)?;
            if !info.burn_enabled {
                return Err(Error::BurnNotEnabled);
            }
        }

        token.burn(&from, &amount);

        env.events()
            .publish((symbol_short!("burned"),), (token_address, from, amount));
        Ok(())
    }

    /// Enable or disable burning for a token. Only the token creator can call this.
    pub fn set_burn_enabled(
        env: Env,
        token_address: Address,
        admin: Address,
        enabled: bool,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Verify admin is the token creator using direct mapping
        let creator: Address = env.storage().instance().get(&(&token_address, symbol_short!("owner")))
            .ok_or(Error::TokenNotFound)?;
        
        if creator != admin {
            return Err(Error::Unauthorized);
        }

        let idx_key = (&token_address, symbol_short!("idx"));
        let index: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TokenIndex(token_address.clone()))
            .ok_or(Error::TokenNotFound)?;

        let mut info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo(index)).ok_or(Error::TokenNotFound)?;

        info.burn_enabled = enabled;
        env.storage().instance().set(&DataKey::TokenInfo(index), &info);
        // Extend TTL so the updated token info remains accessible.
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
        Ok(())
    }

    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env)?;
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        state.paused = true;
        Self::save_state(&env, &state);
        Ok(())
    }

    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env)?;
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        state.paused = false;
        Self::save_state(&env, &state);
        Ok(())
    }

    /// Set the fee distribution split. `splits` maps recipient addresses to
    /// basis points (1 bp = 0.01%). The values must sum to exactly 10_000.
    /// Passing an empty map clears the split (all fees revert to treasury).
    /// Only the admin can call this.
    pub fn set_fee_split(env: Env, admin: Address, splits: Map<Address, u32>) -> Result<(), Error> {
        admin.require_auth();
        let state = Self::load_state(&env)?;
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }

        let split_key = symbol_short!("split");

        if splits.is_empty() {
            env.storage().instance().remove(&split_key);
            return Ok(());
        }

        // Validate that basis points sum to exactly 10_000
        let mut total: u32 = 0;
        for (_, bps) in splits.iter() {
            total = total.checked_add(bps).ok_or(Error::ArithmeticOverflow)?;
        }
        if total != 10_000 {
            return Err(Error::InvalidFeeSplit);
        }

        env.storage().instance().set(&split_key, &splits);
        env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
        Ok(())
    }

    pub fn get_fee_split(env: Env) -> Map<Address, u32> {
        env.storage()
            .instance()
            .get(&symbol_short!("split"))
            .unwrap_or_else(|| Map::new(&env))
    }

    pub fn update_fees(
        env: Env,
        admin: Address,
        base_fee: Option<i128>,
        metadata_fee: Option<i128>,
    ) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env)?;
        if admin != state.admin {
            return Err(Error::Unauthorized);
        }
        if let Some(fee) = base_fee {
            state.base_fee = fee;
        }
        if let Some(fee) = metadata_fee {
            state.metadata_fee = fee;
        }
        Self::save_state(&env, &state);
        env.events()
            .publish((symbol_short!("fees"),), (base_fee, metadata_fee));
        Ok(())
    }

    /// Upgrade the contract WASM to a new hash. Only the admin can call this.
    /// Contract state is preserved; call `migrate()` afterwards if state layout changes.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();
        let state = Self::load_state(&env)?;
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Stub for future state migrations after an upgrade.
    /// Extend this function when a WASM upgrade requires data layout changes.
    pub fn migrate(_env: Env, _admin: Address) -> Result<(), Error> {
        // No-op until a migration is required.
        Ok(())
    }

    pub fn transfer_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut state = Self::load_state(&env)?;
        if state.admin != admin {
            return Err(Error::Unauthorized);
        }
        if admin == new_admin {
            return Err(Error::InvalidParameters);
        }
        state.admin = new_admin;
        Self::save_state(&env, &state);
        Ok(())
    }

    pub fn update_admin(env: Env, current_admin: Address, new_admin: Address) -> Result<(), Error> {
        current_admin.require_auth();
        let mut state = Self::load_state(&env)?;
        if state.admin != current_admin {
            return Err(Error::Unauthorized);
        }
        if current_admin == new_admin {
            return Err(Error::InvalidParameters);
        }
        state.admin = new_admin.clone();
        Self::save_state(&env, &state);
        env.events()
            .publish((symbol_short!("adm_upd"),), (current_admin, new_admin));
        Ok(())
    }

    pub fn get_state(env: Env) -> Result<FactoryState, Error> {
        Self::load_state(&env)
    }

    pub fn get_base_fee(env: Env) -> Result<i128, Error> {
        Ok(Self::load_state(&env)?.base_fee)
    }

    pub fn get_metadata_fee(env: Env) -> Result<i128, Error> {
        Ok(Self::load_state(&env)?.metadata_fee)
    }

    pub fn get_token_info(env: Env, index: u32) -> Result<TokenInfo, Error> {
        env.storage()
            .instance()
            .get(&DataKey::TokenInfo(index))
            .ok_or(Error::TokenNotFound)
    }

    pub fn get_tokens_by_creator(env: Env, creator: Address) -> Vec<u32> {
        let key = DataKey::CreatorTokens(creator);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| vec![&env])
    }
}

#[cfg(test)]
mod test;
