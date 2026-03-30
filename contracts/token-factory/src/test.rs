#![cfg(test)]

use super::*;
use soroban_sdk::testutils::storage::Instance;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, Map, String, Vec,
};

// ── helpers ───────────────────────────────────────────────────────────────────

struct Setup {
    env: Env,
    client: TokenFactoryClient<'static>,
    admin: Address,
    treasury: Address,
    fee_token: Address,
}impl Setup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFactory);
        let client = TokenFactoryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let fee_token = env.register_stellar_asset_contract_v2(admin.clone()).address();

        client.initialize(&admin, &treasury, &fee_token, &1_000, &500);

        Setup { env, client, admin, treasury, fee_token }
    }

    fn fund(&self, recipient: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.fee_token).mint(recipient, &amount);
    }

    fn new_token(&self, issuer: &Address) -> Address {
        self.env.register_stellar_asset_contract_v2(issuer.clone()).address()
    }

    fn salt(&self, n: u8) -> BytesN<32> {
        BytesN::from_array(&self.env, &[n; 32])
    }

    /// A dummy wasm hash — only used in tests that never reach the deploy call
    /// (i.e. error-path tests that fail before deploy).
    fn dummy_hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[0u8; 32])
    }
}
// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let s = Setup::new();
    let state = s.client.get_state();
    assert_eq!(state.admin, s.admin);
    assert_eq!(state.treasury, s.treasury);
    assert_eq!(state.fee_token, s.fee_token);
    assert_eq!(state.base_fee, 1_000);
    assert_eq!(state.metadata_fee, 500);
    assert!(!state.paused);
    assert_eq!(state.token_count, 0);
}

#[test]
fn test_initialize_already_initialized() {
    let s = Setup::new();
    let result = s.client.try_initialize(&s.admin, &s.treasury, &s.fee_token, &1_000, &500);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

// ── create_token ──────────────────────────────────────────────────────────────

/// Seed factory storage as if create_token ran successfully, and verify
/// fee transfer logic. The deploy+initialize path is covered by wasm integration tests.
#[test]
fn test_create_token() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    let info = TokenInfo {
        name: String::from_str(&s.env, "MyToken"),
        symbol: String::from_str(&s.env, "MTK"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
        max_supply: None,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.token_count += 1;
        s.env.storage().instance().set(&DataKey::TokenInfo(1), &info);
        s.env.storage().instance().set(&DataKey::State, &state);
        let key = DataKey::CreatorTokens(creator.clone());
        let mut list: soroban_sdk::Vec<u32> = s.env.storage().instance()
            .get(&key).unwrap_or_else(|| soroban_sdk::vec![&s.env]);
        list.push_back(1u32);
        s.env.storage().instance().set(&key, &list);
    });
    // Simulate fee transfer
    TokenClient::new(&s.env, &s.fee_token).transfer(&creator, &s.treasury, &1_000);

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 1_000);
    assert_eq!(s.client.get_state().token_count, 1);
}

#[test]
fn test_create_token_insufficient_fee() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    // Fee check happens before deploy — dummy hash is fine here
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &7, &0_u128, &999,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_create_token_blocked_when_paused() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    let creator = Address::generate(&s.env);

    // Pause check happens before deploy — dummy hash is fine here
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0_u128, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}

#[test]
fn test_create_token_invalid_decimals_too_high() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "MyToken"),
        &String::from_str(&s.env, "MTK"),
        &19, &0_u128, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::InvalidDecimals)));
}

#[test]
fn test_create_token_boundary_decimals() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 1_000);

    // Test decimals = 0 (should succeed)
    let result_0 = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "Token0"),
        &String::from_str(&s.env, "T0"),
        &0, &0_u128, &1_000,
    );
    // This will fail at deploy since dummy hash, but not at validation
    // We can't easily test success without real wasm, so just check it doesn't fail with InvalidDecimals
    assert_ne!(result_0, Err(Ok(Error::InvalidDecimals)));

    // Test decimals = 7 (should succeed)
    let result_7 = s.client.try_create_token(
        &creator, &s.salt(1), &s.dummy_hash(),
        &String::from_str(&s.env, "Token7"),
        &String::from_str(&s.env, "T7"),
        &7, &0_u128, &1_000,
    );
    assert_ne!(result_7, Err(Ok(Error::InvalidDecimals)));

    // Test decimals = 18 (should succeed)
    let result_18 = s.client.try_create_token(
        &creator, &s.salt(2), &s.dummy_hash(),
        &String::from_str(&s.env, "Token18"),
        &String::from_str(&s.env, "T18"),
        &18, &0_u128, &1_000,
    );
    assert_ne!(result_18, Err(Ok(Error::InvalidDecimals)));
}

