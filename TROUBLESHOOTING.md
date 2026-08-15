# TROUBLESHOOTING.md

Problem → solution lookup. Update whenever an issue is encountered and resolved.

---

## Claude API model lookup failure
**Symptoms:** `[web-1786744110730] Claude API error (initial call): 404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-sonnet-4-20250514"},"request_id":"req_011Ce3NqZfE1qTv4rRkpiAxy"}`
**Cause:** The app is calling the Anthropic model alias `claude-sonnet-4-20250514` in `src/claude.js`, but the configured Anthropic API key/account does not have access to that model or the alias is not enabled for the project. This results in a `404 not_found_error` before any prompt processing can run.
**Fix:** Verify the Anthropic account and API key can access the requested model; if not, switch to a supported alias such as `claude-3-5-sonnet-latest` or another model available to the account. For production stability, move the model name to a config/env variable and add a fallback path or clearer error handling.
**Date:** 2026-08-14

<!-- Template for new entries:

## [Short description of the problem]
**Symptoms:** What you saw (error message, unexpected behavior)
**Cause:** Why it happened
**Fix:** What resolved it
**Date:** YYYY-MM-DD
-->
