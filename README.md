# alexandria-sync-action

Pushes a repository's markdown into an [Alexandria](https://github.com/rxbynerd/alexandria) space.

The repository holds a Cloudflare Access service-token pair and nothing else. Alexandria needs no
read access to the repository, which is what lets a private repository under any owner mirror into a
deployment it cannot be read by (ADR 0041).

The action is thin: it runs `npx @rubynerd/alx sync`. The walk, `.alexandriaignore`, hashing,
batching and the final batch that archives removed paths all live in `alx`.

## Use

```yaml
name: alexandria
on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: rxbynerd/alexandria-sync-action@v0
        with:
          space: gemnet
          path: docs
          url: https://alexandria-api.example.workers.dev
          version: 0.1.1
        env:
          CF_ACCESS_CLIENT_ID: ${{ secrets.CF_ACCESS_CLIENT_ID }}
          CF_ACCESS_CLIENT_SECRET: ${{ secrets.CF_ACCESS_CLIENT_SECRET }}
```

A pull request can check the walk without a credential:

```yaml
      - uses: rxbynerd/alexandria-sync-action@v0
        with:
          space: gemnet
          url: https://alexandria-api.example.workers.dev
          dry-run: true
```

## Inputs

| Input | Required | Default | Meaning |
|---|---|---|---|
| `space` | yes | | Slug of the space to sync into. It must already exist. |
| `url` | yes | | Base URL of the deployment. |
| `path` | no | `.` | Directory to walk, relative to the workspace. |
| `version` | no | `latest` | Version of `@rubynerd/alx` to run. Pin it. |
| `dry-run` | no | `false` | Walk and report the batch plan without sending anything, and without a credential. |

`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are read from the step's environment, not taken
as inputs, so they are never interpolated into a command line. A live run fails early when either is
missing, because Access answers an unauthenticated request with a login page rather than an error.

## Output

`summary` is the JSON `alx sync --json` printed: `run_id`, `job_ids`, the per-path counts, the files
skipped for size and the `issues` the server reported per path. The same thing is rendered into the
job summary, and every skipped file and issue becomes a warning annotation on its path.

## What it does not do

It does not check out the repository — add `actions/checkout` first. It does not create the space or
the service account; that is done once, in the Alexandria deployment's runbook. It does not install
Node, relying on whatever the runner provides; `@rubynerd/alx` needs Node 22 or later, which every
current GitHub-hosted runner image carries.

## Releasing

This directory is the canonical source, in `rxbynerd/alexandria`. The public action repository is a
byte-identical mirror of it: change it here, copy it there, tag.

Tags are `v<major>.<minor>.<patch>` with a moving `v<major>` alongside, which is what the examples
above pin. The major stays at `v0` while `@rubynerd/alx` is itself `0.x`.

MIT.
