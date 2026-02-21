---
name: audit
description: Perform a full-spectrum audit covering Claude Code config, security, code quality, architecture, dependencies, and DevOps hygiene. Run with /audit.
user-invocable: true
---

# Full-Spectrum Project & Claude Code Audit

You are performing an exhaustive audit of this project. This covers SIX domains:
1. Claude Code configuration
2. Codebase security
3. Code quality & patterns
4. Architecture & structure
5. Dependency health
6. Git & DevOps hygiene

Take your time. Be thorough. Read files when needed. Cost and tokens do not matter — completeness does.

---

## Phase 1: Discovery

Run ALL of the following scans. Store every output for Phase 2 evaluation.

### 1.1 Project Identity & Tech Stack Detection

```bash
bash -c '
echo "=== PROJECT ROOT ==="
pwd
echo ""

echo "=== TECH STACK ==="
# Node/JS/TS
if [ -f package.json ]; then
  echo "Node.js project detected"
  NAME=$(sed -n "s/.*\"name\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" package.json | head -1)
  echo "  Name: $NAME"
  [ -f pnpm-workspace.yaml ] && echo "  Monorepo: pnpm workspaces"
  [ -f lerna.json ] && echo "  Monorepo: lerna"
  [ -f turbo.json ] && echo "  Monorepo: turborepo"
  [ -f nx.json ] && echo "  Monorepo: nx"
  [ -f yarn.lock ] && echo "  Lockfile: yarn.lock"
  [ -f pnpm-lock.yaml ] && echo "  Lockfile: pnpm-lock.yaml"
  [ -f package-lock.json ] && echo "  Lockfile: package-lock.json"
  [ -f bun.lockb ] && echo "  Lockfile: bun.lockb"
  [ -f tsconfig.json ] && echo "  TypeScript: yes"
  [ -f .babelrc ] || [ -f babel.config.js ] || [ -f babel.config.json ] && echo "  Babel: yes"
fi

# Python
[ -f pyproject.toml ] && echo "Python project (pyproject.toml)"
[ -f requirements.txt ] && echo "Python project (requirements.txt)"
[ -f Pipfile ] && echo "Python project (Pipfile)"
[ -f setup.py ] && echo "Python project (setup.py)"
[ -f poetry.lock ] && echo "  Poetry lockfile detected"

# Go
[ -f go.mod ] && echo "Go project: $(head -1 go.mod)"

# Rust
[ -f Cargo.toml ] && echo "Rust project detected"

# Solidity / Web3
if ls foundry.toml hardhat.config.* 2>/dev/null | head -1 > /dev/null 2>&1; then
  [ -f foundry.toml ] && echo "Solidity: Foundry"
  ls hardhat.config.* 2>/dev/null && echo "Solidity: Hardhat"
fi

# Daml
ls *.daml daml.yaml 2>/dev/null | head -1 > /dev/null 2>&1 && echo "Daml project detected"

# Other
[ -f composer.json ] && echo "PHP (Composer)"
[ -f Gemfile ] && echo "Ruby (Bundler)"
[ -f build.gradle ] || [ -f pom.xml ] && echo "Java/Kotlin"
[ -f Dockerfile ] && echo "Docker: yes"
[ -f docker-compose.yml ] || [ -f docker-compose.yaml ] && echo "Docker Compose: yes"

echo ""
echo "=== FRAMEWORK DETECTION ==="
if [ -f package.json ]; then
  for fw in next react vue angular svelte express fastify nestjs nuxt gatsby remix vite astro; do
    grep -q "\"$fw\"" package.json 2>/dev/null && echo "  Framework/Lib: $fw"
  done
  grep -q "\"hardhat\"" package.json 2>/dev/null && echo "  Framework/Lib: hardhat"
  grep -q "\"ethers\"" package.json 2>/dev/null && echo "  Framework/Lib: ethers"
  grep -q "\"viem\"" package.json 2>/dev/null && echo "  Framework/Lib: viem"
  grep -q "\"wagmi\"" package.json 2>/dev/null && echo "  Framework/Lib: wagmi"
  grep -q "\"@rainbow-me/rainbowkit\"" package.json 2>/dev/null && echo "  Framework/Lib: rainbowkit"
  grep -q "\"@openzeppelin\"" package.json 2>/dev/null && echo "  Framework/Lib: openzeppelin"
fi
'
```

