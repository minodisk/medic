// @flow

const unified = require("unified");
const md2mdast = require("remark-parse");
const mdast2html = require("remark-html");
const html2hast = require("rehype-parse");
const hast2mdast = require("rehype-remark");
const mdast2md = require("remark-stringify");

const transformMDAST = options => {
  return (tree, file) => {
    for (const node of tree.children) {
      switch (node.type) {
        case "blockquote":
          const children = [];
          for (const n of node.children) {
            if (n.type === "paragraph") {
              children.push(...n.children);
            } else {
              children.push(n);
            }
          }
          node.children = children;
          break;
      }
    }
    const c0 = tree.children[0];
    if (c0.type !== "heading" || c0.depth !== 1) {
      return;
    }
    c0.depth = 3;
    const c1 = tree.children[1];
    if (c1.type !== "heading" || c1.depth !== 2) {
      return;
    }
    c1.depth = 4;
  };
};

const transformHAST = options => {
  return (tree, file) => {
    const { children } = tree.children[0].children[1];
    for (const c of children) {
      if (c.properties == null || c.properties.className == null) {
        continue;
      }
      if (c.properties.className.indexOf("graf--title") !== -1) {
        c.tagName = "h1";
      }
      if (c.properties.className.indexOf("graf--subtitle") !== -1) {
        c.tagName = "h2";
      }
    }
  };
};

const md2html = (md: string): Promise<string> =>
  new Promise((resolve, reject) => {
    unified()
      .use(md2mdast)
      .use(transformMDAST)
      .use(mdast2html)
      .process(md, (err, file) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(String(file));
      });
  });

const html2md = (html: string): Promise<string> =>
  new Promise((resolve, reject) => {
    unified()
      .use(html2hast)
      .use(transformHAST)
      .use(hast2mdast)
      .use(mdast2md)
      .process(html, (err, file) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(String(file));
      });
  });

module.exports = { md2html, html2md };
