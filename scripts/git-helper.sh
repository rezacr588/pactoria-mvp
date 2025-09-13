#!/bin/bash
# Git Helper Scripts for Pactoria MVP
# Provides safe git operations and maintenance commands

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to safely pull changes
safe_pull() {
    print_status "Performing safe git pull..."
    
    # Check if we have uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes. Stashing them first..."
        git stash push -m "Auto-stash before safe pull $(date)"
        local stashed=true
    fi
    
    # Fetch latest changes
    print_status "Fetching latest changes..."
    git fetch origin
    
    # Check if we're behind
    local behind=$(git rev-list --count HEAD..origin/$(git branch --show-current))
    if [ "$behind" -eq 0 ]; then
        print_success "Already up to date!"
        if [ "$stashed" = true ]; then
            print_status "Restoring stashed changes..."
            git stash pop
        fi
        return 0
    fi
    
    print_status "Behind by $behind commits. Pulling with rebase..."
    
    # Pull with rebase
    if git pull --rebase origin $(git branch --show-current); then
        print_success "Successfully pulled and rebased!"
    else
        print_error "Rebase failed. You may need to resolve conflicts."
        print_status "Use 'git status' to see conflicts, then 'git rebase --continue' after resolving."
        return 1
    fi
    
    # Restore stashed changes if any
    if [ "$stashed" = true ]; then
        print_status "Restoring stashed changes..."
        if git stash pop; then
            print_success "Stashed changes restored successfully!"
        else
            print_warning "Failed to restore stashed changes. Check 'git stash list'"
        fi
    fi
}

# Function to clean repository
clean_repo() {
    print_status "Cleaning repository..."
    
    # Remove Python cache files
    print_status "Removing Python cache files..."
    find . -name "__pycache__" -type d -not -path "./backend/venv/*" -not -path "./venv/*" -not -path "./.venv/*" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -not -path "./backend/venv/*" -not -path "./venv/*" -not -path "./.venv/*" -delete 2>/dev/null || true
    find . -name "*.pyo" -not -path "./backend/venv/*" -not -path "./venv/*" -not -path "./.venv/*" -delete 2>/dev/null || true
    
    # Remove system files
    print_status "Removing system files..."
    find . -name ".DS_Store" -delete 2>/dev/null || true
    find . -name "Thumbs.db" -delete 2>/dev/null || true
    
    # Remove log files (but keep .gitkeep)
    print_status "Cleaning log files..."
    find . -name "*.log" -not -name ".gitkeep" -not -path "./backend/venv/*" -delete 2>/dev/null || true
    
    # Clean git
    print_status "Cleaning git repository..."
    git gc --prune=now
    
    print_success "Repository cleaned successfully!"
}

# Function to safely commit changes
safe_commit() {
    local message="$1"
    
    if [ -z "$message" ]; then
        print_error "Commit message is required!"
        print_status "Usage: $0 commit \"Your commit message\""
        return 1
    fi
    
    print_status "Performing safe commit..."
    
    # Clean repository first
    clean_repo
    
    # Check for changes
    if git diff-index --quiet HEAD --; then
        print_warning "No changes to commit!"
        return 0
    fi
    
    # Show status
    print_status "Current git status:"
    git status --short
    
    # Add all changes
    print_status "Adding all changes..."
    git add .
    
    # Commit
    print_status "Committing with message: '$message'"
    if git commit -m "$message"; then
        print_success "Successfully committed changes!"
    else
        print_error "Commit failed!"
        return 1
    fi
}

# Function to check repository health
check_health() {
    print_status "Checking repository health..."
    
    # Check git status
    print_status "Git Status:"
    git status
    
    # Check for merge conflicts
    if git ls-files -u | wc -l | grep -q "^0$"; then
        print_success "No merge conflicts detected"
    else
        print_warning "Merge conflicts detected!"
        git ls-files -u
    fi
    
    # Check for cache files
    local cache_files=$(find . -name "__pycache__" -type d -not -path "./backend/venv/*" -not -path "./venv/*" -not -path "./.venv/*" | wc -l)
    if [ "$cache_files" -eq 0 ]; then
        print_success "No cache files found"
    else
        print_warning "Found $cache_files cache directories"
    fi
    
    # Check branch status
    local branch=$(git branch --show-current)
    local ahead=$(git rev-list --count origin/$branch..HEAD 2>/dev/null || echo "0")
    local behind=$(git rev-list --count HEAD..origin/$branch 2>/dev/null || echo "0")
    
    print_status "Branch: $branch"
    print_status "Ahead: $ahead commits"
    print_status "Behind: $behind commits"
    
    if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
        print_warning "Branch has diverged! Consider pulling first."
    elif [ "$behind" -gt 0 ]; then
        print_warning "Branch is behind. Consider pulling."
    elif [ "$ahead" -gt 0 ]; then
        print_status "Ready to push $ahead commits."
    else
        print_success "Branch is up to date!"
    fi
}

# Function to setup development environment
setup_dev() {
    print_status "Setting up development environment..."
    
    # Configure git settings
    print_status "Configuring git settings..."
    git config pull.rebase true
    git config rebase.autoStash true
    git config branch.autosetupmerge always
    git config branch.autosetuprebase always
    
    # Clean repository
    clean_repo
    
    print_success "Development environment setup complete!"
    print_status "Git is now configured to:"
    print_status "  - Use rebase for pulls"
    print_status "  - Auto-stash during rebase"
    print_status "  - Setup tracking for new branches"
    print_status "  - Use rebase for new branches"
}

# Main script logic
case "${1:-help}" in
    "pull")
        safe_pull
        ;;
    "clean")
        clean_repo
        ;;
    "commit")
        safe_commit "$2"
        ;;
    "health")
        check_health
        ;;
    "setup")
        setup_dev
        ;;
    "help"|*)
        echo "Git Helper Scripts for Pactoria MVP"
        echo ""
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  pull     - Safely pull changes with rebase"
        echo "  clean    - Clean cache files and repository"
        echo "  commit   - Safely commit changes with cleanup"
        echo "  health   - Check repository health"
        echo "  setup    - Setup development environment"
        echo "  help     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 pull"
        echo "  $0 commit \"Fix authentication bug\""
        echo "  $0 clean"
        echo "  $0 health"
        ;;
esac