### 1.2 Claude Code Configuration Scan

```bash
bash -c '
echo "=== GLOBAL CLAUDE CONFIG ==="
for f in ~/.claude/CLAUDE.md ~/.claude/settings.json; do
  if [ -f "$f" ]; then
    echo "✅ $(basename $f) ($(wc -l < "$f" | tr -d " ") lines)"
  else
    echo "❌ $(basename $f)"
  fi
done
[ -f ~/.claude.json ] && echo "✅ ~/.claude.json (MCP config)" || echo "❌ ~/.claude.json"

echo ""
echo "=== PROJECT CLAUDE CONFIG ==="
for f in ./CLAUDE.md ./.claude/CLAUDE.md ./.claude/settings.json ./.claude/settings.local.json; do
  if [ -f "$f" ]; then
    echo "✅ $f ($(wc -l < "$f" | tr -d " ") lines)"
  else
    echo "❌ $f"
  fi
done

echo ""
echo "=== CLAUDE EXTENSIONS ==="
for d in agents commands skills hooks rules; do
  if [ -d "./.claude/$d" ]; then
    count=$(find "./.claude/$d" -maxdepth 2 -type f 2>/dev/null | wc -l | tr -d " ")
    echo "✅ $d/: $count files"
    find "./.claude/$d" -maxdepth 2 -type f 2>/dev/null | while read f; do echo "   $(basename $f)"; done
  else
    echo "❌ $d/"
  fi
done

echo ""
echo "=== SECURITY HOOKS ==="
if [ -d "./.claude/hooks" ]; then
  grep -rl "PreToolUse" ./.claude/hooks/ 2>/dev/null | while read f; do echo "✅ PreToolUse hook: $f"; done
  grep -rl "PostToolUse" ./.claude/hooks/ 2>/dev/null | while read f; do echo "✅ PostToolUse hook: $f"; done
  grep -rl "UserPromptSubmit" ./.claude/hooks/ 2>/dev/null | while read f; do echo "✅ UserPromptSubmit hook: $f"; done
  [ -z "$(grep -rl "PreToolUse" ./.claude/hooks/ 2>/dev/null)" ] && echo "❌ No PreToolUse hooks"
else
  echo "❌ No hooks directory"
fi

echo ""
echo "=== MCP SERVERS ==="
CURRENT_DIR=$(pwd)
MCP_FOUND=""

if [ -f ~/.claude.json ] && command -v jq &>/dev/null; then
  PROJ_MCP=$(jq -r --arg p "$CURRENT_DIR" "(.projects[\$p].mcpServers // {}) | keys[]" ~/.claude.json 2>/dev/null)
  GLOBAL_MCP=$(jq -r "(.mcpServers // {}) | keys[]" ~/.claude.json 2>/dev/null)
  if [ -n "$PROJ_MCP" ]; then
    echo "Project MCP (from ~/.claude.json):"
    echo "$PROJ_MCP" | while read s; do echo "  ✅ $s"; done
    MCP_FOUND="yes"
  fi
  if [ -n "$GLOBAL_MCP" ]; then
    echo "Global MCP (from ~/.claude.json):"
    echo "$GLOBAL_MCP" | while read s; do echo "  ✅ $s"; done
    MCP_FOUND="yes"
  fi
fi

if [ -f ./.claude/mcp.json ]; then
  echo "Project MCP (from .claude/mcp.json):"
  if command -v jq &>/dev/null; then
    jq -r "(.mcpServers // {}) | keys[]" ./.claude/mcp.json 2>/dev/null | while read s; do echo "  ✅ $s"; done
  fi
  MCP_FOUND="yes"
fi

[ -z "$MCP_FOUND" ] && echo "❌ No MCP servers configured"

echo ""
echo "=== PERMISSIONS CONFIG ==="
for f in ./.claude/settings.json ~/.claude/settings.json; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    if command -v jq &>/dev/null; then
      jq -r ".permissions // \"not set\"" "$f" 2>/dev/null
      DENY=$(jq -r "(.permissions.deny // [])[]" "$f" 2>/dev/null)
      if [ -n "$DENY" ]; then
        echo "Denied patterns:"
        echo "$DENY" | while read d; do echo "  🚫 $d"; done
      else
        echo "⚠️  No deny rules set"
      fi
    else
      grep -i "deny\|allow\|permissions" "$f" 2>/dev/null || echo "⚠️  Could not parse (jq not available)"
    fi
  fi
done
'
```

