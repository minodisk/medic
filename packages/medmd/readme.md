# @minodisk/medmd

Transform between Medium's HTML and markdown. `#` at the beginning of the markdown and `##` are interpreted as Medium article title and subtitle.

## API

### md2html(md: string): Promise<string>

`md2html` transform `md` to HTML.

### html2md(html: string): Promise<string>

`html2md` transform `html` to markdown.
