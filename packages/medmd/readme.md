# @minodisk/medmd

Converter converts markdown to HTML for Medium.

## API

### `md2html(md: string): Promise<string>`

`md2html` transform `md` to HTML.

### `html2md(html: string): Promise<string>`

`html2md` transform `html` to markdown.

## Supported Markdown Format

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