### 1.3 CLAUDE.md Quality Deep Scan

If a project CLAUDE.md exists, READ it fully. Evaluate:
- Is it concise or bloated?
- Does it contain actionable instructions or vague prose?
- Does it reference external docs with `@path` (SSOT pattern)?
- Does it include concrete code examples?
- Does it cover: project structure, conventions, tech stack, known issues, workflow rules?
- Are there contradictions or outdated info?

Also check for a global `~/.claude/CLAUDE.md` and evaluate its quality.

### 1.4 Codebase Security Scan

```bash
bash -c '
echo "=== HARDCODED SECRETS SCAN ==="
# Search for common secret patterns in source files (not node_modules, not .git, not lockfiles)
EXCLUDES="--include=*.ts --include=*.tsx --include=*.js --include=*.jsx --include=*.py --include=*.sol --include=*.json --include=*.yaml --include=*.yml --include=*.toml --include=*.env* --include=*.cfg --include=*.conf --include=*.md"

echo "--- API Keys / Tokens ---"
grep -rn $EXCLUDES \
  -E "(api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|bearer|secret[_-]?key)[[:space:]]*[:=][[:space:]]*[\"'\'']+[A-Za-z0-9+/=_-]{16,}" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=out --exclude-dir=coverage \
  . 2>/dev/null | grep -v "package-lock\|pnpm-lock\|yarn.lock\|\.example\|EXAMPLE\|placeholder\|your_\|YOUR_\|xxx\|TODO" | head -20 || echo "✅ None found"

echo ""
echo "--- Private Keys ---"
grep -rn $EXCLUDES \
  -E "(PRIVATE[_-]?KEY|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  . 2>/dev/null | grep -v "\.example\|EXAMPLE\|placeholder" | head -10 || echo "✅ None found"

echo ""
echo "--- Hardcoded Passwords ---"
grep -rn $EXCLUDES \
  -iE "(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*[\"'\'']+[^\"'\'']{4,}" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  . 2>/dev/null | grep -v "\.example\|EXAMPLE\|placeholder\|your_\|YOUR_\|xxx\|TODO\|password.*:\|type.*password\|passwordSchema\|passwordRegex\|password_hash\|password_field\|getPassword\|setPassword\|resetPassword\|validatePassword" | head -20 || echo "✅ None found"

echo ""
echo "--- .env files in repo ---"
find . -name ".env" -o -name ".env.local" -o -name ".env.production" -o -name ".env.staging" 2>/dev/null | grep -v node_modules | grep -v ".env.example" | head -10
echo "(If any above, check if they are in .gitignore)"

echo ""
echo "--- Wallet / Mnemonic Exposure ---"
grep -rn $EXCLUDES \
  -iE "(mnemonic|seed[_-]?phrase|private[_-]?key[[:space:]]*[:=]|0x[a-fA-F0-9]{64})" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  . 2>/dev/null | grep -v "\.example\|EXAMPLE\|placeholder\|process\.env\|getenv\|os\.environ\|test\|mock\|fixture" | head -15 || echo "✅ None found"
'
```

