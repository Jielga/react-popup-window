# Releasing

`@jielga/react-popup-window` is published to npm by
[Changesets](https://github.com/changesets/changesets), from
[`.github/workflows/release.yml`](.github/workflows/release.yml). Nothing
publishes from an ordinary push, and no one publishes from a laptop.

## The everyday flow

1. **Write a changeset with the change.** A pull request that alters anything a
   consumer can observe - the hook API, the exported types, the shipped skills -
   needs one:

   ```sh
   npm run changeset
   ```

   Pick `patch`, `minor` or `major`, describe the change in the prose that will
   become the changelog entry, and commit the generated `.changeset/*.md` file
   alongside the code.

2. **Merge to `main`.** Release opens (or updates) a **chore: version packages**
   pull request. That PR consumes every pending changeset: it bumps
   `package.json`, writes `CHANGELOG.md`, and syncs `metadata.library_version`
   in each `skills/*/SKILL.md`. All three are generated - never edit them by
   hand.

3. **Merge the version PR.** That merge is the release. Release runs again,
   finds no changesets left to consume, and publishes to npm, tags the commit
   and creates the GitHub release.

Merging the version PR is the only action that publishes.

## Authentication

Release carries no npm token. npm authenticates the job through
[trusted publishing](https://docs.npmjs.com/trusted-publishers): the package is
configured on npmjs.com against this repository and the workflow **filename**
`release.yml`. Two consequences worth knowing before you touch the workflow:

- Renaming or moving `release.yml` breaks publishing until the trusted publisher
  is updated to match.
- A mismatched configuration fails at the publish step as a misleading
  `E404 ... PUT`, not as an auth error.

Trusted publishing needs npm >= 11.5.1, which is why the workflow pins Node 24 -
Node 22 ships npm 10. Provenance is generated automatically.

## First publish (one time only)

npm can only configure a trusted publisher for a package that already exists,
and this package has never been published. So the first version has to be
published with a token, which
[`.github/workflows/bootstrap-publish.yml`](.github/workflows/bootstrap-publish.yml)
exists to do:

1. Create an npm **granular access token** with write access to
   `@jielga/react-popup-window` and the shortest expiry offered, and add it to
   this repository as the `NPM_TOKEN` secret.
2. Run **Bootstrap publish** from the Actions tab. It publishes the version
   currently in `package.json` (`0.1.0`).
3. Point the package's trusted publisher at this workflow, either on npmjs.com
   under **Settings -> Trusted publisher**, or from the CLI (npm >= 11.15.0,
   2FA required):

   ```sh
   npm trust github @jielga/react-popup-window \
     --repository Jielga/react-popup-window \
     --workflow release.yml \
     --allow-publish
   ```

   `--allow-publish` is not optional: configurations created after 2026-05-20
   must name at least one permitted action, and a publisher configured without
   it authenticates but refuses to publish.
4. Delete the `NPM_TOKEN` secret and `.github/workflows/bootstrap-publish.yml`.

After step 4 the everyday flow above takes over, and no npm credential exists in
this repository again.

Until step 2 has run, Release fails at its publish step on every push to `main`:
`changeset publish` sees `0.1.0` missing from the registry and tries to publish
it, with nothing to authenticate as. Nothing else in the pipeline is affected,
and the failures stop as soon as the package exists.