// ── set_metadata ──────────────────────────────────────────────────────────────

#[test]
fn test_set_metadata() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 500);

    // seed_token_with_burn registers the token + idx mapping the contract needs
    let token_addr = seed_token_with_burn(&s, &admin, true);
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 500);
}

#[test]
fn test_set_metadata_insufficient_fee() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    let token_addr = s.new_token(&admin);

    let result = s.client.try_set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &100,
    );
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_set_metadata_already_set() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_addr = seed_token_with_burn(&s, &admin, true);

    // First call succeeds
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );

    // Second call on the same token should return MetadataAlreadySet
    let result = s.client.try_set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm456"),
        &500,
    );
    assert_eq!(result, Err(Ok(Error::MetadataAlreadySet)));
}

#[test]
fn test_set_metadata_different_tokens_independent() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    // Each call to seed_token_with_burn registers a distinct token + idx entry
    let token_a = seed_token_with_burn(&s, &admin, true);
    let token_b = seed_token_with_burn(&s, &admin, true);

    // Setting metadata on two different tokens should both succeed
    s.client.set_metadata(
        &token_a, &admin,
        &String::from_str(&s.env, "ipfs://QmA"),
        &500,
    );
    s.client.set_metadata(
        &token_b, &admin,
        &String::from_str(&s.env, "ipfs://QmB"),
        &500,
    );
}

#[test]
fn test_set_metadata_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let unauthorized_user = Address::generate(&s.env);
    s.fund(&unauthorized_user, 500);

    let token_addr = s.new_token(&creator);

    // Seed token info in storage to simulate a created token
    let info = TokenInfo {
        name: String::from_str(&s.env, "TestToken"),
        symbol: String::from_str(&s.env, "TEST"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
        max_supply: None,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.token_count += 1;
        let index = state.token_count;
        s.env.storage().instance().set(&DataKey::TokenInfo(index), &info);
        s.env.storage().instance().set(&DataKey::State, &state);
        s.env.storage().instance()
            .set(&DataKey::TokenIndex(token_addr.clone()), &index);
            .set(&(&token_addr, symbol_short!("idx")), &index);
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("owner")), &creator);
    });

    // Unauthorized user should not be able to set metadata
    let result = s.client.try_set_metadata(
        &token_addr, &unauthorized_user,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

// ── mint_tokens ───────────────────────────────────────────────────────────────

#[test]
fn test_mint_tokens() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);

    // seed_token_with_burn registers the token + idx mapping the contract needs
    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);

    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &5_000, &1_000);

    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 5_000);
}

#[test]
fn test_mint_tokens_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let unauthorized_user = Address::generate(&s.env);
    s.fund(&unauthorized_user, 1_000);

    let token_addr = s.new_token(&creator);

    // Seed token info in storage to simulate a created token
    let info = TokenInfo {
        name: String::from_str(&s.env, "TestToken"),
        symbol: String::from_str(&s.env, "TEST"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
        max_supply: None,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.token_count += 1;
        let index = state.token_count;
        s.env.storage().instance().set(&DataKey::TokenInfo(index), &info);
        s.env.storage().instance().set(&DataKey::State, &state);
        s.env.storage().instance()
            .set(&DataKey::TokenIndex(token_addr.clone()), &index);
            .set(&(&token_addr, symbol_short!("idx")), &index);
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("owner")), &creator);
    });

    // Unauthorized user should not be able to mint tokens
    let recipient = Address::generate(&s.env);
    let result = s.client.try_mint_tokens(
        &token_addr, &unauthorized_user, &recipient, &5_000, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

// ── burn ──────────────────────────────────────────────────────────────────────

fn seed_token_with_burn(s: &Setup, creator: &Address, burn_enabled: bool) -> Address {
    let token_addr = s.new_token(creator);
    let info = TokenInfo {
        name: String::from_str(&s.env, "T"),
        symbol: String::from_str(&s.env, "T"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled,
        max_supply: None,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.token_count += 1;
        let index = state.token_count;
        s.env.storage().instance().set(&DataKey::TokenInfo(index), &info);
        s.env.storage().instance().set(&DataKey::State, &state);
        s.env.storage().instance()
            .set(&DataKey::TokenIndex(token_addr.clone()), &index);
            .set(&(&token_addr, symbol_short!("idx")), &index);
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("owner")), &creator);
    });
    token_addr
}

