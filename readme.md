# Medic [![typed with: Flow](https://img.shields.io/badge/typed%20with-Flow-E7BC35.svg?style=flat-square)](https://flow.org/) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier) [![MIT License](https://img.shields.io/github/license/minodisk/medic.svg?style=flat-square)](./LICENSE) [![Codeship Status for minodisk/medic](https://img.shields.io/codeship/4f57d400-c917-0135-1586-5e72f9d08083/master.svg?style=flat-square)](https://app.codeship.com/projects/261653)

Tool for manipulating [Medium](https://medium.com/) posts written in markdown.

## Getting Started

### Step 1. Install CLI

```sh
$ yarn global add @minodisk/medic
```

or

```sh
$ npm install -g @minodisk/medic
```

### Step 2. Create a markdown file

getting-started.md:

```markdown
# Hello World

This post is created with [medic](https://github.com/minodisk/medic).
```

### Step 3. Sync to Medium

```sh
$ medic sync getting-started.md
```

### Step 4. Modify the markdown

getting-started.md:

```markdown
---
id: 0123456789abcdef # DO NOT EDIT
tags:
- Test
- Medic
---

# Hello World

## Medic transform markdown to HTML and creates and updates posts in Medium.

This post is updated with [medic](https://github.com/minodisk/medic).
```

### Step 5. Sync to Medium

```sh
$ medic sync getting-started.md
```

## Packages

* [@minodisk/medic](packages/medic): A CLI retrives the post metadata and body from the markdown file, transforms the body to HTML with [@minodisk/medmd](https://github.com/minodisk/medic/tree/master/packages/medic), then create and update posts in [Medium](https://medium.com/) with [@minodisk/medkit](https://github.com/minodisk/medic/tree/master/packages/medkit).
* [@minodisk/medkit](packages/medkit): A SDK for post creation and update by emulating operation on [Medium](https://medium.com/)'s post edit screen with Headless Chromium via [puppetter](https://github.com/GoogleChrome/puppeteer).
* [@minodisk/medmd](packages/medmd): A library for transforming markdown into HTML for [Medium](https://medium.com/).
