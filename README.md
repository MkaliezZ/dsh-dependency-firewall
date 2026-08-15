# dsh-dependency-firewall

Domain-specific dependency-installation guard for DeepSeek Harness.

v0.1 classifies package-manager commands before execution and returns `ALLOW`, `ASK`, or `BLOCK` for common npm/pnpm/yarn/pip/uv/cargo install flows.

High-risk sources such as arbitrary URLs, git dependencies, alternate registries, unpinned VCS references, native/install-script flags, or unparseable install shapes can be escalated without running the underlying command.

## Non-claims

- no package is installed by this plugin;
- no online reputation or CVE lookup in v0.1;
- classification is bounded and deterministic, not complete supply-chain security.

## Development

```bash
npm install
npm test
```

MIT