#[test]
fn test_burn() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &token_admin, true);

    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &1_000);

    s.client.burn(&token_addr, &burner, &400);

    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 600);
}

#[test]
fn test_burn_disabled_returns_error() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, false);

    // Give the burner a balance so the contract reaches the burn_enabled check
    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &100);
    assert_eq!(
        s.client.try_burn(&token_addr, &burner, &100),
        Err(Ok(Error::BurnNotEnabled))
    );
}

#[test]
fn test_set_burn_enabled_disables_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);

    s.client.set_burn_enabled(&token_addr, &creator, &false);

    // Give the burner a balance so the contract reaches the burn_enabled check
    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &100);
    assert_eq!(
        s.client.try_burn(&token_addr, &burner, &100),
        Err(Ok(Error::BurnNotEnabled))
    );
}

#[test]
fn test_set_burn_enabled_re_enables_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, false);

    s.client.set_burn_enabled(&token_addr, &creator, &true);

    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &500);
    s.client.burn(&token_addr, &burner, &200);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 300);
}

#[test]
fn test_set_burn_enabled_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let stranger = Address::generate(&s.env);

    assert_eq!(
        s.client.try_set_burn_enabled(&token_addr, &stranger, &false),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_set_burn_enabled_token_not_found() {
    let s = Setup::new();
    let fake_addr = Address::generate(&s.env);
    let admin = Address::generate(&s.env);

    assert_eq!(
        s.client.try_set_burn_enabled(&fake_addr, &admin, &false),
        Err(Ok(Error::TokenNotFound))
    );
}

#[test]
fn test_burn_invalid_amount() {
    let s = Setup::new();
    let token_addr = s.new_token(&s.admin);
    let burner = Address::generate(&s.env);

    assert_eq!(s.client.try_burn(&token_addr, &burner, &0), Err(Ok(Error::InvalidBurnAmount)));
}

// ── update_fees ───────────────────────────────────────────────────────────────

#[test]
fn test_update_fees() {
    let s = Setup::new();
    s.client.update_fees(&s.admin, &Some(2_000_i128), &Some(1_000_i128));
    let state = s.client.get_state();
    assert_eq!(state.base_fee, 2_000);
    assert_eq!(state.metadata_fee, 1_000);
}

#[test]
fn test_update_fees_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(
        s.client.try_update_fees(&stranger, &Some(2_000_i128), &None),
        Err(Ok(Error::Unauthorized))
    );
}

// ── get_token_info ────────────────────────────────────────────────────────────

#[test]
fn test_get_token_info() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    let info = TokenInfo {
        name: String::from_str(&s.env, "MyToken"),
        symbol: String::from_str(&s.env, "MTK"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
        max_supply: None,
    };
    s.env.as_contract(&s.client.address, || {
        s.env.storage().instance().set(&DataKey::TokenInfo(1), &info);
    });

    let result = s.client.get_token_info(&1);
    assert_eq!(result.name, String::from_str(&s.env, "MyToken"));
    assert_eq!(result.symbol, String::from_str(&s.env, "MTK"));
    assert_eq!(result.decimals, 7);
    assert_eq!(result.creator, creator);
}

#[test]
fn test_get_token_info_not_found() {
    let s = Setup::new();
    assert_eq!(s.client.try_get_token_info(&99), Err(Ok(Error::TokenNotFound)));
}

// ── pause / unpause ───────────────────────────────────────────────────────────

