#!/bin/bash
# ask-fredrick.sh — Send a message to Fredrick and get a synchronous response
# Usage: ./scripts/ask-fredrick.sh "Your message here"
#
# The IDE coding agents should use this instead of raw curl.
# Returns Fredrick's actual response text.

set -e

MESSAGE="${1:?Usage: ask-fredrick.sh \"your message\"}"

RESULT=$(openclaw agent --agent fredrick --message "$MESSAGE" --json 2>/dev/null)

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