```bash
bash -c '
echo "=== VULNERABILITY PATTERNS ==="

echo "--- SQL Injection Risk ---"
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(query|exec|execute|raw)\s*\(.*(\\\$\{|\" ?\+|'\'' ?\+|f\"|\%s)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found"

echo ""
echo "--- Command Injection Risk ---"
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(exec|execSync|spawn|system|popen|subprocess)\s*\(.*(\\\$\{|\" ?\+|'\'' ?\+|f\")" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found"

echo ""
echo "--- XSS Risk (dangerouslySetInnerHTML / innerHTML) ---"
grep -rn --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" \
  -E "(dangerouslySetInnerHTML|\.innerHTML\s*=)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found"

echo ""
echo "--- Eval Usage ---"
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "\beval\s*\(" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found"

echo ""
echo "--- Insecure Randomness ---"
grep -rn --include="*.ts" --include="*.js" --include="*.sol" \
  -E "Math\.random\(\)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found (or only in non-security contexts)"

echo ""
echo "--- Disabled Security (SSL/TLS verification, CORS wildcard) ---"
grep -rn --include="*.ts" --include="*.js" --include="*.py" --include="*.yaml" --include="*.yml" \
  -iE "(rejectUnauthorized\s*:\s*false|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED|cors\(\s*\)|\"\*\".*origin|origin.*\"\*\")" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | head -10 || echo "✅ None found"

echo ""
echo "--- Solidity-Specific: reentrancy, tx.origin, unchecked delegatecall ---"
grep -rn --include="*.sol" \
  -E "(tx\.origin|delegatecall|selfdestruct|suicide\(|\.call\{value)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=lib \
  . 2>/dev/null | head -15 || echo "✅ None found"

echo ""
echo "--- Solidity: Missing access control on public/external functions ---"
grep -rn --include="*.sol" \
  -E "function\s+\w+\s*\([^)]*\)\s+(external|public)\s+(payable\s+)?(returns|{)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=lib \
  . 2>/dev/null | grep -v "onlyOwner\|onlyAdmin\|onlyRole\|require\|modifier\|view\|pure\|override" | head -15 || echo "✅ All public functions appear access-controlled"
'
```

### 1.5 Code Quality Scan

```bash
bash -c '
echo "=== CODE QUALITY ==="

echo "--- Linting Config ---"
[ -f .eslintrc ] || [ -f .eslintrc.js ] || [ -f .eslintrc.json ] || [ -f .eslintrc.yml ] || [ -f eslint.config.js ] || [ -f eslint.config.mjs ] && echo "✅ ESLint configured" || echo "❌ No ESLint config"
[ -f .prettierrc ] || [ -f .prettierrc.js ] || [ -f .prettierrc.json ] || [ -f prettier.config.js ] || [ -f .prettierrc.yml ] && echo "✅ Prettier configured" || echo "❌ No Prettier config"
[ -f .stylelintrc ] || [ -f stylelint.config.js ] && echo "✅ Stylelint configured" || echo "⚪ No Stylelint (optional)"
[ -f .editorconfig ] && echo "✅ EditorConfig" || echo "⚠️  No .editorconfig"

echo ""
echo "--- TypeScript Strictness ---"
if [ -f tsconfig.json ]; then
  echo "tsconfig.json found:"
  grep -E "(strict|noImplicit|strictNullChecks|noUnused|skipLibCheck)" tsconfig.json 2>/dev/null | head -10
else
  echo "❌ No tsconfig.json"
fi
# Check all tsconfig files in packages
find . -name "tsconfig.json" -not -path "*/node_modules/*" -maxdepth 4 2>/dev/null | while read f; do
  STRICT=$(grep "\"strict\"" "$f" 2>/dev/null)
  if [ -n "$STRICT" ]; then
    echo "  $f: $STRICT"
  fi
done

echo ""
echo "--- Test Infrastructure ---"
TESTS_FOUND=""
grep -q "jest\|vitest\|mocha\|ava\|tap" package.json 2>/dev/null && echo "✅ Test runner in package.json" && TESTS_FOUND="yes"
[ -f jest.config.js ] || [ -f jest.config.ts ] || [ -f vitest.config.ts ] || [ -f vitest.config.js ] && echo "✅ Test config file found" && TESTS_FOUND="yes"
find . -name "foundry.toml" -not -path "*/node_modules/*" 2>/dev/null | head -1 | while read f; do echo "✅ Foundry test framework ($f)"; done
TEST_FILES=$(find . \( -name "*.test.*" -o -name "*.spec.*" -o -name "test_*" -o -name "*_test.*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d " ")
echo "Test files found: $TEST_FILES"
[ "$TEST_FILES" -eq 0 ] && echo "❌ No test files found"

# Solidity tests
SOL_TESTS=$(find . -path "*/test/*.sol" -o -path "*/test/*.t.sol" 2>/dev/null | grep -v node_modules | wc -l | tr -d " ")
[ "$SOL_TESTS" -gt 0 ] && echo "Solidity test files: $SOL_TESTS"

echo ""
echo "--- Error Handling Patterns ---"
echo "Unhandled promise patterns:"
grep -rn --include="*.ts" --include="*.js" \
  -E "\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)|\.catch\(\(\) => \{\}\)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | wc -l | tr -d " "
echo "Empty catch blocks:"
grep -rn --include="*.ts" --include="*.js" \
  -E "catch\s*\([^)]*\)\s*\{\s*\}" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  . 2>/dev/null | wc -l | tr -d " "

echo ""
echo "--- Console.log/debug left in source ---"
CONSOLE_COUNT=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "console\.(log|debug|info|warn|error)" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.next \
  . 2>/dev/null | wc -l | tr -d " ")
echo "console.* calls in source: $CONSOLE_COUNT"
[ "$CONSOLE_COUNT" -gt 50 ] && echo "⚠️  Excessive console usage — consider a proper logger"

echo ""
echo "--- TODO/FIXME/HACK markers ---"
for marker in TODO FIXME HACK XXX TEMP TEMPORARY; do
  COUNT=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.sol" --include="*.py" \
    "$marker" \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
    . 2>/dev/null | wc -l | tr -d " ")
  [ "$COUNT" -gt 0 ] && echo "$marker: $COUNT occurrences"
done
'
```