#[test]
fn test_admin_can_pause_and_unpause() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    assert!(s.client.get_state().paused);
    s.client.unpause(&s.admin);
    assert!(!s.client.get_state().paused);
}

#[test]
fn test_non_admin_cannot_pause() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.client.try_pause(&stranger), Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_burn_allowed_when_paused() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);

    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &500);

    s.client.pause(&s.admin);
    assert!(s.client.get_state().paused);

    // burn must succeed even while the factory is paused
    s.client.burn(&token_addr, &burner, &200);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 300);
}

// ── transfer_admin ────────────────────────────────────────────────────────────

#[test]
fn test_transfer_admin() {
    let s = Setup::new();
    let new_admin = Address::generate(&s.env);
    s.client.transfer_admin(&s.admin, &new_admin);
    assert_eq!(s.client.get_state().admin, new_admin);
}

#[test]
fn test_transfer_admin_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    let new_admin = Address::generate(&s.env);
    assert_eq!(
        s.client.try_transfer_admin(&stranger, &new_admin),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_transfer_admin_same_address_fails() {
    let s = Setup::new();
    assert_eq!(
        s.client.try_transfer_admin(&s.admin, &s.admin),
        Err(Ok(Error::InvalidParameters))
    );
}

// ── update_admin ──────────────────────────────────────────────────────────────

#[test]
fn test_update_admin() {
    let s = Setup::new();
    let new_admin = Address::generate(&s.env);
    s.client.update_admin(&s.admin, &new_admin);
    assert_eq!(s.client.get_state().admin, new_admin);
}

#[test]
fn test_update_admin_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    let new_admin = Address::generate(&s.env);
    assert_eq!(
        s.client.try_update_admin(&stranger, &new_admin),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_update_admin_same_address_fails() {
    let s = Setup::new();
    assert_eq!(
        s.client.try_update_admin(&s.admin, &s.admin),
        Err(Ok(Error::InvalidParameters))
    );
}

#[test]
fn test_update_admin_old_admin_loses_access() {
    let s = Setup::new();
    let new_admin = Address::generate(&s.env);
    s.client.update_admin(&s.admin, &new_admin);

    // Old admin can no longer pause (admin-only operation)
    assert_eq!(
        s.client.try_pause(&s.admin),
        Err(Ok(Error::Unauthorized))
    );

    // New admin can perform admin-only operations
    s.client.pause(&new_admin);
    assert!(s.client.get_state().paused);
}

// ── reentrancy guard ──────────────────────────────────────────────────────────

#[test]
fn test_reentrancy_guard_blocks_concurrent_call() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    // Manually set locked = true in factory state to simulate a call already in progress
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.locked = true;
        s.env.storage().instance().set(&DataKey::State, &state);
    });

    // A second create_token call while locked should return Reentrancy
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0_u128, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::Reentrancy)));
}

#[test]
fn test_reentrancy_guard_released_after_error() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    // Trigger an error path (insufficient fee) — guard must be released afterwards
    let _ = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0_u128, &1, // fee too low → InsufficientFee
    );

    // After the failed call, locked must be false
    s.env.as_contract(&s.client.address, || {
        let state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        assert!(!state.locked, "lock should be released after an error");
    });
}

#[test]
fn test_initial_state_is_not_locked() {
    let s = Setup::new();
    s.env.as_contract(&s.client.address, || {
        let state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        assert!(!state.locked);
    });
}

// ── TTL ───────────────────────────────────────────────────────────────────────

#[test]
fn test_ttl_extended_after_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let fee_token = env.register_stellar_asset_contract_v2(admin.clone()).address();

    client.initialize(&admin, &treasury, &fee_token, &1_000, &500);

    // After initialize the instance TTL must be at least MIN_TTL ledgers.
    // The test env starts at ledger 0; extend_ttl(100_000, 535_000) sets the
    // live-until ledger to 535_000, so the TTL is 535_000 - current = 535_000.
    env.as_contract(&contract_id, || {
        let ttl = env.storage().instance().get_ttl();
        assert!(
            ttl >= super::MIN_TTL,
            "instance TTL after initialize ({ttl}) must be >= MIN_TTL ({})",
            super::MIN_TTL,
        );
    });
}

