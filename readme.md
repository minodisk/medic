# Medic

Tool for manipulating Medium posts written in markdown.

## Motivation

I think Medium's has an elegant WYSIWYG editor. But, I would like to write or edit
technical posts in another editor and manage version of the posts in Git etc.
When trying to do it, it can not be realized with the
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

## What you can do with Medic

* [x] [Write post](https://help.medium.com/hc/en-us/articles/225168768-Write-post)
* [x] [Edit post](https://help.medium.com/hc/en-us/articles/215194537-Edit-post)
* [x] [Delete draft](https://help.medium.com/hc/en-us/articles/215591007-Delete-draft)
* [x] [Delete post](https://help.medium.com/hc/en-us/articles/214896058-Delete-post)
* [ ] [Schedule to publish](https://help.medium.com/hc/en-us/articles/216650227-Schedule-to-publish)
* [ ] [Unpublish post](https://help.medium.com/hc/en-us/articles/227056408-How-do-I-unpublish-a-post-)
* [x] [Tags](https://help.medium.com/hc/en-us/articles/214741038-Tags)
* [x] [Image captions](https://help.medium.com/hc/en-us/articles/115004808787-Image-captions)
* [x] [Image grids](https://help.medium.com/hc/en-us/articles/115004808587-Image-grids)
* [x] [Embed Tweets](https://help.medium.com/hc/en-us/articles/216196547-Embed-Tweets)

## Packages

* [@minodisk/medic](packages/medic): CLI manipulates Medium posts with markdown files.
* [@minodisk/medkit](packages/medkit): SDK manipulates Medium posts.
* [@minodisk/medmd](packages/medmd): Converter markdown to HTML for Medium.