### 1.6 Architecture & Structure Scan

```bash
bash -c '
echo "=== PROJECT STRUCTURE ==="

echo "--- Top-Level Layout ---"
ls -la | grep -v "node_modules\|\.git$\|^total"

echo ""
echo "--- Packages/Workspaces ---"
if [ -f pnpm-workspace.yaml ]; then
  echo "pnpm-workspace.yaml:"
  cat pnpm-workspace.yaml
fi
if [ -d packages ]; then
  echo ""
  echo "Packages:"
  for d in packages/*/; do
    [ -f "$d/package.json" ] && echo "  ✅ $d (has package.json)" || echo "  ⚠️  $d (no package.json)"
  done
fi

echo ""
echo "--- Environment Management ---"
[ -f .env.example ] && echo "✅ .env.example exists" || echo "❌ No .env.example"
[ -f .env ] && echo "⚠️  .env file exists (check .gitignore)" || echo "✅ No .env in root (good if using per-package envs)"
find . -name ".env" -not -path "*/node_modules/*" -not -path "*/.git/*" -maxdepth 3 2>/dev/null | while read f; do
  echo "  Found: $f"
done

echo ""
echo "--- .gitignore Coverage ---"
if [ -f .gitignore ]; then
  echo ".gitignore exists. Key patterns:"
  for pattern in "node_modules" ".env" "dist" "build" ".next" "coverage" ".claude/settings.local" "*.pem" "*.key"; do
    grep -q "$pattern" .gitignore 2>/dev/null && echo "  ✅ $pattern" || echo "  ❌ $pattern NOT in .gitignore"
  done
else
  echo "❌ No .gitignore!"
fi

echo ""
echo "--- Documentation ---"
[ -f README.md ] && echo "✅ README.md ($(wc -l < README.md | tr -d " ") lines)" || echo "❌ No README.md"
[ -f CONTRIBUTING.md ] && echo "✅ CONTRIBUTING.md" || echo "⚪ No CONTRIBUTING.md"
[ -f LICENSE ] || [ -f LICENSE.md ] && echo "✅ LICENSE" || echo "⚠️  No LICENSE file"
[ -f CHANGELOG.md ] && echo "✅ CHANGELOG.md" || echo "⚪ No CHANGELOG.md"
[ -d docs ] && echo "✅ docs/ directory" || echo "⚪ No docs/ directory"
'
```

### 1.7 Dependency Health Scan