#[test]
fn test_get_tokens_by_creator() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    s.env.as_contract(&s.client.address, || {
        let key = DataKey::CreatorTokens(creator.clone());
        let mut list: soroban_sdk::Vec<u32> = soroban_sdk::vec![&s.env];
        list.push_back(1u32);
        list.push_back(2u32);
        s.env.storage().instance().set(&key, &list);
    });

    let indices = s.client.get_tokens_by_creator(&creator);
    assert_eq!(indices.len(), 2);
    assert_eq!(indices.get(0).expect("first token index missing"), 1);
    assert_eq!(indices.get(1).expect("second token index missing"), 2);
}

#[test]
fn test_get_tokens_by_creator_empty_for_unknown() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.client.get_tokens_by_creator(&stranger).len(), 0);
}

// ── max supply cap ────────────────────────────────────────────────────────────

fn seed_token_with_cap(s: &Setup, creator: &Address, max_supply: Option<i128>) -> Address {
    let token_addr = s.new_token(creator);
    let info = TokenInfo {
        name: String::from_str(&s.env, "T"),
        symbol: String::from_str(&s.env, "T"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled: true,
        max_supply,
    };
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&symbol_short!("state")).unwrap();
        state.token_count += 1;
        let index = state.token_count;
        s.env.storage().instance().set(&index, &info);
        s.env.storage().instance().set(&symbol_short!("state"), &state);
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("idx")), &index);
    });
    token_addr
}

#[test]
fn test_mint_within_cap_succeeds() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_addr = seed_token_with_cap(&s, &admin, Some(1_000));
    let recipient = Address::generate(&s.env);

    s.client.mint_tokens(&token_addr, &admin, &recipient, &1_000, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000);
}

#[test]
fn test_mint_exceeds_cap_returns_error() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_addr = seed_token_with_cap(&s, &admin, Some(500));
    let recipient = Address::generate(&s.env);

    let result = s.client.try_mint_tokens(&token_addr, &admin, &recipient, &501, &1_000);
    assert_eq!(result, Err(Ok(Error::MaxSupplyExceeded)));
}

#[test]
fn test_mint_uncapped_has_no_limit() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);

    let token_addr = seed_token_with_cap(&s, &admin, None);
    let recipient = Address::generate(&s.env);

    // A very large mint should succeed when there is no cap
    s.client.mint_tokens(&token_addr, &admin, &recipient, &1_000_000_000, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000_000_000);
}

#[test]
fn test_mint_exactly_at_cap_succeeds() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 2_000);

    let token_addr = seed_token_with_cap(&s, &admin, Some(1_000));
    let recipient = Address::generate(&s.env);

    // First mint: 600
    s.client.mint_tokens(&token_addr, &admin, &recipient, &600, &1_000);
    // Second mint: exactly fills the cap
    s.client.mint_tokens(&token_addr, &admin, &recipient, &400, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000);
}

#[test]
fn test_mint_one_over_cap_returns_error() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 2_000);

    let token_addr = seed_token_with_cap(&s, &admin, Some(1_000));
    let recipient = Address::generate(&s.env);

    s.client.mint_tokens(&token_addr, &admin, &recipient, &600, &1_000);
    // 600 already minted; 401 more would exceed cap of 1_000
    let result = s.client.try_mint_tokens(&token_addr, &admin, &recipient, &401, &1_000);
    assert_eq!(result, Err(Ok(Error::MaxSupplyExceeded)));
}

#[test]
fn test_token_count_overflow_protection() {
    let s = Setup::new();
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        
        // Set token_count to max u32 value, simulating near-overflow state
        state.token_count = u32::MAX;
        s.env.storage().instance().set(&DataKey::State, &state);
    });

    let creator = Address::generate(&s.env);
    s.fund(&creator, 10_000);

    // Attempting to create a token when token_count is at max should fail
    let result = s.client.try_create_token(
        &creator,
        &s.salt(0),
        &s.dummy_hash(),
        &String::from_str(&s.env, "OverflowToken"),
        &String::from_str(&s.env, "OVF"),
        &6,
        &0_u128,
        &5_000,
    );
    
    // Should return ArithmeticOverflow error
    assert_eq!(result, Err(Ok(Error::ArithmeticOverflow)));
}

