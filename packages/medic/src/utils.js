// @flow

const yaml = require('js-yaml');

type Header = {
  id?: string,
  tags?: Array<string>,
};

type Post = {
  header: Header,
  body: string,
};

const isValidHeader = (header: Header): boolean => {
  if (
    header == null ||
    typeof header !== 'object' ||
    Object.prototype.toString.call(header) !== '[object Object]'
  ) {
    return false;
  }
  const keys = Object.keys(header);
  for (const k of ['id', 'tags']) {
    if (keys.includes(k)) {
      return true;
    }
  }
  return false;
};

const toPost = (text: string): Post => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) {
    return {header: {}, body: text};
  }
  const firstLine = lines[0];
  if (firstLine !== '---') {
    return {header: {}, body: text};
  }

  const headerLines = [];
  const len = lines.length;
  let found = false;
  let i = 1;
  for (; i < len; i++) {
    const line = lines[i];
    if (line === '---') {
      found = true;
      break;
    }
    headerLines.push(line);
  }
  if (!found) {
    return {header: {}, body: text};
  }

  const headerText = headerLines.join('\n');
  const header = yaml.load(headerText);
  if (!isValidHeader(header)) {
    return {header: {}, body: text};
  }

  const restLines = [];
  let checkEmpty = true;
  for (let j = i + 1; j < len; j++) {
    const line = lines[j];
    if (checkEmpty) {
      if (line === '') {
        continue;
      }
      checkEmpty = false;
    }
    restLines.push(line);
  }
  return {header, body: restLines.join('\n')};
};

const toText = (post: Post): string => {
  const {header, body} = post;
  if (!isValidHeader(header)) {
    return body;
  }
  const h = yaml.safeDump(header);
  return `---
${h}---

${body}
`;
};

module.exports = {toPost, toText};
