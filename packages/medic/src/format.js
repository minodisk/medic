// @flow

const yaml = require("js-yaml");

type Meta = {
  id?: string,
  tags?: Array<string>
};

type Post = {
  meta: Meta,
  body: string
};

const isValidMeta = (meta: Meta): boolean => {
  if (
    meta == null ||
    typeof meta !== "object" ||
    Object.prototype.toString.call(meta) !== "[object Object]"
  ) {
    return false;
  }
  const keys = Object.keys(meta);
  for (const k of ["id", "tags"]) {
    if (keys.includes(k)) {
      return true;
    }
  }
  return false;
};

const toPost = (text: string): Post => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) {
    return { meta: {}, body: text };
  }
  const firstLine = lines[0];
  if (firstLine !== "---") {
    return { meta: {}, body: text };
  }

  const headerLines = [];
  const len = lines.length;
  let found = false;
  let i = 1;
  for (; i < len; i++) {
    const line = lines[i];
    if (line === "---") {
      found = true;
      break;
    }
    headerLines.push(line);
  }
  if (!found) {
    return { meta: {}, body: text };
  }

  const headerText = headerLines.join("\n");
  const meta = yaml.load(headerText);
  if (!isValidMeta(meta)) {
    return { meta: {}, body: text };
  }

  const restLines = [];
  let checkEmpty = true;
  for (let j = i + 1; j < len; j++) {
    const line = lines[j];
    if (checkEmpty) {
      if (line === "") {
        continue;
      }
      checkEmpty = false;
    }
    restLines.push(line);
  }
  return { meta, body: restLines.join("\n") };
};

const toText = (post: Post): string => {
  const { meta, body } = post;
  if (!isValidMeta(meta)) {
    return body;
  }
  const h = yaml.safeDump(meta);
  return `---
${h}---

${body}
`;
};

module.exports = { toPost, toText };