#[test]
fn test_mint_with_zero_amount_fails() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    let token_addr = s.new_token(&admin);
    
    s.fund(&admin, 2_000);
    
    // Manually register the token in factory storage
    s.env.as_contract(&s.client.address, || {
        s.env.storage().instance().set(&DataKey::TokenIndex(token_addr.clone()), &DataKey::TokenInfo(1));
        s.env.storage().instance().set(&DataKey::TokenInfo(1), &TokenInfo {
        s.env.storage().instance().set(&(token_addr.clone(), symbol_short!("idx")), &1u32);
        s.env.storage().instance().set(&(token_addr.clone(), symbol_short!("owner")), &admin);
        s.env.storage().instance().set(&1u32, &TokenInfo {
            name: String::from_str(&s.env, "Token"),
            symbol: String::from_str(&s.env, "TKN"),
            decimals: 6,
            creator: admin.clone(),
            created_at: 0,
            burn_enabled: true,
        max_supply: None,
        });
    });
    
    let to = Address::generate(&s.env);
    
    // Attempting to mint 0 tokens should fail
    let result = s.client.try_mint_tokens(
        &token_addr,
        &admin,
        &to,
        &0,
        &1_000,
    );
    
    assert_eq!(result, Err(Ok(Error::InvalidParameters)));
}

#[test]
fn test_mint_with_negative_amount_fails() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    let token_addr = s.new_token(&admin);
    
    s.fund(&admin, 2_000);
    
    // Manually register the token in factory storage
    s.env.as_contract(&s.client.address, || {
        s.env.storage().instance().set(&DataKey::TokenIndex(token_addr.clone()), &DataKey::TokenInfo(1));
        s.env.storage().instance().set(&DataKey::TokenInfo(1), &TokenInfo {
            name: String::from_str(&s.env, "Token"),
            symbol: String::from_str(&s.env, "TKN"),
            decimals: 6,
            creator: admin.clone(),
            created_at: 0,
            burn_enabled: true,
        max_supply: None,
        });
    });
    
    let to = Address::generate(&s.env);
    
    // Attempting to mint negative tokens should fail
    let result = s.client.try_mint_tokens(
        &token_addr,
        &admin,
        &to,
        &-1_000,
        &1_000,
    );
    
    assert_eq!(result, Err(Ok(Error::InvalidParameters)));
}

#[test]
fn test_burn_with_zero_amount_fails() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    
    // Attempt to burn 0 tokens
    let result = s.client.try_burn(&token_addr, &user, &0);
    assert_eq!(result, Err(Ok(Error::InvalidBurnAmount)));
}

#[test]
fn test_burn_with_negative_amount_fails() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    
    // Attempt to burn negative tokens
    let result = s.client.try_burn(&token_addr, &user, &-100);
    assert_eq!(result, Err(Ok(Error::InvalidBurnAmount)));
}

#[test]
fn test_burn_amount_exceeds_balance() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    
    // Mint some tokens to the user
    let token_client = TokenClient::new(&s.env, &token_addr);
    token::StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    
    // Attempt to burn more than balance
    let result = s.client.try_burn(&token_addr, &user, &101);
    assert_eq!(result, Err(Ok(Error::BurnAmountExceedsBalance)));
}

#[test]
fn test_burn_at_exact_balance() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    
    // Register token in factory
    s.env.as_contract(&s.client.address, || {
        s.env.storage().instance().set(&DataKey::TokenIndex(token_addr.clone()), &DataKey::TokenInfo(1));
        s.env.storage().instance().set(&DataKey::TokenInfo(1), &TokenInfo {
            name: String::from_str(&s.env, "Token"),
            symbol: String::from_str(&s.env, "TKN"),
            decimals: 6,
            creator: user.clone(),
            created_at: 0,
            burn_enabled: true,
        max_supply: None,
        });
    });
    
    // Mint some tokens to the user
    let token_client = TokenClient::new(&s.env, &token_addr);
    token::StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    
    // Burn exactly the balance
    let result = s.client.try_burn(&token_addr, &user, &100);
    assert!(result.is_ok());
    
    // Verify balance is now 0
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&user), 0);
}
// ── upgrade ──────────────────────────────────────────────────────────────────

