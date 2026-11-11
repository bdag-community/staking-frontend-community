# Branches and deployment

`develop` is the chain 1043 Testnet source. `main` is the chain 1404 Mainnet review candidate. Production deployment requires the sealed Mainnet profile and an approved host. Use the qualified Xneelo promotion procedure for Testnet static assets. Preserve the existing Legacy rehearsal mount, if present.

GitHub Actions runs dependency, type and application checks on pushes and pull requests. Set `FRONTEND_BUILD_ENABLED=true` and supply the approved public build settings as `FRONTEND_PUBLIC_BUILD_JSON` for the eligible branch to produce a checksummed deployment package. Build settings may contain only browser-visible values; keep database keys, service credentials and private RPC tokens on the approved host. A build artifact does not update a running site.

Source for this branch at import: `develop`, revision `4770d83ef927164557f34daf1228db448161c5bf`. The previous repository and history were preserved separately.