```bash
bash -c '
echo "=== DEPENDENCY HEALTH ==="

# npm/pnpm audit
if [ -f package.json ]; then
  echo "--- Package Manager Audit ---"
  if command -v pnpm &>/dev/null && [ -f pnpm-lock.yaml ]; then
    pnpm audit --no-fix 2>/dev/null | tail -20 || echo "⚠️  pnpm audit failed (may need install first)"
  elif command -v npm &>/dev/null && [ -f package-lock.json ]; then
    npm audit --omit=dev 2>/dev/null | tail -20 || echo "⚠️  npm audit failed"
  elif command -v yarn &>/dev/null && [ -f yarn.lock ]; then
    yarn audit 2>/dev/null | tail -20 || echo "⚠️  yarn audit failed"
  else
    echo "⚠️  No lockfile found — cannot run audit"
  fi
fi

# Python
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  echo ""
  echo "--- Python Dependency Audit ---"
  if command -v pip-audit &>/dev/null; then
    pip-audit 2>/dev/null | tail -20
  elif command -v safety &>/dev/null; then
    safety check 2>/dev/null | tail -20
  else
    echo "⚠️  No pip-audit or safety installed"
  fi
fi

echo ""
echo "--- Lockfile Consistency ---"
LOCKFILES=0
[ -f package-lock.json ] && LOCKFILES=$((LOCKFILES+1)) && echo "Found: package-lock.json"
[ -f pnpm-lock.yaml ] && LOCKFILES=$((LOCKFILES+1)) && echo "Found: pnpm-lock.yaml"
[ -f yarn.lock ] && LOCKFILES=$((LOCKFILES+1)) && echo "Found: yarn.lock"
[ -f bun.lockb ] && LOCKFILES=$((LOCKFILES+1)) && echo "Found: bun.lockb"
[ "$LOCKFILES" -gt 1 ] && echo "❌ MULTIPLE lockfiles detected — pick ONE package manager"
[ "$LOCKFILES" -eq 0 ] && [ -f package.json ] && echo "❌ No lockfile — dependencies are not pinned"
[ "$LOCKFILES" -eq 1 ] && echo "✅ Single lockfile (consistent)"

echo ""
echo "--- Outdated Dependencies (top-level) ---"
if command -v pnpm &>/dev/null && [ -f pnpm-lock.yaml ]; then
  pnpm outdated 2>/dev/null | head -25 || echo "Could not check outdated packages"
elif command -v npm &>/dev/null && [ -f package-lock.json ]; then
  npm outdated 2>/dev/null | head -25 || echo "Could not check outdated packages"
fi
'
```

### 1.8 Git & DevOps Scan

```bash
bash -c '
echo "=== GIT & DEVOPS ==="

echo "--- Branch Info ---"
git branch --show-current 2>/dev/null
echo "Remote branches:"
git branch -r 2>/dev/null | head -15

echo ""
echo "--- CI/CD Configuration ---"
[ -d .github/workflows ] && echo "✅ GitHub Actions:" && ls .github/workflows/ 2>/dev/null || echo "❌ No GitHub Actions"
[ -f .gitlab-ci.yml ] && echo "✅ GitLab CI" || true
[ -f Jenkinsfile ] && echo "✅ Jenkinsfile" || true
[ -f .circleci/config.yml ] && echo "✅ CircleCI" || true
[ -f .travis.yml ] && echo "✅ Travis CI" || true
[ -f vercel.json ] && echo "✅ Vercel config" || true
[ -f netlify.toml ] && echo "✅ Netlify config" || true

echo ""
echo "--- Git Hooks (husky/lefthook/etc) ---"
[ -d .husky ] && echo "✅ Husky hooks:" && ls .husky/ 2>/dev/null || echo "⚪ No Husky"
[ -f .lefthook.yml ] || [ -f lefthook.yml ] && echo "✅ Lefthook" || true
[ -f .pre-commit-config.yaml ] && echo "✅ pre-commit" || true
grep -q "pre-commit\|husky\|lint-staged" package.json 2>/dev/null && echo "✅ Git hooks referenced in package.json" || echo "⚠️  No git hooks in package.json"

echo ""
echo "--- Commit Message Convention ---"
echo "Last 10 commits:"
git log --oneline -10 2>/dev/null
echo ""
CONVENTIONAL=$(git log --oneline -20 2>/dev/null | grep -cE "^[a-f0-9]+ (feat|fix|chore|docs|test|refactor|style|perf|ci|build|revert)(\(.*\))?:" || echo 0)
echo "Conventional commits (last 20): $CONVENTIONAL/20"

echo ""
echo "--- Large Files in History ---"
git rev-list --objects --all 2>/dev/null | git cat-file --batch-check="%(objecttype) %(objectsize) %(rest)" 2>/dev/null | grep "^blob" | sort -t" " -k2 -n -r | head -10 | while read type size path; do
  SIZE_MB=$((size / 1048576))
  [ "$SIZE_MB" -gt 1 ] && echo "⚠️  Large file ($SIZE_MB MB): $path"
done || echo "Could not scan git history"

echo ""
echo "--- Files Tracked That Probably Should Not Be ---"
git ls-files 2>/dev/null | grep -iE "\.(env|pem|key|p12|pfx|jks|keystore)$" | grep -v "\.example\|\.sample\|\.template" | head -10 || echo "✅ No sensitive files tracked"
git ls-files 2>/dev/null | grep -iE "(credentials|secrets?|password)" | grep -v "\.example\|\.sample\|\.template\|\.md\|\.txt" | head -10 || true
'
```