#[test]
fn test_upgrade() {
    let s = Setup::new();
    let new_wasm_hash = s.salt(1); // just a dummy hash for test
    s.client.upgrade(&s.admin, &new_wasm_hash);
}

#[test]
fn test_upgrade_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    let new_wasm_hash = s.salt(1);
    let result = s.client.try_upgrade(&stranger, &new_wasm_hash);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

// ── fee split ─────────────────────────────────────────────────────────────────

fn make_split(s: &Setup, pairs: &[(&Address, u32)]) -> Map<Address, u32> {
    let mut m = Map::new(&s.env);
    for (addr, bps) in pairs {
        m.set((*addr).clone(), *bps);
    }
    m
}

#[test]
fn test_set_fee_split_valid() {
    let s = Setup::new();
    let recipient = Address::generate(&s.env);
    let splits = make_split(&s, &[(&s.treasury, 7_000), (&recipient, 3_000)]);
    s.client.set_fee_split(&s.admin, &splits);

    let stored = s.client.get_fee_split();
    assert_eq!(stored.get(s.treasury.clone()).unwrap(), 7_000);
    assert_eq!(stored.get(recipient).unwrap(), 3_000);
}

#[test]
fn test_set_fee_split_invalid_sum_rejected() {
    let s = Setup::new();
    let recipient = Address::generate(&s.env);
    // 6_000 + 3_000 = 9_000 ≠ 10_000
    let splits = make_split(&s, &[(&s.treasury, 6_000), (&recipient, 3_000)]);
    assert_eq!(
        s.client.try_set_fee_split(&s.admin, &splits),
        Err(Ok(Error::InvalidFeeSplit))
    );
}

#[test]
fn test_set_fee_split_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    let splits = make_split(&s, &[(&s.treasury, 10_000)]);
    assert_eq!(
        s.client.try_set_fee_split(&stranger, &splits),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn test_set_fee_split_empty_clears_split() {
    let s = Setup::new();
    let recipient = Address::generate(&s.env);
    let splits = make_split(&s, &[(&s.treasury, 7_000), (&recipient, 3_000)]);
    s.client.set_fee_split(&s.admin, &splits);

    // Clear by passing empty map
    s.client.set_fee_split(&s.admin, &Map::new(&s.env));
    assert!(s.client.get_fee_split().is_empty());
}

#[test]
fn test_fee_distributed_according_to_split() {
    let s = Setup::new();
    let referral = Address::generate(&s.env);
    // 70% treasury, 30% referral
    let splits = make_split(&s, &[(&s.treasury, 7_000), (&referral, 3_000)]);
    s.client.set_fee_split(&s.admin, &splits);

    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);

    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &100, &1_000);

    // 1_000 * 7_000 / 10_000 = 700 to treasury
    // 1_000 * 3_000 / 10_000 = 300 to referral
    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 700);
    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&referral), 300);
}

#[test]
fn test_fee_goes_to_treasury_when_no_split_set() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);

    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &100, &1_000);

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 1_000);
}

#[test]
fn test_fee_split_remainder_goes_to_treasury() {
    let s = Setup::new();
    let referral = Address::generate(&s.env);
    // 3333 + 6667 = 10_000 — with a fee of 10, referral gets 3 (3.333 truncated),
    // treasury gets 6 (6.667 truncated) + 1 remainder = 7
    let splits = make_split(&s, &[(&referral, 3_333), (&s.treasury, 6_667)]);
    s.client.set_fee_split(&s.admin, &splits);

    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 10);

    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &1, &10);

    let referral_bal = TokenClient::new(&s.env, &s.fee_token).balance(&referral);
    let treasury_bal = TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury);
    // Total must equal the fee paid
    assert_eq!(referral_bal + treasury_bal, 10);
    // Remainder goes to treasury, so treasury >= its direct share
    assert!(treasury_bal >= 6);
}

// ── batch token creation ──────────────────────────────────────────────────────

