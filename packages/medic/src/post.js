// @flow

const { md2html, html2md } = require("@minodisk/medmd");
const Client = require("@minodisk/medkit");
const { toPost, toText } = require("./format");
const { readFile, writeFile, glob } = require("./utils");

const readPost = (client: Client, postId: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const { html, options } = await client.readPost(postId);
    await client.close();
    const body = await html2md(html);
    resolve(toText({ meta: { id: postId, ...options }, body }));
  });
};

const sync = (client: Client, patterns: Array<string>): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    for (const pattern of patterns) {
      const paths = await glob(pattern);
      for (const path of paths) {
        await syncPost(client, path);
      }
    }
  });
};

const syncPost = (client: Client, path: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const text = await readFile(path);
    const post = toPost(text);
    const html = await md2html(post.body);
    console.log(html);
    const { id, ...options } = post.meta;
    if (id == null) {
      const postId = await client.createPost(html, options);
      post.meta.id = postId;
      const newText = toText(post);
      await writeFile(path, newText);
    } else {
      await client.updatePost(id, html, options);
    }
    await client.close();
    resolve();
  });
};

// <figure name="7ddc" class="graf graf--figure graf--iframe">
//   <div class="aspectRatioPlaceholder is-locked">
//     <div class="aspectRatioPlaceholder-fill" style="padding-bottom: 37%;"></div>
//     <div class="iframeContainer">
//       <IFRAME data-width="500" data-height="185" width="500" height="185" src="/media/4a50e59f7475295e80df830b82a71879" data-media-id="4a50e59f7475295e80df830b82a71879" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fmedia%2FDM4iiYtU8AA3Plo.jpg%3Alarge&amp;key=4fce0568f2ce49e8b54624ef71a8a5bd" allowfullscreen frameborder="0"></IFRAME>
//     </div>
//   </div>
// </figure>

// https://twitter.com/minodisk/status/922726097208446976
//
// <blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Dactylキーボード、Clojureのソースいじってビルドするとネジ止め用の穴があいて本物のプログラマブルキーボードという感じがする <a href="https://t.co/Kb5yHHeA0w">pic.twitter.com/Kb5yHHeA0w</a></p>&mdash; apt (@minodisk) <a href="https://twitter.com/minodisk/status/922726097208446976?ref_src=twsrc%5Etfw">2017年10月24日</a></blockquote>
// <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
//
// <figure name="756a" class="graf graf--figure graf--iframe"><div class="aspectRatioPlaceholder is-locked"><div class="aspectRatioPlaceholder-fill" style="padding-bottom: 37%;"></div><div class="iframeContainer"><IFRAME data-width="500" data-height="185" width="500" height="185" src="/media/4a50e59f7475295e80df830b82a71879" data-media-id="4a50e59f7475295e80df830b82a71879" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fmedia%2FDM4iiYtU8AA3Plo.jpg%3Alarge&amp;key=a19fcc184b9711e1b4764040d3dc5c07" allowfullscreen frameborder="0"></IFRAME></div></div></figure>

const destroyPost = (client: Client, text: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const { meta } = toPost(text);
    await client.destroyPost(meta.id);
    await client.close();
    resolve();
  });
};

module.exports = { sync, readPost, destroyPost };
