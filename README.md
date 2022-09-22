# setup-inso

Install [inso](https://github.com/Kong/insomnia/tree/develop/packages/insomnia-inso) so that it can be used in your GitHub Actions workflows

Add the following to your `steps` definition:

```yaml
- uses: kong/setup-inso@v1
  with:
    inso-version: 3.5.0
```

## Sample workflow

```yaml
on:
  push:
    branches:
      - main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: kong/setup-inso@v1
        with:
          inso-version: 3.5.0
      - run: inso --version
```

## Capturing output

If you need to capture the output for use in a later step, you can add a wrapper script which exposes `stdout` and `stderr` by passing the `wrapper` input and setting it to `true`:

```yaml
steps:
  - uses: kong/setup-inso@v1
    with:
      inso-version: 3.5.0
      wrapper: true
  - run: inso --version
    id: inso_version
  - run: echo '${{ toJson(steps.inso_version.outputs) }}'
```

This would produce the following output:

```json
{
  "stderr": "",
  "stdout": "3.5.0\n"
}
```

## Controlling the compression format

By default, the 3.x series of `inso` uses `bzip` and this is auto-detected. If for any reason extraction fails, you may change the `compression` type by setting the following:

```yaml
steps:
  - uses: kong/setup-inso@v1
    with:
      inso-version: 3.5.0
      compression: gzip
```