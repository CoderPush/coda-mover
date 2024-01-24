Coda Mover
=====

![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)

Coda contents migration made simple

Development
-----
### Prerequisites
- Setup for signed commits, see [How to sign my commits](#how-to-sign-my-commits)
- NodeJS v20 LTS: [setup](#how-to-setup-nodejs)
- Pnpm v8: [setup](https://pnpm.io/installation)

### First setup

Install all dependencies with this command:
```
pnpm i
```

### Start development

You may start development site at `localhost:3000` with live reloading:

```
pnpm dev
```

### Create PR

When you finished your changes for a feature, please add a last commit to update versions for updated packages:

```
pnpm changeset
```

Test
-----

Tests are located alongside with its targets, or inside `tests` folders. File names should be suffixed with `.spec.ts` or `.test.ts`.

Please run this command to run tests:

```
pnpm test
```

To generate test coverage:

```
pnpm test -- --coverage
```

Contribution
-----

All PRs and ideas for improvement are welcomed. 

If you got any issues using this package, don't hesitate to create new [🐞 Bug report][issues].

Feel free to clone this project, make changes that your feel necessary and pull request anytime you want.

**Working on your first Pull Request?**

You can learn how from this free video series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [good first issues][good-first] that contain bugs that have a relatively limited scope. This is a great place to get started.

Troubleshooting
-----
### How to sign my commits

Please follow these instructions:
- https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key
- https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key

### How to setup NodeJS

First, please install `nvm` following these instructions: https://github.com/nvm-sh/nvm#installing-and-updating

Then run these commands:
```
nvm install lts/iron
nvm alias default 20.10.0
```

### Eslint not working in VSCode

Please ensure you are using Eslint extension `v2.4.2` or older. Their latest released version `v2.4.4` introduces a bug that make eslint stop working.

🍻 Cheers.

[issues]: https://github.com/CoderPush/coda-mover/issues
[good-first]: https://github.com/CoderPush/coda-mover/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
