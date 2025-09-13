#!/bin/bash
# Setup convenient git aliases for Pactoria MVP development

echo "Setting up git aliases for safer operations..."

# Safe pull alias
git config alias.safe-pull '!./scripts/git-helper.sh pull'

# Clean repository alias
git config alias.clean-repo '!./scripts/git-helper.sh clean'

# Safe commit alias
git config alias.safe-commit '!./scripts/git-helper.sh commit'

# Health check alias
git config alias.health '!./scripts/git-helper.sh health'

# Setup development environment
git config alias.setup-dev '!./scripts/git-helper.sh setup'

# Improved status with branch info
git config alias.st 'status -sb'

# Better log
git config alias.lg 'log --oneline --graph --decorate --all -10'

# Show last commit
git config alias.last 'log -1 HEAD --stat'

# Quick add and commit
git config alias.ac '!git add -A && git commit -m'

# Force push with lease (safer than force push)
git config alias.pushf 'push --force-with-lease'

echo "✅ Git aliases configured successfully!"
echo ""
echo "Available aliases:"
echo "  git safe-pull    - Safely pull with automatic stashing/rebasing"
echo "  git clean-repo   - Clean cache files and repository"
echo "  git safe-commit  - Commit with automatic cleanup"
echo "  git health       - Check repository health"
echo "  git setup-dev    - Setup development environment"
echo "  git st           - Improved status with branch info"
echo "  git lg           - Better log with graph"
echo "  git last         - Show last commit with stats"
echo "  git ac \"msg\"     - Quick add all and commit"
echo "  git pushf        - Safe force push with lease"
echo ""
echo "🎉 You can now use these commands for safer git operations!"