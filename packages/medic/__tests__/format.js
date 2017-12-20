// @flow

const { toPost, toText } = require("../src/format");

describe("toPost", () => {
  [
    {
      name: "with empty text",
      text: ``,
      want: {
        meta: {},
        body: ``,
      },
    },
    {
      name: "with empty meta",
      text: `---
---
Body
`,
      want: {
        meta: {},
        body: `---
---
Body
`,
      },
    },
    {
      name: "with meta dosn't contain expedted keys",
      text: `---
tags
---
Body`,
      want: {
        meta: {},
        body: `---
tags
---
Body`,
      },
    },
    {
      name: "with meta contains expected keys",
      text: `---
tags:
---
Body`,
      want: {
        meta: {
          tags: null,
        },
        body: `Body`,
      },
    },
    {
      name: "with tags in meta",
      text: `---
tags:
- Medium
- SDK
- Node.js
---
Body`,
      want: {
        meta: {
          tags: ["Medium", "SDK", "Node.js"],
        },
        body: `Body`,
      },
    },
    {
      name: "ignores empty line at the meta of body",
      text: `---
tags:
- Medium
- SDK
- Node.js
---

Body`,
      want: {
        meta: {
          tags: ["Medium", "SDK", "Node.js"],
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

describe("toText", () => {
  [
    {
      name: "empty",
      post: {
        meta: {},
        body: ``,
      },
      want: ``,
    },
    {
      name: "empty meta",
      post: {
        meta: {},
        body: `Body`,
      },
      want: `Body`,
    },
    {
      name: "with id",
      post: {
        meta: {
          id: "abcde",
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
