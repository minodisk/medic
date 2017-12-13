# @minodisk/medkit

SDK manipulates Medium posts.

## Installation

npm:

```sh
npm install --save @minodisk/medkit
```

yarn:

```sh
yarn add @minodisk/medkit
```

## Usage

```js
import Client from "@minodisk/medkit";

(async () => {
  const client = new Client();
  const postId = await client.createPost(
    "<h3>Title</h3><h4>Subtitle</h4><p>Text</p>"
  );
  const html = await client.readPost(postId); // ->  "<h1>Title</h1><h2>Subtitle</h2><p>Text</p>" or "<h3>Title</h3><h4>Subtitle</h4><p>Text</p>"
  await client.updatePost(
    postId,
    "<h3>Title</h3><h4>Subtitle</h4><p>Modified</p>"
  );
  await client.destroyPost(postId);
  await client.close();
})();
```

## API

### `new Client(options?: {cookiesPath?: string}): Client`

`new Client()` returns `Client`. `cookiesPath` in `options` is `"cookies.json"`
in default.

#### `Client.prototype.createPost(html: string): Promise<string>`

`createPost` opens Medium's new story screen and pastes the passed `html` in the
post field. When saving the post is completed, returned `Promise` will pass the
post ID to the next step and complete.

#### `Client.prototype.readPost(postId: string): Promise<string>`

`readPost` opens Medium's edit screen with post ID `postId` and gets the HTML in
post filed. When getting the post HTML is completed, returned `Promise` will
pass that HTML to the next step and complete.

#### `Client.prototype.updatePost(postId: string, html: string): Promise<void>`

`updatePost` opens Medium's edit story screen with post ID `postId` and pastes
the passed `html` in the post field. When saving the post is completed, returned
`Promise` will complete.

#### `Client.prototype.destroyPost(postId: string): Promise<void>`

`destroyPost` opens Medium's edit story screen with post ID`postId` and clicks
delete button. When deleting the post is completed, returned `Promise` will
complete.

#### `Client.prototype.close(): Promise<void>`

`close` closes Chromium. When closing Chromium is completed, returned `Promise`
will complete.

## FAQ

### How is it realized?

Using with Chromium via
[GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer) and operate
Medium's page and sometime evaluate JavaScript inside the page.

### Why doesn't run with headless mode?

When trying to operate Medium's post edit page in headless mode, some operations
such as paste and selection are not executed properly.

## Supported Functions

* [x] [Write post – Medium Support](https://help.medium.com/hc/en-us/articles/225168768-Write-post)
* [x] [Edit post – Medium Support](https://help.medium.com/hc/en-us/articles/215194537-Edit-post)
* [x] [Delete draft – Medium Support](https://help.medium.com/hc/en-us/articles/215591007-Delete-draft)
* [x] [Delete post – Medium Support](https://help.medium.com/hc/en-us/articles/214896058-Delete-post)
* [ ] [Schedule to publish – Medium Support](https://help.medium.com/hc/en-us/articles/216650227-Schedule-to-publish)
* [ ] [How do I unpublish a post? – Medium Support](https://help.medium.com/hc/en-us/articles/227056408-How-do-I-unpublish-a-post-)
* [x] [Tags – Medium Support](https://help.medium.com/hc/en-us/articles/214741038-Tags)
* [x] [Image captions – Medium Support](https://help.medium.com/hc/en-us/articles/115004808787-Image-captions)

- [x] [Image grids – Medium Support](https://help.medium.com/hc/en-us/articles/115004808587-Image-grids)
- [x] [Embed Tweets – Medium Support](https://help.medium.com/hc/en-us/articles/216196547-Embed-Tweets)
