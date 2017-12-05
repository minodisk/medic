// @flow

require('jest');
const {
  ready,
  createPost,
  readPost,
  updatePost,
  destroyPost,
} = require('../src');

jest.setTimeout(60000);

const postIds = [];

beforeAll(async () => {
  await ready('cookies.json');
});

afterAll(async () => {
  for (const id of postIds) {
    await destroyPost(id);
  }
});

describe('createPost', () => {
  it('should create a post', async () => {
    const postId = await createPost(`# Title
## Subtitle
### Headline
#### Subheadline
Text
`);
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
