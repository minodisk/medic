// @flow

require('jest');
const {create, read, update, destroy} = require('../src');
const {wait} = require('@minodisk/medkit');

jest.setTimeout(60000);

const postIds = [];

afterAll(() => {
  for (const id of postIds) {
    destroy(id);
  }
});

describe('create', () => {
  it('should create a post', async () => {
    const postId = await create(`### Title
#### Subtitle
### Headline
#### Subheadline
Text`);
    postIds.push(postId);
    const html = await read(postId);
    expect(html).toBe(`# Title
## Subtitle
Text
`);
  });
});
