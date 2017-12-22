# @minodisk/medmd [![npm version](https://img.shields.io/npm/v/@minodisk/medmd.svg?style=flat-square)](https://www.npmjs.com/package/@minodisk/medmd)

A library for transforming markdown into HTML for [Medium](https://medium.com/).

## API

### `md2html(md: string): Promise<string>`

`md2html` transform `md` to HTML.

## Supported

* Block Elements
  * [x] Paragraphs and Line Breaks
  * [x] Headers
  * [x] Horizontal Rules
  * [x] Blockquotes
  * [x] Lists
  * [x] Code Block
* Inline
  * [x] Links
  * [x] Emphasis
  * [x] Code
  * [x] Images
