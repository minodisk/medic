// @flow

const Client = require("@minodisk/medkit");
const createClient = require("./client");
const { md2html } = require("@minodisk/medmd");
const { toPost, toText } = require("./format");
const { readFile, writeFile, glob } = require("./utils");
import type { SyncOptions } from "./types";

module.exports = async (
  patterns: Array<string>,
  options: SyncOptions,
  args?: Array<string>,
) => {
  await syncPosts(createClient(options.parent, args), patterns);
};

const syncPosts = async (client: Client, patterns: Array<string>) => {
  for (const pattern of patterns) {
    const paths = await glob(pattern);
    if (paths.length === 0) {
      throw new Error(`no matched file for the pattern: ${pattern}`);
    }
    for (const path of paths) {
      await syncPost(client, path);
    }
  }
};

const syncPost = async (client: Client, path: string) => {
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
};
