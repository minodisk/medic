// @flow

const {toPost, toText} = require('../src/utils');

describe('toPost', () => {
  [
    {
      name: 'with empty text',
      text: ``,
      want: {
        header: {},
        body: ``,
      },
    },
    {
      name: 'with empty header',
      text: `---
---
Body
`,
      want: {
        header: {},
        body: `---
---
Body
`,
      },
    },
    {
      name: "with header dosn't contain expedted keys",
      text: `---
tags
---
Body`,
      want: {
        header: {},
        body: `---
tags
---
Body`,
      },
    },
    {
      name: 'with header contains expected keys',
      text: `---
tags:
---
Body`,
      want: {
        header: {
          tags: null,
        },
        body: `Body`,
      },
    },
    {
      name: 'with tags in header',
      text: `---
tags:
- Medium
- SDK
- Node.js
---
Body`,
      want: {
        header: {
          tags: ['Medium', 'SDK', 'Node.js'],
        },
        body: `Body`,
      },
    },
    {
      name: 'ignores empty line at the header of body',
      text: `---
tags:
- Medium
- SDK
- Node.js
---

Body`,
      want: {
        header: {
          tags: ['Medium', 'SDK', 'Node.js'],
        },
        body: `Body`,
      },
    },
  ].forEach(c => {
    it(c.name, () => {
      expect(toPost(c.text)).toEqual(c.want);
    });
  });
});

describe('toText', () => {
  [
    {
      name: 'empty',
      post: {
        header: {},
        body: ``,
      },
      want: ``,
    },
    {
      name: 'empty header',
      post: {
        header: {},
        body: `Body`,
      },
      want: `Body`,
    },
    {
      name: 'with id',
      post: {
        header: {
          id: 'abcde',
        },
        body: `Body`,
      },
      want: `---
id: abcde
---

Body
`,
    },
  ].forEach(c => {
    it(c.name, () => {
      expect(toText(c.post)).toEqual(c.want);
    });
  });
});
