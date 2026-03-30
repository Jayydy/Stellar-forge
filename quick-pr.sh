#!/bin/bash

echo "=== Quick PR Setup for Stellar-forge ==="
echo ""
echo "Step 1: Authenticate with GitHub"
echo "Run: gh auth login"
echo "  - Choose: GitHub.com"
echo "  - Choose: HTTPS"
echo "  - Authenticate with: Login with a web browser"
echo ""
read -p "Press Enter after you've authenticated..."
echo ""

echo "Step 2: Fork the repository"
gh repo fork Ejirowebfi/Stellar-forge --clone=false --remote=true --remote-name=myfork
echo ""

echo "Step 3: Push your branch to your fork"
git push -u myfork feature/error-handling-system
echo ""

echo "Step 4: Create Pull Request"
gh pr create --repo Ejirowebfi/Stellar-forge \
  --base main \
  --head $(gh api user --jq .login):feature/error-handling-system \
  --title "feat: Add comprehensive error handling system" \
  --body "$(cat PULL_REQUEST.md)"

echo ""
echo "✅ Done! Your PR has been created!"
