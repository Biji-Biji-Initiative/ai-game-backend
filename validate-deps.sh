#!/bin/bash
# Validate dependencies across monorepo packages

echo "🔍 Validating monorepo dependencies..."

# Check for duplicate dependencies across packages
echo "Checking for duplicate dependencies in package.json files..."
ROOT_DEPS=$(jq -r '.dependencies | keys[]' package.json 2>/dev/null || echo "")
ROOT_DEV_DEPS=$(jq -r '.devDependencies | keys[]' package.json 2>/dev/null || echo "")

for PKG_DIR in packages/*; do
  if [ -f "$PKG_DIR/package.json" ]; then
    PKG_NAME=$(jq -r '.name' "$PKG_DIR/package.json")
    echo "Checking $PKG_NAME..."

    # Get package dependencies
    PKG_DEPS=$(jq -r '.dependencies | keys[]' "$PKG_DIR/package.json" 2>/dev/null || echo "")
    PKG_DEV_DEPS=$(jq -r '.devDependencies | keys[]' "$PKG_DIR/package.json" 2>/dev/null || echo "")

    # Check for duplicates with root
    for DEP in $PKG_DEPS; do
      if echo "$ROOT_DEPS" | grep -q "^$DEP$"; then
        echo "⚠️  $PKG_NAME has dependency '$DEP' that already exists in root"
      fi
    done

    for DEP in $PKG_DEV_DEPS; do
      if echo "$ROOT_DEV_DEPS" | grep -q "^$DEP$"; then
        echo "⚠️  $PKG_NAME has devDependency '$DEP' that already exists in root"
      fi
    done
  fi
done

# Check for bad local package references
echo "Checking for proper local package references..."
for PKG_DIR in packages/*; do
  if [ -f "$PKG_DIR/package.json" ]; then
    PKG_NAME=$(jq -r '.name' "$PKG_DIR/package.json")
    WORKSPACE_DEPS=$(jq -r '.dependencies | with_entries(select(.key | startswith("@ai-fight-club/"))) | keys[]' "$PKG_DIR/package.json" 2>/dev/null || echo "")

    for DEP in $WORKSPACE_DEPS; do
      DEP_VALUE=$(jq -r ".dependencies[\"$DEP\"]" "$PKG_DIR/package.json")
      if [[ $DEP_VALUE != "workspace:"* && $DEP_VALUE != "*" ]]; then
        echo "⚠️  $PKG_NAME references workspace package $DEP incorrectly: '$DEP_VALUE'"
        echo "    Should be 'workspace:*' for pnpm"
      fi
    done
  fi
done

echo "✅ Validation complete"
