# setup-inso

> If you are using a version of inso before 10.3.1, please use `kong/setup-inso@v1`

Install [inso](https://github.com/Kong/insomnia/tree/develop/packages/insomnia-inso) so that it can be used in your GitHub Actions workflows

Add the following to your `steps` definition:

```yaml
- uses: kong/setup-inso@v2
  with:
    inso-version: 10.3.1
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
      - uses: kong/setup-inso@v2
        with:
          inso-version: 10.3.1
      - run: inso --version
```

## Capturing output

If you need to capture the output for use in a later step, you can add a wrapper script which exposes `stdout` and `stderr` by passing the `wrapper` input and setting it to `true`:

```yaml
steps:
  - uses: kong/setup-inso@v2
    with:
      inso-version: 10.3.1
      wrapper: true
  - run: inso --version
    id: inso_version
  - run: echo '${{ toJson(steps.inso_version.outputs) }}'
```

This would produce the following output:

```json
{
  "stderr": "",
  "stdout": "10.3.1\n"
}
```
