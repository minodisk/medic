// @flow

const Client = require("@minodisk/medkit");
const createClient = require("./client");
const { md2html } = require("@minodisk/medmd");
const { toPost, toText } = require("./format");
const { readFile, writeFile, glob } = require("./utils");
import type { SyncOptions } from "./types";

module.exports = function sync(
  patterns: Array<string>,
  options: SyncOptions,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await syncPosts(createClient(options.parent), patterns);
  });
};

const syncPosts = (client: Client, patterns: Array<string>): Promise<void> => {
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
