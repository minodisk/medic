# @minodisk/medic

CLI manipulates your posts with markdown files.

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
    -c, --cookies-path <path>  cookies file path (default: cookies.json)
    -h, --help                 output usage information


  Commands:

    sync <patterns...>  Creates or Updates posts
```

### Creates or Updates posts

```sh
$ medic sync --help

  Usage: sync [options] <patterns...>

  Creates or Updates posts


  Options:

    -h, --help  output usage information

  Examples:

    medic sync articles/
    medic sync articles/example.md
    medic sync $(git diff --name-only)
```
