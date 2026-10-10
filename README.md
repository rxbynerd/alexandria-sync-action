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
          version: 0.2.0
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
| `commit` | no | `${{ github.sha }}` | The commit the tree was checked out at, sent as `alx sync --commit`. Empty sends none. |

`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are read from the step's environment, not taken
as inputs, so they are never interpolated into a command line. A live run fails early when either is
missing, because Access answers an unauthenticated request with a login page rather than an error.

Every source a run creates records `commit` as where its content came from, and `GET
/v1/sources/:id` and `kb_get` return it (ADR 0052). The default is the commit that triggered the
workflow, which is what `actions/checkout` checks out unless told otherwise; a workflow that checks
out another ref passes that ref's sha. A version of `alx` older than `--commit` ignores the flag and
records none.

## Output

`summary` is the JSON `alx sync --json` printed: `run_id`, `job_ids`, the per-path counts, the files
skipped for size and the `issues` the server reported per path. The same thing is rendered into the
job summary, and every skipped file and issue becomes a warning annotation on its path.

A front-matter key the space neither maps to a fragment field nor declares is an `unknown_key` issue,
so a repository whose files carry keys of their own, such as `query` or `agent`, warns on every file
it changes. Declare those keys on the space once, as an admin of the deployment:

```sh
alx space update <slug> --front-matter-keys query,agent
```

A declared key raises no warning from the next sync that writes each file, and its value travels
with search results and fragment reads, so an agent sees where a result came from.

A directory whose files share a classification, such as agent research under `research/`, does not
need the same front matter on every file. Give the space a path rule instead:

```sh
alx space update <slug> --path-rules '[{"glob": "research/", "kind": "proposal", "tags": ["research"]}]'
```

The first rule matching a path sets the kind and review horizon its front matter leaves unset and
adds its tags. The next run applies a change, re-versioning only the files it reclassifies
(ADR 0049).

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
