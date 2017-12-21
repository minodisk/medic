# Medic

Tool for manipulating Medium posts written in markdown.

## Motivation

I think Medium's has an elegant WYSIWYG editor. But, I would like to write or edit
technical posts in another editor and manage version of the posts in Git etc.
When trying to do it, it cannot be realized with the
[Medium's official API](https://github.com/Medium/medium-api-docs). Because it
only supports creating post, it does not support reading, updating and
destroying.

## Getting Started

### Step 1. Install CLI

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

* [@minodisk/medic](packages/medic): CLI manipulates Medium posts with markdown files.
* [@minodisk/medkit](packages/medkit): SDK manipulates Medium posts.
* [@minodisk/medmd](packages/medmd): Converter markdown to HTML for Medium.
