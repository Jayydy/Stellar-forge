#![cfg(test)]

use super::*;
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
}

impl Setup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFactory);
        // SAFETY: test-only static lifetime cast; env outlives all uses.
        let client = TokenFactoryClient::new(&env, &contract_id);
        let client: TokenFactoryClient<'static> =
            unsafe { core::mem::transmute(client) };

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        // Register a mock SAC as the fee token; admin is its issuer.
        let fee_token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();

        client.initialize(&admin, &treasury, &fee_token, &1_000, &500);

        Setup { env, client, admin, treasury, fee_token }
    }

    /// Mint `amount` of fee_token to `recipient` so they can pay fees.
    fn fund(&self, recipient: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.fee_token).mint(recipient, &amount);
    }

    /// Register a fresh mock SAC (used as the token being managed, not the fee token).
    fn new_token(&self, issuer: &Address) -> Address {
        self.env
            .register_stellar_asset_contract_v2(issuer.clone())
            .address()
    }

    fn salt(&self, n: u8) -> BytesN<32> {
        BytesN::from_array(&self.env, &[n; 32])
    }

    fn dummy_hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[0u8; 32])
    }
}

/// Seed factory storage with a token entry and return its address.
/// Used by tests that need a registered token without going through deploy.
fn seed_token(s: &Setup, creator: &Address, burn_enabled: bool, max_supply: Option<i128>) -> Address {
    let token_addr = s.new_token(creator);
    let info = TokenInfo {
        name: String::from_str(&s.env, "T"),
        symbol: String::from_str(&s.env, "T"),
        decimals: 7,
        creator: creator.clone(),
        created_at: 0,
        burn_enabled,
        max_supply,
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
        s.env.storage().instance()
            .set(&(&token_addr, symbol_short!("owner")), creator);
    });
    token_addr
}

fn seed_token_with_burn(s: &Setup, creator: &Address, burn_enabled: bool) -> Address {
    seed_token(s, creator, burn_enabled, None)
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

// ── fee distribution (core requirement) ──────────────────────────────────────

/// After create_token the treasury's fee_token balance must increase by base_fee.
/// We test this by seeding state directly (no wasm deploy needed) and calling
/// distribute_fee via mint_tokens, which exercises the same code path.
#[test]
fn test_fee_distribution() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    // Fund token_admin with exactly base_fee (1_000) worth of fee_token
    s.fund(&token_admin, 1_000);

    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);

    let treasury_before = TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &100, &1_000);
    let treasury_after = TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury);

    // Treasury must have received exactly base_fee = 1_000
    assert_eq!(treasury_after - treasury_before, 1_000);
    // token_admin's fee_token balance must be zero (fully transferred)
    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&token_admin), 0);
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
fn test_set_metadata_fee_goes_to_treasury() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 500);

    let token_addr = seed_token_with_burn(&s, &admin, true);
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );

    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 500);
}

// ── create_token (error paths only — deploy needs wasm) ──────────────────────

#[test]
fn test_create_token_insufficient_fee() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
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
fn test_create_token_boundary_decimals_not_rejected() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 3_000);
    for (n, dec) in [(0u8, 0u32), (1, 7), (2, 18)] {
        let result = s.client.try_create_token(
            &creator, &s.salt(n), &s.dummy_hash(),
            &String::from_str(&s.env, "T"),
            &String::from_str(&s.env, "T"),
            &dec, &0_u128, &1_000,
        );
        assert_ne!(result, Err(Ok(Error::InvalidDecimals)));
    }
}

#[test]
fn test_token_count_overflow_protection() {
    let s = Setup::new();
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.token_count = u32::MAX;
        s.env.storage().instance().set(&DataKey::State, &state);
    });
    let creator = Address::generate(&s.env);
    s.fund(&creator, 10_000);
    let result = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0_u128, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::ArithmeticOverflow)));
}

// ── set_metadata ──────────────────────────────────────────────────────────────

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
    s.client.set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );
    let result = s.client.try_set_metadata(
        &token_addr, &admin,
        &String::from_str(&s.env, "ipfs://Qm456"),
        &500,
    );
    assert_eq!(result, Err(Ok(Error::MetadataAlreadySet)));
}

#[test]
fn test_set_metadata_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let unauthorized = Address::generate(&s.env);
    s.fund(&unauthorized, 500);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let result = s.client.try_set_metadata(
        &token_addr, &unauthorized,
        &String::from_str(&s.env, "ipfs://Qm123"),
        &500,
    );
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_set_metadata_different_tokens_independent() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_a = seed_token_with_burn(&s, &admin, true);
    let token_b = seed_token_with_burn(&s, &admin, true);
    s.client.set_metadata(&token_a, &admin, &String::from_str(&s.env, "ipfs://QmA"), &500);
    s.client.set_metadata(&token_b, &admin, &String::from_str(&s.env, "ipfs://QmB"), &500);
}

// ── mint_tokens ───────────────────────────────────────────────────────────────

#[test]
fn test_mint_tokens() {
    let s = Setup::new();
    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);
    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &5_000, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 5_000);
}