### 1.9 Solidity-Specific Deep Scan (if applicable)

Only run this if Solidity contracts were detected in Phase 1.1.

```bash
bash -c '
if find . -name "*.sol" -not -path "*/node_modules/*" -not -path "*/lib/*" 2>/dev/null | head -1 | grep -q .; then
  echo "=== SOLIDITY DEEP SCAN ==="

  echo "--- Compiler Versions ---"
  grep -rn "pragma solidity" --include="*.sol" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | sort -u

  echo ""
  echo "--- License Identifiers ---"
  grep -rn "SPDX-License-Identifier" --include="*.sol" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | sort -u

  echo ""
  echo "--- Floating Pragmas (insecure) ---"
  grep -rn "pragma solidity \^" --include="*.sol" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | head -10

  echo ""
  echo "--- Missing Zero-Address Checks ---"
  echo "(Constructors and setters that take address params without require(addr != address(0))):"
  grep -rn --include="*.sol" -A5 "constructor\|function set" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | grep "address " | grep -v "address(0)\|!= address\|require" | head -15

  echo ""
  echo "--- Unchecked External Calls ---"
  grep -rn --include="*.sol" -E "\.(call|delegatecall|staticcall)\{" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | head -10

  echo ""
  echo "--- Reentrancy Patterns (state change after external call) ---"
  echo "(Manual review recommended — grep cannot fully detect this)"
  grep -rn --include="*.sol" -B2 -A5 "\.call\{" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | head -30

  echo ""
  echo "--- Missing Events on State Changes ---"
  echo "Public/external functions without emit:"
  grep -rn --include="*.sol" -A10 "function.*\(.*\).*external\|function.*\(.*\).*public" --exclude-dir=node_modules --exclude-dir=lib . 2>/dev/null | grep -B10 "}" | grep -v "view\|pure\|emit" | grep "function" | head -15

  echo ""
  echo "--- Contract Sizes ---"
  find . -name "*.sol" -not -path "*/node_modules/*" -not -path "*/lib/*" -not -path "*/test/*" 2>/dev/null | while read f; do
    LINES=$(wc -l < "$f" | tr -d " ")
    [ "$LINES" -gt 200 ] && echo "  $f: $LINES lines"
  done

  echo ""
  echo "--- Test Coverage Check ---"
  for pkg in packages/contracts-*/; do
    if [ -f "$pkg/foundry.toml" ]; then
      echo "  $pkg: Foundry project"
      TEST_COUNT=$(find "$pkg" -name "*.t.sol" 2>/dev/null | wc -l | tr -d " ")
      SRC_COUNT=$(find "$pkg/src" -name "*.sol" 2>/dev/null | wc -l | tr -d " ")
      echo "    Source contracts: $SRC_COUNT | Test files: $TEST_COUNT"
    fi
  done
else
  echo "No Solidity files found — skipping Solidity scan."
fi
'
```

---

## Phase 2: Deep File Analysis

After all bash scans complete, READ the following files (if they exist) to perform qualitative analysis. These cannot be evaluated by grep alone:

1. **CLAUDE.md** (project root) — Evaluate structure, clarity, completeness, actionability
2. **Global ~/.claude/CLAUDE.md** — Evaluate personal conventions
3. **.claude/settings.json** — Check permission rules, deny patterns
4. **Any hook files** found in `.claude/hooks/` — Evaluate security coverage
5. **Any agent files** found in `.claude/agents/` — Evaluate descriptions (Tool SEO), model selection
6. **CI/CD config files** (.github/workflows/*.yml, etc.) — Evaluate pipeline completeness
7. **.gitignore** — Evaluate coverage for sensitive files
8. **tsconfig.json** (root + packages) — Check strictness settings
9. **Key source files** — Sample 2-3 core files per package to evaluate code patterns, error handling, typing, documentation

For each file read, note specific issues with file path and line numbers.

---

## Phase 3: Evaluation & Scoring

### 3.1 Scoring Matrix

Score each category on a 0-10 scale. Apply these weights:

| Category | Weight | What 10/10 Looks Like |
|----------|--------|----------------------|
| **Security** | x4 | No secrets in code, deny rules for .env/.pem, security hooks, no OWASP patterns, access control on all Solidity functions |
| **Claude Code Config** | x3 | Complete CLAUDE.md (concise + actionable), hooks, agents, commands, MCP servers, proper permissions |
| **Code Quality** | x3 | Linting, strict TypeScript, tests exist, proper error handling, no console spam, clean TODO debt |
| **Architecture** | x2 | Clear structure, consistent patterns, proper env management, documentation |
| **Dependencies** | x2 | No vulnerabilities, single lockfile, reasonably up to date |
| **Git & DevOps** | x2 | CI/CD pipeline, conventional commits, git hooks, no sensitive files tracked |

**Formula**: `Total = sum(category_score * weight) / sum(max_score * weight) * 100`

### 3.2 Priority Classification

For every finding:
- **CRITICAL**: Active security vulnerability, secrets in code, production risk
- **HIGH**: Missing fundamentals that significantly impact productivity or safety
- **MEDIUM**: Best practices that would meaningfully improve the workflow
- **LOW**: Polish, optimization, nice-to-have improvements

---

## Phase 4: Report Generation

Present the report in this exact structure:

### 4.1 Executive Summary

```
Health Score: XX/100 [CRITICAL|POOR|FAIR|GOOD|EXCELLENT]

Tech Stack: [detected stack summary]

CRITICAL Issues: X
HIGH Issues: X
MEDIUM Issues: X
LOW Issues: X
```

### 4.2 Critical & High Priority Issues

For each CRITICAL and HIGH issue:

```
### [NUMBER]. [Issue Title]
**Priority**: CRITICAL | HIGH
**Category**: Security | Claude Config | Code Quality | Architecture | Dependencies | DevOps
**Location**: file:line (or general if not file-specific)
**Current State**: [what is wrong]
**Risk**: [what can go wrong]
**Fix**: [specific actionable fix with code/config example]
```

### 4.3 Quick Wins

List 5-10 high-impact actions under 5 minutes each:
```
1. [action] -> [impact] (~X min)
```

### 4.4 Full Findings Table

| # | Priority | Category | Element | Status | Action |
|---|----------|----------|---------|--------|--------|
| 1 | ... | ... | ... | ... | ... |

### 4.5 Detailed Medium & Low Findings

Same format as 4.2 but grouped together.

### 4.6 Category Scorecards

For each of the 6 categories, provide:
```
### [Category Name]: X/10
**Strengths**: [what's working]
**Gaps**: [what's missing]
**Next Steps**: [ordered action items]
```

### 4.7 Ready-to-Use Templates

For every HIGH and MEDIUM priority gap that can be fixed with a file, provide:

```
### Template: [Element Name]
**File**: `exact/path/to/create/or/edit`
**Action**: Create | Edit

[complete file content or edit instructions]
```

Templates MUST be specific to the detected tech stack. No generic placeholders.

---

## Phase 5: Await Validation

**CRITICAL**: Do NOT create or modify any files without explicit approval.

After presenting the full report, ask:

"Which of these would you like me to implement?

- `all` — Implement everything
- `critical` — Only CRITICAL issues
- `high` — CRITICAL + HIGH priority
- `1, 4, 7` — Specific items by number
- `none` — Keep the report for reference

Your choice:"

Wait for explicit response. Do not proceed without it.
