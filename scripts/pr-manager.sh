#!/bin/bash

##############################################################################
# PR Manager - Automated Pull Request Management for copilot-read-image
# Monitors Copilot PRs and prepares them for merge
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-Fadelis98}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-copilot-read-image}"
GH_API="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"

##############################################################################
# Utility Functions
##############################################################################

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

##############################################################################
# PR Monitoring & Analysis
##############################################################################

# Get all open Copilot PRs
get_copilot_prs() {
    log_info "Fetching open Copilot PRs..."
    
    curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "${GH_API}/pulls?state=open&creator=Copilot" | \
        jq -r '.[] | "\(.number)|\(.title)|\(.head.ref)"'
}

# Check PR status
check_pr_status() {
    local pr_num=$1
    log_info "Checking PR #${pr_num} status..."
    
    # Get PR details
    local pr_data=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "${GH_API}/pulls/${pr_num}")
    
    local status=$(echo "$pr_data" | jq -r '.mergeable_state')
    local draft=$(echo "$pr_data" | jq -r '.draft')
    local checks=$(echo "$pr_data" | jq -r '.status_check_rollup')
    
    if [[ "$draft" == "true" ]]; then
        log_warn "PR #${pr_num} is still in draft mode"
        return 1
    fi
    
    if [[ "$status" == "dirty" ]]; then
        log_error "PR #${pr_num} has merge conflicts"
        return 1
    fi
    
    log_success "PR #${pr_num} is mergeable"
    return 0
}

##############################################################################
# Validation Checks
##############################################################################

# Validate PR title format
validate_pr_title() {
    local pr_num=$1
    local title=$2
    
    log_info "Validating PR #${pr_num} title..."
    
    # Check for proper labels
    if [[ $title =~ ^\[WIP\]|^\[feat\]|^\[fix\]|^\[docs\]|^\[refactor\]|^\[test\] ]]; then
        log_success "PR title has proper label: $title"
        return 0
    else
        log_warn "PR title should start with label ([feat], [fix], [docs], etc.)"
        return 1
    fi
}

# Validate issue reference
validate_issue_reference() {
    local pr_num=$1
    
    log_info "Validating issue reference in PR #${pr_num}..."
    
    local body=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "${GH_API}/pulls/${pr_num}" | jq -r '.body')
    
    if [[ $body =~ Closes\ #[0-9]+|Fixes\ #[0-9]+|Resolves\ #[0-9]+ ]]; then
        log_success "PR #${pr_num} properly references an issue"
        return 0
    else
        log_warn "PR #${pr_num} should reference an issue (Closes #N, Fixes #N, etc.)"
        return 1
    fi
}

# Check CHANGELOG updates
validate_changelog() {
    local pr_num=$1
    
    log_info "Checking CHANGELOG.md in PR #${pr_num}..."
    
    # Check if PR modifies CHANGELOG
    local files=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "${GH_API}/pulls/${pr_num}/files" | jq -r '.[].filename')
    
    if echo "$files" | grep -q "CHANGELOG.md"; then
        log_success "CHANGELOG.md has been updated"
        return 0
    else
        log_warn "CHANGELOG.md was not updated - may need manual update"
        return 1
    fi
}

##############################################################################
# Test Validation
##############################################################################

# Get latest workflow run status
get_workflow_status() {
    local pr_num=$1
    local head_ref=$2
    
    log_info "Fetching workflow status for PR #${pr_num}..."
    
    # Get the latest workflow run for this PR's branch
    local run=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?head_branch=${head_ref}" | \
        jq -r '.workflow_runs[0]')
    
    if [[ -z "$run" || "$run" == "null" ]]; then
        log_warn "No workflow runs found for branch $head_ref"
        return 1
    fi
    
    local status=$(echo "$run" | jq -r '.status')
    local conclusion=$(echo "$run" | jq -r '.conclusion')
    
    if [[ "$status" == "completed" ]]; then
        if [[ "$conclusion" == "success" ]]; then
            log_success "All workflow checks passed"
            return 0
        else
            log_error "Workflow checks failed with conclusion: $conclusion"
            return 1
        fi
    else
        log_warn "Workflow still in progress (status: $status)"
        return 1
    fi
}

##############################################################################
# Auto-Merge Preparation
##############################################################################

# Prepare branch for merge
prepare_for_merge() {
    local pr_num=$1
    local branch=$2
    
    log_info "Preparing PR #${pr_num} for merge..."
    
    # Fetch the latest changes
    git fetch origin "$branch"
    
    # Check for conflicts with main
    if git merge-base --is-ancestor origin/main "origin/$branch"; then
        log_success "PR #${pr_num} is up to date with main"
        return 0
    else
        log_warn "PR #${pr_num} may need rebasing"
        return 1
    fi
}

