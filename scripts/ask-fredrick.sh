#!/bin/bash
# ask-fredrick.sh — Send a message to Fredrick and get a synchronous response
# Usage: ./scripts/ask-fredrick.sh <ide> "Your message here"
#   ide: cursor | antigravity
#
# Example:
#   ./scripts/ask-fredrick.sh cursor "[ISSUE #1] done — Next.js initialized"
#   ./scripts/ask-fredrick.sh antigravity "[ISSUE #2] question — should I use connection pooling?"

set -e

IDE="${1:?Usage: ask-fredrick.sh <cursor|antigravity> \"your message\"}"
shift
MESSAGE="${1:?Usage: ask-fredrick.sh <cursor|antigravity> \"your message\"}"

IDE_UPPER=$(echo "$IDE" | tr '[:lower:]' '[:upper:]')

# Read current task assignments
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
TASKS=""
if [ -f "$REPO_DIR/TASKS.md" ]; then
    TASKS=$(cat "$REPO_DIR/TASKS.md")
fi

# Build context-rich message
FULL_MESSAGE="[FROM: ${IDE_UPPER}]
${MESSAGE}

---
Current task assignments (TASKS.md):
${TASKS}"

RESULT=$(openclaw agent --agent fredrick --message "$FULL_MESSAGE" --json 2>/dev/null)

# Extract the reply text
REPLY=$(echo "$RESULT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    r = d.get('result', {})
    payloads = r.get('payloads', [])
    if payloads:
        print(payloads[0].get('text', '(no text)'))
    else:
        print('(no response)')
except Exception as e:
    print(f'(parse error: {e})')
" 2>/dev/null)

echo "$REPLY"
