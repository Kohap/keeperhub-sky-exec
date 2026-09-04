#!/usr/bin/env bash
# Create https://github.com/Kohap/keeperhub-sky-exec (if missing) and push main.
# The GitHub App token can push to an existing repo but cannot POST /user/repos
# without administration=write. If create 403s, open the printed URL (empty
# public repo, no README) and re-run.
set -euo pipefail

OWNER="${GITHUB_OWNER:-Kohap}"
REPO="${GITHUB_REPO:-keeperhub-sky-exec}"
DESC="Agent + policy + dry-run + audit glue for Sky sUSDS workflows on KeeperHub"
REMOTE="https://github.com/${OWNER}/${REPO}.git"
NEW_URL="https://github.com/new?name=${REPO}&visibility=public"
AUTHOR_NAME="${GIT_AUTHOR_NAME:-Kohap}"
AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-126649243+Kohap@users.noreply.github.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d .git ]; then
  git init
fi
git checkout -B main >/dev/null
git config user.name "$AUTHOR_NAME"
git config user.email "$AUTHOR_EMAIL"

git add -A
if git diff --cached --quiet && git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "working tree clean"
else
  git commit -m "Sky Exec: Sky sUSDS workflows on KeeperHub"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

if command -v gh >/dev/null 2>&1; then
  if gh repo view "${OWNER}/${REPO}" >/dev/null 2>&1; then
    echo "repo ${OWNER}/${REPO} already exists"
  else
    echo "creating public repo ${OWNER}/${REPO}"
    if ! gh repo create "${OWNER}/${REPO}" --public --description "$DESC" --disable-wiki --disable-issues; then
      cat <<EOF

GitHub refused repo creation (token needs administration=write).

Create the empty public repo, then re-run this script:

  1. Open ${NEW_URL}
  2. Owner: ${OWNER}
  3. Name: ${REPO}
  4. Public
  5. Do not add a README, .gitignore, or license
  6. Create repository
  7. bash scripts/publish-github.sh

EOF
      exit 1
    fi
  fi
fi

echo "pushing main → ${REMOTE}"
git push -u origin main
echo "source: https://github.com/${OWNER}/${REPO}"