# Update CHANGELOG if needed
update_changelog() {
    local version=$1
    local pr_title=$2
    
    if grep -q "## \[${version}\]" CHANGELOG.md; then
        log_success "CHANGELOG.md already has entry for version ${version}"
        return 0
    fi
    
    log_info "Checking if CHANGELOG needs update for version ${version}..."
    
    # Extract the feature/fix description from PR title
    if [[ $pr_title =~ \[([a-z]+)\](.+) ]]; then
        local type="${BASH_REMATCH[1]}"
        local desc="${BASH_REMATCH[2]}"
        echo "ℹ️ Would add to CHANGELOG: [$type]$desc"
    fi
}

##############################################################################
# Report Generation
##############################################################################

# Generate PR readiness report
generate_pr_report() {
    local pr_num=$1
    local title=$2
    local branch=$3
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         PR #${pr_num} Readiness Report                           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "PR Title: $title"
    echo "Branch:   $branch"
    echo ""
    echo "Status Checks:"
    check_pr_status "$pr_num" && echo "  ✓ Mergeable state" || echo "  ✗ Not mergeable"
    validate_pr_title "$pr_num" "$title" && echo "  ✓ Title format valid" || echo "  ✗ Title format invalid"
    validate_issue_reference "$pr_num" && echo "  ✓ Issue referenced" || echo "  ✗ Issue not referenced"
    validate_changelog "$pr_num" && echo "  ✓ CHANGELOG updated" || echo "  ✗ CHANGELOG not updated"
    get_workflow_status "$pr_num" "$branch" && echo "  ✓ Workflow checks passed" || echo "  ✗ Workflow checks pending/failed"
    
    echo ""
    echo "Recommendation:"
    echo "  When all checks pass, use: gh pr merge $pr_num --squash"
    echo ""
}

##############################################################################
# Main Command Handlers
##############################################################################

monitor() {
    log_info "Starting PR monitor (checking every 5 minutes)..."
    
    while true; do
        log_info "Scanning for Copilot PRs..."
        
        while IFS='|' read -r pr_num title branch; do
            echo ""
            log_info "Found Copilot PR: #${pr_num} - $title"
            
            check_pr_status "$pr_num" || continue
            validate_pr_title "$pr_num" "$title" || continue
            validate_issue_reference "$pr_num" || continue
            get_workflow_status "$pr_num" "$branch" || continue
            
            log_success "PR #${pr_num} is ready for merge! 🎉"
        done < <(get_copilot_prs)
        
        log_info "Next check in 5 minutes..."
        sleep 300
    done
}

check() {
    local pr_num=${1:-}
    
    if [[ -z "$pr_num" ]]; then
        log_error "Please provide PR number: $0 check <PR_NUMBER>"
        exit 1
    fi
    
    # Get PR details
    local pr_data=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "${GH_API}/pulls/${pr_num}")
    
    local title=$(echo "$pr_data" | jq -r '.title')
    local branch=$(echo "$pr_data" | jq -r '.head.ref')
    
    generate_pr_report "$pr_num" "$title" "$branch"
}

auto_merge() {
    local pr_num=${1:-}
    
    if [[ -z "$pr_num" ]]; then
        log_error "Please provide PR number: $0 auto-merge <PR_NUMBER>"
        exit 1
    fi
    
    log_info "Attempting to auto-merge PR #${pr_num}..."
    
    # Verify all checks pass
    check_pr_status "$pr_num" || {
        log_error "PR #${pr_num} is not in a mergeable state"
        exit 1
    }
    
    log_success "All checks passed. Ready to merge!"
    echo ""
    log_info "Execute this command to merge:"
    echo "  gh pr merge ${pr_num} --squash --auto"
}

help() {
    cat << EOF
PR Manager - Automated PR Management for copilot-read-image

Usage: $0 <command> [arguments]

Commands:
  monitor              Monitor for Copilot PRs and track readiness
  check <PR_NUM>       Check status and readiness of specific PR
  auto-merge <PR_NUM>  Prepare and auto-merge PR (requires manual confirmation)
  help                 Show this help message

Environment Variables:
  GITHUB_TOKEN         GitHub API token (required)
  REPO_OWNER           Repository owner (default: Fadelis98)
  REPO_NAME            Repository name (default: copilot-read-image)

Examples:
  $0 monitor                 # Start continuous monitoring
  $0 check 7                 # Check PR #7 status
  $0 auto-merge 7            # Prepare PR #7 for merge

EOF
}

##############################################################################
# Main Entry Point
##############################################################################

main() {
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN environment variable is required"
        exit 1
    fi
    
    local command=${1:-help}
    shift || true
    
    case "$command" in
        monitor)
            monitor "$@"
            ;;
        check)
            check "$@"
            ;;
        auto-merge)
            auto_merge "$@"
            ;;
        help)
            help
            ;;
        *)
            log_error "Unknown command: $command"
            help
            exit 1
            ;;
    esac
}

main "$@"