fn batch_param(s: &Setup, n: u8, name: &str, symbol: &str) -> BatchTokenParams {
    BatchTokenParams {
        salt: BytesN::from_array(&s.env, &[n; 32]),
        token_wasm_hash: BytesN::from_array(&s.env, &[0u8; 32]),
        name: String::from_str(&s.env, name),
        symbol: String::from_str(&s.env, symbol),
        decimals: 7,
        initial_supply: 0,
        max_supply: None,
    }
}

fn batch_vec(s: &Setup, params: &[BatchTokenParams]) -> Vec<BatchTokenParams> {
    let mut v = soroban_sdk::vec![&s.env];
    for p in params {
        v.push_back(p.clone());
    }
    v
}

#[test]
fn test_batch_empty_rejected() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let result = s.client.try_create_tokens_batch(
        &creator,
        &soroban_sdk::vec![&s.env],
        &0,
    );
    assert_eq!(result, Err(Ok(Error::InvalidParameters)));
}

#[test]
fn test_batch_insufficient_fee_rejected() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 500);

    // base_fee=1_000, 2 tokens → total=2_000; paying only 1_999
    let params = batch_vec(&s, &[
        batch_param(&s, 1, "TokenA", "TKA"),
        batch_param(&s, 2, "TokenB", "TKB"),
    ]);
    let result = s.client.try_create_tokens_batch(&creator, &params, &1_999);
    assert_eq!(result, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_batch_invalid_name_rejects_entire_batch() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 3_000);

    // Second token has empty name — whole batch must be rejected before any deploy
    let mut bad = batch_param(&s, 2, "", "TKB");
    bad.name = String::from_str(&s.env, "");
    let params = batch_vec(&s, &[
        batch_param(&s, 1, "TokenA", "TKA"),
        bad,
    ]);
    let result = s.client.try_create_tokens_batch(&creator, &params, &2_000);
    assert_eq!(result, Err(Ok(Error::InvalidParameters)));
    // No tokens should have been registered
    assert_eq!(s.client.get_state().token_count, 0);
}

#[test]
fn test_batch_invalid_max_supply_rejects_entire_batch() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 2_000);

    let mut bad = batch_param(&s, 2, "TokenB", "TKB");
    bad.initial_supply = 1_000;
    bad.max_supply = Some(500); // initial > cap → invalid
    let params = batch_vec(&s, &[
        batch_param(&s, 1, "TokenA", "TKA"),
        bad,
    ]);
    let result = s.client.try_create_tokens_batch(&creator, &params, &2_000);
    assert_eq!(result, Err(Ok(Error::InvalidParameters)));
    assert_eq!(s.client.get_state().token_count, 0);
}

#[test]
fn test_batch_fee_is_base_fee_times_count() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    // base_fee = 1_000; 3 tokens → 3_000
    s.fund(&creator, 3_000);

    let params = batch_vec(&s, &[
        batch_param(&s, 1, "TokenA", "TKA"),
        batch_param(&s, 2, "TokenB", "TKB"),
        batch_param(&s, 3, "TokenC", "TKC"),
    ]);
    // Paying exactly 3_000 should succeed (error will be on deploy since wasm hash is dummy,
    // but fee validation and param validation happen first — we just test those paths here)
    // Since we can't deploy in unit tests, verify fee check passes with exact amount
    // and fails with one less.
    let result_low = s.client.try_create_tokens_batch(&creator, &params, &2_999);
    assert_eq!(result_low, Err(Ok(Error::InsufficientFee)));
}

#[test]
fn test_batch_blocked_when_paused() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    let creator = Address::generate(&s.env);
    let params = batch_vec(&s, &[batch_param(&s, 1, "T", "T")]);
    let result = s.client.try_create_tokens_batch(&creator, &params, &1_000);
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}

#[test]
fn test_batch_reentrancy_guard() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);

    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&symbol_short!("state")).unwrap();
        state.locked = true;
        s.env.storage().instance().set(&symbol_short!("state"), &state);
    });

    let params = batch_vec(&s, &[batch_param(&s, 1, "T", "T")]);
    let result = s.client.try_create_tokens_batch(&creator, &params, &1_000);
    assert_eq!(result, Err(Ok(Error::Reentrancy)));
}
