# Branches and deployment

`develop` is the chain 1043 Testnet source. `main` is the chain 1404 Mainnet review candidate. Production deployment requires the sealed Mainnet profile and an approved host. Use the qualified Xneelo promotion procedure for Testnet static assets. Preserve the existing Legacy rehearsal mount, if present.

Pushes and pull requests run type and application checks. A successful push to `develop` builds a checksummed package. With the repository and host deployment gates enabled, that package is promoted to https://testnet-staking.bdag.co/ using the existing Xneelo runtime. The dedicated key cannot open a shell or deploy another app. A manual run with `verify_xneelo` stages and validates the package without changing the active site. Host configuration and credentials stay on Xneelo.

Source for this branch at import: `base`, revision `09b042cc110ac777ed2ecee705c2ce1affcda599`. The previous repository and history were preserved separately.

If GitHub does not deliver a push run, dispatch the workflow on the publishing branch with **Publish this build to the approved site**. That uses the same validation and host gates.
