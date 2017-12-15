// @flow

const {readPost, syncPosts, destroyPost} = require('../src');

jest.setTimeout(60000);

let client;
const postIds = [];

beforeAll(() => {
  client = new Client();
});

describe('syncPosts', () => {
  it('should create a post', async () => {
    const postId = await syncPosts(
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

describe('destroyPost', () => {
  it('destroys post', async () => {
    for (const id of postIds) {
      await destroyPost(client, id);
    }
  });
});
