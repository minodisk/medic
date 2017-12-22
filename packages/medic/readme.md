# @minodisk/medic [![npm version](https://img.shields.io/npm/v/@minodisk/medic.svg?style=flat-square)](https://www.npmjs.com/package/@minodisk/medic)

A CLI retrives the post metadata and body from the markdown file, transforms the body to HTML with [@minodisk/medmd](https://github.com/minodisk/medic/tree/master/packages/medic), then create and update posts in [Medium](https://medium.com/) with [@minodisk/medkit](https://github.com/minodisk/medic/tree/master/packages/medkit).

## Installation

```sh
$ npm install -g @minodisk/medic
```

## Usage

```sh
$ medic --help

  Usage: medic [options] [command]


  Options:

    -V, --version              output the version number
    -d, --debug                not to use headless Chromium
    -c, --cookies-path <path>  cookies file path (default: cookies.json)
    -h, --help                 output usage information


  Commands:

    sync <patterns...>  creates or updates posts
```

### Sync posts to Medium

```sh
$ medic sync --help

  Usage: sync [options] <patterns...>

  creates or updates posts


  Options:

    -h, --help  output usage information


  Examples:

    medic sync articles/example.md
    medic sync articles/*.md
    medic sync $(git diff --name-only)
```

## Supported functions

* [x] [Write post](https://help.medium.com/hc/en-us/articles/225168768-Write-post)
* [x] [Edit post](https://help.medium.com/hc/en-us/articles/215194537-Edit-post)
* [ ] [Delete draft](https://help.medium.com/hc/en-us/articles/215591007-Delete-draft)
* [ ] [Delete post](https://help.medium.com/hc/en-us/articles/214896058-Delete-post)
* [ ] [Schedule to publish](https://help.medium.com/hc/en-us/articles/216650227-Schedule-to-publish)
* [ ] [Unpublish post](https://help.medium.com/hc/en-us/articles/227056408-How-do-I-unpublish-a-post-)
* [x] [Tags](https://help.medium.com/hc/en-us/articles/214741038-Tags)
* [x] [Image captions](https://help.medium.com/hc/en-us/articles/115004808787-Image-captions)
* [x] [Image grids](https://help.medium.com/hc/en-us/articles/115004808587-Image-grids)
* [x] [Embed Tweets](https://help.medium.com/hc/en-us/articles/216196547-Embed-Tweets)
