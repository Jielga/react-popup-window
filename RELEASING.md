# Releasing

`@jielga/react-popup-window` is published to npm by
[Changesets](https://github.com/changesets/changesets), from
[`.github/workflows/release.yml`](.github/workflows/release.yml).
Nothing publishes from an ordinary push, and no npm credential exists in this repository.

## The everyday flow

1. **Write a changeset with the change.**
   A pull request that alters anything a consumer can observe - the hook API, the exported types, the shipped skills - needs one:

   ```sh
   npm run changeset
   ```

   Pick `patch`, `minor` or `major`, describe the change in the prose that will become the changelog entry, and commit the generated `.changeset/*.md` file alongside the code.

2. **Merge to `main`.**
   Release opens (or updates) a **chore: version packages** pull request.
   That PR consumes every pending changeset: it bumps `package.json`, writes `CHANGELOG.md`, and syncs `metadata.library_version` in each `skills/*/SKILL.md`.
   All three are generated - never edit them by hand.

3. **Merge the version PR.**
   That merge is the release.
   Release runs again, finds no changesets left to consume, and publishes to npm, tags the commit and creates the GitHub release.

Merging the version PR is the only action that publishes.

## Authentication

Release carries no npm token.
npm authenticates the job through [trusted publishing](https://docs.npmjs.com/trusted-publishers): the package is configured on npmjs.com against this repository and the workflow **filename** `release.yml`.
At publish time npm exchanges the workflow's GitHub OIDC token for a short-lived registry token, at an endpoint scoped to the package being published.

Three consequences worth knowing before you touch the workflow:

- Renaming or moving `release.yml` breaks publishing until the trusted publisher is updated to match.
- The `id-token: write` permission is what makes the OIDC token available.
  Without it npm skips the exchange silently.
- A mismatched configuration fails at the publish step as a misleading `E404 ... PUT`, not as an auth error.
  npm falls back to the unusable placeholder token that `actions/setup-node` writes into the job's `.npmrc`, and the registry rejects the `PUT`.

Trusted publishing needs npm >= 11.5.1, which is why the workflow pins Node 24 - Node 22 ships npm 10.
Provenance is generated automatically.

## First publish (one time only)

npm can only attach a trusted publisher to a package that already exists, on the website and through `npm trust` alike.
So the first version has to be published with a real credential.
Rather than mint an access token and hand it to CI, it is published from a maintainer's machine with an interactive login, so no token is created and nothing is stored in this repository:

```sh
npm login                       # opens a browser, uses 2FA, creates no token
npm publish --provenance=false
npm logout
```

`--provenance=false` is required because `publishConfig.provenance` is `true` for CI's benefit, and provenance can only be generated from a supported CI provider.
npm gives CLI flags precedence over `publishConfig`, so the flag turns it off for this one publish without editing `package.json`.
`0.1.0` is therefore the only version that ships without a provenance attestation.

Then, on npmjs.com under the package's **Settings -> Trusted publisher**, add GitHub Actions with:

| Field | Value |
| --- | --- |
| Organization or user | `Jielga` |
| Repository | `react-popup-window` |
| Workflow filename | `release.yml` |
| Environment | leave empty |

Trusted publisher configurations created after 2026-05-20 must name their allowed actions explicitly; select **npm publish**.

After that the everyday flow above takes over, and no npm credential is involved again.

Until the first publish has happened, Release fails at its publish step on every push to `main`: `changeset publish` sees `0.1.0` missing from the registry and tries to publish it, with nothing to authenticate as.
Nothing else in the pipeline is affected, and the failures stop as soon as the package exists.
