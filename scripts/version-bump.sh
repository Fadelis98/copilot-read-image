#!/bin/bash

##############################################################################
# Version Management Script
# Manages semantic versioning and CHANGELOG updates
##############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

##############################################################################
# Get current version from package.json
##############################################################################

get_current_version() {
    grep '"version"' package.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/'
}

##############################################################################
# Semantic versioning functions
##############################################################################

bump_major() {
    local version=$1
    echo "$version" | awk -F. '{print $1+1 ".0.0"}'
}

bump_minor() {
    local version=$1
    echo "$version" | awk -F. '{print $1"."$2+1".0"}'
}

bump_patch() {
    local version=$1
    echo "$version" | awk -F. '{print $1"."$2"."$3+1}'
}

##############################################################################
# Update package.json version
##############################################################################

update_package_version() {
    local old_version=$1
    local new_version=$2
    
    sed -i "s/\"version\": \"${old_version}\"/\"version\": \"${new_version}\"/" package.json
    echo -e "${GREEN}✓${NC} Updated package.json to version ${new_version}"
}

##############################################################################
# Update CHANGELOG.md
##############################################################################

update_changelog() {
    local new_version=$1
    local release_date=$(date +%Y-%m-%d)
    local change_type=$2  # "feature", "fix", "docs", etc.
    local description=$3
    
    # Create a temporary changelog with new entry
    cat > CHANGELOG.tmp << EOF
## [${new_version}] - ${release_date}

### ${change_type^}
- ${description}

$(cat CHANGELOG.md)
EOF
    
    mv CHANGELOG.tmp CHANGELOG.md
    echo -e "${GREEN}✓${NC} Updated CHANGELOG.md with version ${new_version}"
}

##############################################################################
# Create git tag and commit
##############################################################################

create_version_commit() {
    local version=$1
    
    git add package.json CHANGELOG.md
    git commit -m "chore: bump version to ${version}"
    git tag "v${version}" -m "Release version ${version}"
    
    echo -e "${GREEN}✓${NC} Created version commit and tag: v${version}"
}

##############################################################################
# Interactive version bump
##############################################################################

interactive_bump() {
    local current=$(get_current_version)
    
    echo ""
    echo -e "${BLUE}Current version: ${current}${NC}"
    echo ""
    echo "Select bump type:"
    echo "  1) Major ($(bump_major $current))"
    echo "  2) Minor ($(bump_minor $current))"
    echo "  3) Patch ($(bump_patch $current))"
    echo ""
    read -p "Choice [1-3]: " choice
    
    case $choice in
        1)
            new_version=$(bump_major $current)
            bump_type="MAJOR"
            ;;
        2)
            new_version=$(bump_minor $current)
            bump_type="MINOR"
            ;;
        3)
            new_version=$(bump_patch $current)
            bump_type="PATCH"
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "Describe main change for this version:"
    read -p "Change description: " change_desc
    
    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo "  Version:     ${current} → ${new_version}"
    echo "  Bump type:   ${bump_type}"
    echo "  Description: ${change_desc}"
    echo ""
    
    read -p "Confirm? (y/n): " confirm
    if [[ "$confirm" != "y" ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    update_package_version "$current" "$new_version"
    update_changelog "$new_version" "$(echo $bump_type | tr '[:upper:]' '[:lower:]')" "$change_desc"
    create_version_commit "$new_version"
    
    echo ""
    echo -e "${GREEN}Version ${new_version} ready!${NC}"
    echo "Run: git push origin main && git push origin v${new_version}"
}

##############################################################################
# Non-interactive version bump (for CI/CD)
##############################################################################

auto_bump() {
    local bump_type=$1  # major, minor, patch
    local description=$2
    
    local current=$(get_current_version)
    
    case $bump_type in
        major)
            new_version=$(bump_major $current)
            ;;
        minor)
            new_version=$(bump_minor $current)
            ;;
        patch)
            new_version=$(bump_patch $current)
            ;;
        *)
            echo "Invalid bump type: $bump_type"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}Auto-bumping version: ${current} → ${new_version}${NC}"
    
    update_package_version "$current" "$new_version"
    update_changelog "$new_version" "$bump_type" "$description"
    create_version_commit "$new_version"
    
    echo -e "${GREEN}✓ Version bumped to ${new_version}${NC}"
}

##############################################################################
# Show version info
##############################################################################

show_version() {
    local current=$(get_current_version)
    echo "Current version: $current"
    
    # Show last 3 entries from CHANGELOG
    echo ""
    echo "Recent releases:"
    head -20 CHANGELOG.md | tail -15
}

##############################################################################
# Main entry point
##############################################################################

main() {
    local command=${1:-interactive}
    
    case $command in
        interactive|bump)
            interactive_bump
            ;;
        auto)
            if [[ $# -lt 3 ]]; then
                echo "Usage: $0 auto <major|minor|patch> <description>"
                exit 1
            fi
            auto_bump "$2" "$3"
            ;;
        show|version|current)
            show_version
            ;;
        *)
            echo "Usage: $0 [interactive|auto|show]"
            exit 1
            ;;
    esac
}

main "$@"
