## What changed

<!-- One or two sentences. -->

## Checklist

- [ ] `node scripts/validate-marketplace.mjs` passes
- [ ] `claude plugin validate .` and `claude plugin validate ./plugins/<name>` pass
- [ ] Plugin `version` bumped and `CHANGELOG.md` updated (if plugin content changed)
- [ ] Marketplace entry name matches the `name` in `plugin.json`
- [ ] `CODEOWNERS` covers every new plugin directory
- [ ] No secrets, absolute paths or product-specific references
- [ ] All text and comments are in English
- [ ] Dependencies declared in `plugin.json` use version ranges and are namespaced when referenced