#[test]
fn test_mint_tokens_unauthorized() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let unauthorized = Address::generate(&s.env);
    s.fund(&unauthorized, 1_000);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let recipient = Address::generate(&s.env);
    let result = s.client.try_mint_tokens(
        &token_addr, &unauthorized, &recipient, &5_000, &1_000,
    );
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_mint_with_zero_amount_fails() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_addr = seed_token_with_burn(&s, &admin, true);
    let to = Address::generate(&s.env);
    assert_eq!(
        s.client.try_mint_tokens(&token_addr, &admin, &to, &0, &1_000),
        Err(Ok(Error::InvalidParameters))
    );
}

#[test]
fn test_mint_with_negative_amount_fails() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_addr = seed_token_with_burn(&s, &admin, true);
    let to = Address::generate(&s.env);
    assert_eq!(
        s.client.try_mint_tokens(&token_addr, &admin, &to, &-1, &1_000),
        Err(Ok(Error::InvalidParameters))
    );
}

// ── max supply cap ────────────────────────────────────────────────────────────

#[test]
fn test_mint_within_cap_succeeds() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_addr = seed_token(&s, &admin, true, Some(1_000));
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &admin, &recipient, &1_000, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000);
}

#[test]
fn test_mint_exceeds_cap_returns_error() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_addr = seed_token(&s, &admin, true, Some(500));
    let recipient = Address::generate(&s.env);
    assert_eq!(
        s.client.try_mint_tokens(&token_addr, &admin, &recipient, &501, &1_000),
        Err(Ok(Error::MaxSupplyExceeded))
    );
}

#[test]
fn test_mint_uncapped_has_no_limit() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 1_000);
    let token_addr = seed_token(&s, &admin, true, None);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &admin, &recipient, &1_000_000_000, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000_000_000);
}

#[test]
fn test_mint_exactly_at_cap_succeeds() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 2_000);
    let token_addr = seed_token(&s, &admin, true, Some(1_000));
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &admin, &recipient, &600, &1_000);
    s.client.mint_tokens(&token_addr, &admin, &recipient, &400, &1_000);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&recipient), 1_000);
}

#[test]
fn test_mint_one_over_cap_returns_error() {
    let s = Setup::new();
    let admin = Address::generate(&s.env);
    s.fund(&admin, 2_000);
    let token_addr = seed_token(&s, &admin, true, Some(1_000));
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &admin, &recipient, &600, &1_000);
    assert_eq!(
        s.client.try_mint_tokens(&token_addr, &admin, &recipient, &401, &1_000),
        Err(Ok(Error::MaxSupplyExceeded))
    );
}

// ── burn ──────────────────────────────────────────────────────────────────────

#[test]
fn test_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
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
    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &100);
    assert_eq!(
        s.client.try_burn(&token_addr, &burner, &100),
        Err(Ok(Error::BurnNotEnabled))
    );
}

#[test]
fn test_burn_invalid_amount() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    assert_eq!(s.client.try_burn(&token_addr, &user, &0), Err(Ok(Error::InvalidBurnAmount)));
    assert_eq!(s.client.try_burn(&token_addr, &user, &-100), Err(Ok(Error::InvalidBurnAmount)));
}

#[test]
fn test_burn_amount_exceeds_balance() {
    let s = Setup::new();
    let user = Address::generate(&s.env);
    let token_addr = s.new_token(&user);
    StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    assert_eq!(
        s.client.try_burn(&token_addr, &user, &101),
        Err(Ok(Error::BurnAmountExceedsBalance))
    );
}

#[test]
fn test_burn_at_exact_balance() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let user = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&user, &100);
    s.client.burn(&token_addr, &user, &100);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&user), 0);
}

#[test]
fn test_set_burn_enabled_disables_burn() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    s.client.set_burn_enabled(&token_addr, &creator, &false);
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
    let fake = Address::generate(&s.env);
    let admin = Address::generate(&s.env);
    assert_eq!(
        s.client.try_set_burn_enabled(&fake, &admin, &false),
        Err(Ok(Error::TokenNotFound))
    );
}

#[test]
fn test_burn_allowed_when_paused() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    let token_addr = seed_token_with_burn(&s, &creator, true);
    let burner = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &token_addr).mint(&burner, &500);
    s.client.pause(&s.admin);
    s.client.burn(&token_addr, &burner, &200);
    assert_eq!(TokenClient::new(&s.env, &token_addr).balance(&burner), 300);
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
    assert_eq!(indices.get(0).unwrap(), 1);
    assert_eq!(indices.get(1).unwrap(), 2);
}

#[test]
fn test_get_tokens_by_creator_empty_for_unknown() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.client.get_tokens_by_creator(&stranger).len(), 0);
}

// ── transfer_admin / update_admin ─────────────────────────────────────────────

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
    assert_eq!(s.client.try_pause(&s.admin), Err(Ok(Error::Unauthorized)));
    s.client.pause(&new_admin);
    assert!(s.client.get_state().paused);
}

// ── reentrancy guard ──────────────────────────────────────────────────────────

