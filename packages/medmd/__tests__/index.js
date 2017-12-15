// @flow

require('jest');
const vfile = require('vfile');
const {md2html, html2md} = require('../src/index');

describe('md2html', () => {
  it('should transform # and ## at head to h3 and h4', async () => {
    const html = await md2html(`# Title

## Subtitle

### Headline

#### Subheadline

Text
`);
    expect(html).toBe(`<h3>Title</h3>
<h4>Subtitle</h4>
<h3>Headline</h3>
<h4>Subheadline</h4>
<p>Text</p>
`);
  });

  describe('figure', () => {
    it('1 image', async () => {
      const html = await md2html(
        vfile({
          path: __filename,
          contents: `![Red](fixtures/red.png)`,
        }),
      );
      expect(html).toBe(
        `<figure><img src="fixtures/red.png" alt="Red"><figcaption>Red</figcaption></figure>
`,
      );
    });

    it('2 images', async () => {
      const html = await md2html(
        vfile({
          path: __filename,
          contents: `![Red](fixtures/red.png) ![Green](fixtures/green.png)`,
        }),
      );
      expect(html).toBe(
        `<figure class="graf--layoutOutsetRow"><img src="fixtures/red.png" alt="Red" data-width="400" data-height="300"><figcaption>Red | Green</figcaption></figure>
<figure class="graf--layoutOutsetRowContinue"><img src="fixtures/green.png" alt="Green" data-width="300" data-height="300"><figcaption></figcaption></figure>
`,
      );
    });

    it('3 images', async () => {
      const html = await md2html(
        vfile({
          path: __filename,
          contents: `![Red](fixtures/red.png) ![Green](fixtures/green.png) ![Blue](fixtures/blue.png)`,
        }),
      );
      expect(html).toBe(
        `<figure class="graf--layoutOutsetRow"><img src="fixtures/red.png" alt="Red" data-width="400" data-height="300"><figcaption>Red | Green | Blue</figcaption></figure>
<figure class="graf--layoutOutsetRowContinue"><img src="fixtures/green.png" alt="Green" data-width="300" data-height="300"><figcaption></figcaption></figure>
<figure class="graf--layoutOutsetRowContinue"><img src="fixtures/blue.png" alt="Blue" data-width="300" data-height="400"><figcaption></figcaption></figure>
`,
      );
    });
  });
});

describe('html2md', () => {
  it('should transform h3 and h4 at head to # and ##', async () => {
    const md = await html2md(`<h3 class="graf graf--h3 graf--leading graf--title is-selected">Title</h3>
<h4 class="graf graf--h4 graf-after--h3 graf--subtitle">Subtitle</h4>
<h3 class="graf graf--h3 graf-after--h4">Headline</h3>
<h4 class="graf graf--h4 graf-after--h3">Subheadline</h4>
<p class="graf graf--p graf-after--h4 graf--trailing">Text</p>
`);
    expect(md).toBe(`# Title

## Subtitle

### Headline

#### Subheadline

Text
`);
  });
});
