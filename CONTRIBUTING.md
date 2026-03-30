# Contributing to StellarForge

Thank you for your interest in contributing to StellarForge! This document provides comprehensive guidelines for contributing to the project. Whether you're fixing bugs, adding features, or improving documentation, we appreciate your effort to make StellarForge better.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Development Workflow](#development-workflow)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Running Tests](#running-tests)
- [Adding a New Language](#adding-a-new-language)
- [SDK Upgrade Process](#sdk-upgrade-process)
- [Security](#security)
- [Getting Help](#getting-help)

## Code Quality Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality automatically. The hooks are installed when you run `npm install` at the repo root (via the `prepare` script).

### What runs automatically

| Git event | Hook | What it does |
|-----------|------|--------------|
| `git commit` | `pre-commit` | Runs `lint-staged` on staged files: ESLint auto-fix → Prettier format. Blocks the commit if lint errors remain after auto-fix. |
| `git push` | `pre-push` | Runs the full frontend test suite (`npm test -- --run`). Aborts the push if any tests fail. |

### Targeted file types

`lint-staged` runs on staged files matching: `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`

### Reinstalling hooks

If hooks stop working (e.g. after a fresh clone):

```bash
npm install
```

The `prepare` script re-initialises Husky automatically.

### Bypassing hooks (not recommended)

```bash
git commit --no-verify -m "your message"
git push --no-verify
```

Only use this when absolutely necessary and document the reason in your commit message.

## Prerequisites

Before setting up your development environment, ensure you have the following installed:

- **Git** (v2.0+): Version control
- **Node.js** (v18+): JavaScript runtime for frontend development
- **npm** (v9+): Package manager (comes with Node.js)
- **Rust** (latest stable): For building Soroban smart contracts
- **Stellar CLI**: For contract deployment and testing (installed via setup script)

### Verify Your Installation

```bash
node --version      # Should be v18 or higher
npm --version       # Should be v9 or higher
git --version       # Should be v2.0 or higher
rustc --version     # Should be latest stable
```

## Local Development Setup

### Step 1: Fork and Clone the Repository

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Stellar-forge.git
   cd Stellar-forge
   ```

3. Add upstream remote to keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/stellar-forge/Stellar-forge.git
   git fetch upstream
   ```

### Step 2: Install Root Dependencies

Install workspace-level dependencies (husky for Git hooks, lint-staged for pre-commit linting):

```bash
npm install
```

This automatically runs the `prepare` script which sets up Git hooks via husky.

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 4: Set Up Stellar CLI Environment

Run the setup script to install Rust toolchain, Stellar CLI, and configure the testnet:

```bash
./scripts/setup-soroban.sh
```

This script will:
- Install Rust (if not already installed)
- Add the `wasm32-unknown-unknown` target for Rust
- Install Stellar CLI (replaces the older soroban-cli)
- Configure the testnet network with Soroban RPC endpoint

### Step 5: Verify Setup

Verify everything is working:

```bash
# Check frontend setup
cd frontend
npm run lint
npm run test -- --run

# Check contract setup
cd ../contracts/token-factory
cargo test
```

If all commands pass, your environment is ready for development.

## Development Workflow

### Creating a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features (e.g., `feature/add-token-burn`)
- `fix/` - Bug fixes (e.g., `fix/wallet-connection-timeout`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-validation`)
- `test/` - Test additions or updates (e.g., `test/add-mint-tests`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Making Changes

1. **Make your changes** in the appropriate directory:
   - Frontend changes: `frontend/src/`
   - Smart contract changes: `contracts/token-factory/src/`

2. **Write tests** for new functionality:
   - Frontend: Add tests in `frontend/src/test/` or co-locate with components
   - Contracts: Add tests in `contracts/token-factory/src/test.rs`

3. **Run tests locally** before committing:
   ```bash
   # Frontend tests
   cd frontend
   npm run test -- --run
   
   # Contract tests
   cd ../contracts/token-factory
   cargo test
   ```

4. **Run linting** to catch style issues:
   ```bash
   cd frontend
   npm run lint
   ```

5. **Commit your changes** (pre-commit hooks will run automatically):
   ```bash
   git add .
   git commit -m "feat: add token burn functionality"
   ```

### Pre-commit Hooks

This project uses **husky** and **lint-staged** to enforce code quality automatically before commits.

#### What Happens on Commit

When you commit changes, the pre-commit hook automatically:
- Runs ESLint on staged `.ts` and `.tsx` files in the `frontend/` directory
- Auto-fixes fixable linting errors
- Runs TypeScript type checking (`tsc --noEmit`)
- **Blocks the commit** if there are linting or TypeScript errors

#### Troubleshooting Pre-commit Hooks

If hooks aren't working or you need to reinstall them:

```bash
npm run prepare
```

To manually verify what the hooks will do:

```bash
cd frontend
npm run lint
tsc --noEmit
```

#### Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:

```bash
git commit --no-verify -m "your message"
```

**Note**: This is strongly discouraged as it may introduce code quality issues. Use only when absolutely necessary and document why.

## Commit Message Format

We follow the **Conventional Commits** specification for clear, semantic commit messages. This enables automated changelog generation and makes history easier to navigate.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, missing semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process, dependencies, or tooling

### Scope

Optional but recommended. Specify what part of the codebase is affected:

- `frontend` - Frontend changes
- `contracts` - Smart contract changes
- `wallet` - Wallet integration
- `ipfs` - IPFS/Pinata integration
- `ui` - UI components
- `hooks` - React hooks
- `utils` - Utility functions
- `config` - Configuration files

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period (.) at the end
- Limit to 50 characters

### Body

Optional but recommended for non-trivial changes:

- Explain **what** and **why**, not how
- Wrap at 72 characters
- Separate from subject with a blank line

### Footer

Optional. Reference issues and breaking changes:

- `Closes #123` - Auto-closes the issue
- `BREAKING CHANGE: description` - For breaking changes

### Examples

```bash
# Simple feature
git commit -m "feat(ui): add mainnet confirmation modal"

# Bug fix with body
git commit -m "fix(wallet): resolve connection timeout issue

The wallet connection was timing out after 5 seconds.
Increased timeout to 15 seconds and added retry logic."

# Breaking change
git commit -m "refactor(contracts): update token factory interface

BREAKING CHANGE: The create_token function signature has changed.
Callers must now provide a metadata_uri parameter."

# Closes an issue
git commit -m "feat(ipfs): add metadata pinning

Closes #42"
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream** to avoid conflicts:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all tests** locally:
   ```bash
   cd frontend
   npm run test -- --run
   npm run lint
   
   cd ../contracts/token-factory
   cargo test
   ```

3. **Update documentation** if needed (README, code comments, etc.)

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub with a clear title and description

3. **Fill out the PR template** with:
   - **Description**: What changes are being made and why
   - **Type of Change**: feat, fix, docs, refactor, etc.
   - **Related Issues**: Use `Closes #XX` to auto-close issues
   - **Testing**: Describe how you tested the changes
   - **Screenshots**: Include if UI changes are involved
   - **Checklist**: Confirm you've followed guidelines

### PR Title Format

Follow the same format as commit messages:

```
feat(scope): brief description
fix(scope): brief description
docs: update contributing guide
```

### Review Process

- At least one maintainer review is required
- Address feedback promptly
- Push additional commits to the same branch (don't force push)
- Request re-review after making changes
- Maintainers will merge when approved

### After Merge

- Delete your feature branch locally and remotely:
  ```bash
  git branch -d feature/your-feature-name
  git push origin --delete feature/your-feature-name
  ```

- Sync your fork with upstream:
  ```bash
  git fetch upstream
  git checkout main
  git merge upstream/main
  git push origin main
  ```

## Code Style Guidelines

### Frontend (TypeScript/React)

#### General Principles

- Use TypeScript for all new files (no `.js` files)
- Strict mode enabled: `strict: true` in tsconfig.json
- No unused variables or parameters
- No implicit `any` types

#### React Components

- Use functional components with hooks (no class components)
- Prefer composition over inheritance
- Keep components focused and single-responsibility
- Use descriptive component names (PascalCase)

```typescript
// Good
export function TokenForm({ onSubmit }: { onSubmit: (data: TokenData) => void }) {
  const [formData, setFormData] = useState<TokenData>(initialState);
  
  return (
    <form onSubmit={() => onSubmit(formData)}>
      {/* form content */}
    </form>
  );
}

// Avoid
export function TF(props: any) {
  // ...
}
```

#### Hooks

- Custom hooks should start with `use` prefix
- Extract complex logic into custom hooks
- Use proper dependency arrays in `useEffect`

```typescript
// Good
export function useTokenBalance(tokenId: string) {
  const [balance, setBalance] = useState<number>(0);
  
  useEffect(() => {
    fetchBalance(tokenId).then(setBalance);
  }, [tokenId]);
  
  return balance;
}
```

#### Styling

- Use Tailwind CSS utility classes
- Avoid inline styles
- Create reusable component variants using Tailwind
- Use CSS modules only for complex styling

```typescript
// Good
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>

// Avoid
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
  Submit
</button>
```

#### Accessibility

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Add ARIA labels for interactive elements
- Ensure keyboard navigation works
- Test with screen readers

```typescript
// Good
<button 
  aria-label="Close modal"
  onClick={onClose}
>
  ✕
</button>

// Avoid
<div onClick={onClose}>✕</div>
```

#### Testing

- Write tests for utilities and custom hooks
- Test user interactions, not implementation details
- Use React Testing Library for component tests
- Aim for meaningful coverage, not 100%

```typescript
// Good
test('submits form with valid data', () => {
  render(<TokenForm onSubmit={mockSubmit} />);
  userEvent.type(screen.getByLabelText('Token Name'), 'MyToken');
  userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'MyToken' }));
});
```

### Smart Contracts (Rust)

#### Formatting

All Rust code **must** be formatted with `cargo fmt` before committing. CI enforces this with `cargo fmt -- --check` and will fail if any file is not formatted.

```bash
# Format all Rust files
cd contracts
cargo fmt

# Verify formatting (what CI runs)
cargo fmt -- --check
```

#### General Principles

- Follow Rust naming conventions (snake_case for functions/variables, PascalCase for types)
- Use meaningful variable and function names
- Add doc comments for all public functions
- Handle errors explicitly (no unwrap in production code)

#### Documentation

- Add doc comments to all public functions and types
- Include examples in doc comments where helpful
- Document error conditions

```rust
/// Creates a new token in the factory.
///
/// # Arguments
///
/// * `name` - The token name
/// * `symbol` - The token symbol
/// * `decimals` - Number of decimal places
///
/// # Returns
///
/// The address of the newly created token
///
/// # Errors
///
/// Returns an error if the token name is empty or if the factory is paused.
pub fn create_token(
    env: &Env,
    name: String,
    symbol: String,
    decimals: u32,
) -> Result<Address, ContractError> {
    // implementation
}
```

#### Error Handling

- Use `Result` types for fallible operations
- Define custom error types
- Provide meaningful error messages

```rust
// Good
pub fn mint_tokens(
    env: &Env,
    token_id: Address,
    amount: i128,
) -> Result<(), ContractError> {
    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }
    // implementation
}

// Avoid
pub fn mint_tokens(env: &Env, token_id: Address, amount: i128) {
    let result = perform_mint(token_id, amount).unwrap(); // Don't unwrap!
}
```

#### Testing

- Write comprehensive tests for all contract functions
- Test both success and error cases
- Use property-based testing with proptest for complex logic

```rust
#[test]
fn test_create_token_success() {
    let env = Env::default();
    let factory = TokenFactory::new(&env);
    
    let token_addr = factory.create_token(
        String::from_utf8(b"MyToken".to_vec()).unwrap(),
        String::from_utf8(b"MTK".to_vec()).unwrap(),
        18,
    ).unwrap();
    
    assert!(token_addr.is_valid());
}

#[test]
fn test_create_token_empty_name() {
    let env = Env::default();
    let factory = TokenFactory::new(&env);
    
    let result = factory.create_token(
        String::from_utf8(vec![]).unwrap(),
        String::from_utf8(b"MTK".to_vec()).unwrap(),
        18,
    );
    
    assert!(result.is_err());
}
```

## Running Tests

### Frontend Tests

```bash
cd frontend

# Run all tests once
npm run test -- --run

# Run tests in watch mode (for development)
npm run test

# Run tests with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Smart Contract Tests

```bash
cd contracts/token-factory

# Run all tests
cargo test

# Run specific test
cargo test test_create_token

# Run tests with output
cargo test -- --nocapture

# Run tests with coverage (requires tarpaulin)
cargo tarpaulin --out Html
```

### Running All Tests

From the root directory:

```bash
# Frontend
cd frontend && npm run test -- --run && cd ..

# Contracts
cd contracts/token-factory && cargo test && cd ../..
```

## Adding a New Language

StellarForge is designed to support multiple languages for the UI. To add a new language:

### Step 1: Create Language Configuration

Create a new language file in `frontend/src/config/i18n/`:

```typescript
// frontend/src/config/i18n/es.ts
export const es = {
  common: {
    submit: 'Enviar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
  },
  tokens: {
    create: 'Crear Token',
    name: 'Nombre del Token',
  },
  // ... more translations
};
```

### Step 2: Register Language

Update the language registry in `frontend/src/config/i18n/index.ts`:

```typescript
import { es } from './es';

export const languages = {
  en: en,
  es: es,
  // ... other languages
};

export type Language = keyof typeof languages;
```

### Step 3: Update Language Selector

Update the language selector component to include the new language:

```typescript
// frontend/src/components/LanguageSelector.tsx
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  // ... add new language
];
```

### Step 4: Test

- Test the language switcher
- Verify all UI text displays correctly
- Check for text overflow issues
- Test with RTL languages if applicable

### Step 5: Submit PR

Include in your PR:
- Complete translation file
- Screenshots showing the new language in use
- Any special considerations (RTL, character encoding, etc.)

## SDK Upgrade Process

### Current Pinned Versions

The contracts currently pin the following SDK versions in `contracts/token-factory/Cargo.toml`:

| Crate | Version | Reason |
|-------|---------|--------|
| `soroban-sdk` | `25.0.0` | Matches Stellar Protocol 22 (the current mainnet protocol). Pinned to avoid unexpected breaking changes from minor/patch releases. |
| `soroban-token-sdk` | `25.0.0` | Must match `soroban-sdk` exactly — mismatched versions cause type incompatibilities at compile time. |

> **Important:** `soroban-sdk` and `soroban-token-sdk` must always be on the **same version**. When upgrading one, upgrade both together.

### Upgrading soroban-sdk

When upgrading Soroban SDK or other major dependencies, follow this process:

#### Step 1: Plan the Upgrade

- Check the [soroban-sdk CHANGELOG](https://github.com/stellar/rs-soroban-sdk/blob/main/CHANGELOG.md) for breaking changes
- Check the [soroban-token-sdk releases](https://github.com/stellar/rs-soroban-sdk/releases) — confirm the matching version
- Review migration guides
- Identify affected code

#### Step 2: Update Dependencies

Edit `contracts/token-factory/Cargo.toml` to set the new version for **both** crates:

```toml
[dependencies]
soroban-sdk = "NEW_VERSION"
soroban-token-sdk = { version = "NEW_VERSION" }

[dev-dependencies]
soroban-sdk = { version = "NEW_VERSION", features = ["testutils"] }
```

Then regenerate the lockfile:

```bash
cd contracts
cargo update
```

#### Step 3: Update Code

- Fix any breaking changes in the contract code
- Update TypeScript types if needed
- Update configuration files

#### Step 4: Test Thoroughly

```bash
# Contract tests
cd contracts/token-factory
cargo test

# Frontend tests
cd frontend
npm run test -- --run
npm run lint

# Manual testing on testnet
# Deploy to testnet and test all features
```

#### Step 5: Document Changes

- Update CHANGELOG.md with upgrade details
- Document any breaking changes
- Update the version table in this section of CONTRIBUTING.md
- Update README if needed

#### Step 6: Submit PR

Include in your PR:
- Dependency update commits
- Code changes for compatibility
- Updated documentation (including the version table above)
- Test results

### Example: Upgrading Soroban SDK

```bash
# 1. Edit contracts/token-factory/Cargo.toml — bump both soroban-sdk and soroban-token-sdk

# 2. Regenerate lockfile
cd contracts && cargo update

# 3. Fix any compilation errors
cargo build --target wasm32-unknown-unknown

# 4. Run tests
cd token-factory && cargo test

# 5. Update CHANGELOG.md
# Add entry: "Upgraded soroban-sdk and soroban-token-sdk to vX.Y.Z"

# 6. Commit
git commit -m "chore(contracts): upgrade soroban-sdk and soroban-token-sdk to vX.Y.Z"
```

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Security

### Before Contributing

- Review our [Security Policy](SECURITY.md)
- Understand the security considerations for blockchain applications

### Security Best Practices

- **Never commit sensitive data**: Private keys, API secrets, or credentials
- **Always test on testnet first**: Before any mainnet deployment
- **Validate user input**: Especially for contract interactions
- **Use secure random generation**: For any cryptographic operations
- **Handle errors gracefully**: Don't expose sensitive information in error messages

### Reporting Security Vulnerabilities

If you discover a security vulnerability:

1. **Do not open a public issue**
2. **Email security details** to the maintainers (see SECURITY.md)
3. **Include**: Description, affected versions, reproduction steps, and potential impact
4. **Allow time** for the team to respond and prepare a fix

See [SECURITY.md](SECURITY.md) for detailed vulnerability reporting procedures.

## Getting Help

### Questions or Need Assistance?

- **GitHub Discussions**: Ask questions in the Discussions tab
- **GitHub Issues**: Search existing issues or create a new one
- **Documentation**: Check README.md and existing docs
- **Code Examples**: Review existing components and tests

### Common Issues

#### Pre-commit hooks not running

```bash
npm run prepare
```

#### Tests failing locally

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run test -- --run
```

#### Rust compilation errors

```bash
# Update Rust
rustup update

# Clean build
cd contracts/token-factory
cargo clean
cargo build --target wasm32-unknown-unknown
```

#### Wallet connection issues

- Ensure Freighter wallet is installed
- Check that you're on the correct network (testnet/mainnet)
- Clear browser cache and reload

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

Thank you for contributing to StellarForge! Your efforts help make token deployment on Stellar accessible to everyone.
