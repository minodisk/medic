// @flow

const { fetch, sync, rm } = require("../src");

jest.setTimeout(60000);

let client;
const postIds = [];

describe("sync", () => {
  it("should create a post", async () => {
    const postId = await sync(
      client,
      `# Title
## Subtitle
### Headline
#### Subheadline
Text
`,
    );
    postIds.push(postId);
    const md = await readPost(postId);
    expect(md).toBe(`# Title

## Subtitle

### Headline

#### Subheadline

Text
`);
  });
});

describe("rm", () => {
  it("destroys post", async () => {
    for (const id of postIds) {
      await rm(client, id);
    }
  });
});
