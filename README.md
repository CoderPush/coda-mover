Coda Mover
=====

![build][badge-build]
![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![changelog][badge-changelog]](/CHANGELOG.md)

Coda contents migration made simple

🥳 Usage
-----

A nice guideline on how to use the tool, please check it out:
https://www.loom.com/share/7c8d4f0e62714124b81ad1e462d56f7f?sid=453a8151-84d5-43aa-8c6c-2f9f1082dc3f

> For MacOS users, the application can be opened with:
> right-click > Open > Open

<img width="400" alt="image" src="https://github.com/CoderPush/coda-mover/assets/13363340/2d59e452-5dcb-4bc6-a028-0e1a2910c9b6">

Installation
-----

Please find download links on our [Releases](https://github.com/CoderPush/coda-mover/releases) page. Pick one of available options:

- `mac.zip` links for MacOS build as zip file
- `dmg` links for MacOS builds as commonly used Apple disk image format

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

A development application will start

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

Build
-----

To build distributable package please use this command:

```
pnpm dist
```

These are formats that will be produced (file named as `Coda Mover-<version>`):

- `.dmg` package for MacOS
- `mac.zip` zip package for MacOS

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

### Fix Library not loaded: @rpath/Electron Framework

Something wrong with cached install of Electron. Fix this issue by re-running electron install script:
```
rm -rf node_modules/electron/dist && node node_modules/electron/install.js
```

More information https://github.com/electron/electron/issues/10702#issuecomment-431698637

🍻 Cheers.

[issues]: https://github.com/CoderPush/coda-mover/issues
[good-first]: https://github.com/CoderPush/coda-mover/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22

[badge-build]: https://github.com/CoderPush/coda-mover/actions/workflows/build.yaml/badge.svg
[badge-changelog]: https://img.shields.io/badge/changelog-8A2BE2