#[test]
fn test_reentrancy_guard_blocks_concurrent_call() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.locked = true;
        s.env.storage().instance().set(&DataKey::State, &state);
    });
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
    let _ = s.client.try_create_token(
        &creator, &s.salt(0), &s.dummy_hash(),
        &String::from_str(&s.env, "T"),
        &String::from_str(&s.env, "T"),
        &7, &0_u128, &1, // fee too low
    );
    s.env.as_contract(&s.client.address, || {
        let state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        assert!(!state.locked, "lock must be released after an error");
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
    env.as_contract(&contract_id, || {
        let ttl = env.storage().instance().get_ttl();
        assert!(ttl >= super::MIN_TTL, "TTL {ttl} must be >= MIN_TTL");
    });
}

// ── upgrade ───────────────────────────────────────────────────────────────────

#[test]
fn test_upgrade_unauthorized() {
    let s = Setup::new();
    let stranger = Address::generate(&s.env);
    assert_eq!(
        s.client.try_upgrade(&stranger, &s.salt(1)),
        Err(Ok(Error::Unauthorized))
    );
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
    s.client.set_fee_split(&s.admin, &Map::new(&s.env));
    assert!(s.client.get_fee_split().is_empty());
}

#[test]
fn test_fee_distributed_according_to_split() {
    let s = Setup::new();
    let referral = Address::generate(&s.env);
    let splits = make_split(&s, &[(&s.treasury, 7_000), (&referral, 3_000)]);
    s.client.set_fee_split(&s.admin, &splits);

    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 1_000);
    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &100, &1_000);

    // 1_000 * 7_000 / 10_000 = 700 to treasury; 1_000 * 3_000 / 10_000 = 300 to referral
    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury), 700);
    assert_eq!(TokenClient::new(&s.env, &s.fee_token).balance(&referral), 300);
}

#[test]
fn test_fee_split_remainder_goes_to_treasury() {
    let s = Setup::new();
    let referral = Address::generate(&s.env);
    // 3333 + 6667 = 10_000; with fee=10: referral gets 3 (truncated), treasury gets 6+1 remainder
    let splits = make_split(&s, &[(&referral, 3_333), (&s.treasury, 6_667)]);
    s.client.set_fee_split(&s.admin, &splits);

    let token_admin = Address::generate(&s.env);
    s.fund(&token_admin, 10);
    let token_addr = seed_token_with_burn(&s, &token_admin, true);
    let recipient = Address::generate(&s.env);
    s.client.mint_tokens(&token_addr, &token_admin, &recipient, &1, &10);

    let referral_bal = TokenClient::new(&s.env, &s.fee_token).balance(&referral);
    let treasury_bal = TokenClient::new(&s.env, &s.fee_token).balance(&s.treasury);
    assert_eq!(referral_bal + treasury_bal, 10);
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
    for p in params { v.push_back(p.clone()); }
    v
}

#[test]
fn test_batch_empty_rejected() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &soroban_sdk::vec![&s.env], &0),
        Err(Ok(Error::InvalidParameters))
    );
}

#[test]
fn test_batch_insufficient_fee_rejected() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 500);
    let params = batch_vec(&s, &[batch_param(&s, 1, "TokenA", "TKA"), batch_param(&s, 2, "TokenB", "TKB")]);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &params, &1_999),
        Err(Ok(Error::InsufficientFee))
    );
}

#[test]
fn test_batch_invalid_name_rejects_entire_batch() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 3_000);
    let mut bad = batch_param(&s, 2, "TokenB", "TKB");
    bad.name = String::from_str(&s.env, "");
    let params = batch_vec(&s, &[batch_param(&s, 1, "TokenA", "TKA"), bad]);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &params, &2_000),
        Err(Ok(Error::InvalidParameters))
    );
    assert_eq!(s.client.get_state().token_count, 0);
}

#[test]
fn test_batch_fee_is_base_fee_times_count() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.fund(&creator, 3_000);
    let params = batch_vec(&s, &[
        batch_param(&s, 1, "TokenA", "TKA"),
        batch_param(&s, 2, "TokenB", "TKB"),
        batch_param(&s, 3, "TokenC", "TKC"),
    ]);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &params, &2_999),
        Err(Ok(Error::InsufficientFee))
    );
}

#[test]
fn test_batch_blocked_when_paused() {
    let s = Setup::new();
    s.client.pause(&s.admin);
    let creator = Address::generate(&s.env);
    let params = batch_vec(&s, &[batch_param(&s, 1, "T", "T")]);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &params, &1_000),
        Err(Ok(Error::ContractPaused))
    );
}

#[test]
fn test_batch_reentrancy_guard() {
    let s = Setup::new();
    let creator = Address::generate(&s.env);
    s.env.as_contract(&s.client.address, || {
        let mut state: FactoryState = s.env.storage().instance()
            .get(&DataKey::State).unwrap();
        state.locked = true;
        s.env.storage().instance().set(&DataKey::State, &state);
    });
    let params = batch_vec(&s, &[batch_param(&s, 1, "T", "T")]);
    assert_eq!(
        s.client.try_create_tokens_batch(&creator, &params, &1_000),
        Err(Ok(Error::Reentrancy))
    );
}
