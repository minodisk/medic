// @flow

const path = require("path");

const unified = require("unified");
const md2mdast = require("remark-parse");
const breaks = require("remark-breaks");

const mdast2hast = require("mdast-util-to-hast");
const u = require("unist-builder");
const hast2html = require("hast-util-to-html");
const sanitize = require("hast-util-sanitize");
const normalize = require("mdurl/encode");
const request = require("sync-request");
const sizeOf = require("image-size");

const html2hast = require("rehype-parse");
const hast2mdast = require("rehype-remark");
const mdast2md = require("remark-stringify");

type VFile = {
  contents: string,
  cwd: string,
  data: any,
  messages: Array<any>,
  history: Array<any>,
  path?: string,
  basename?: string,
  stem?: string,
  extname?: string,
  dirname?: string,
};

const isEmpty = (text: string) => /^ *$/.test(text);

const transformMDAST = options => {
  return (tree, file) => {
    const t = node => {
      switch (node.type) {
        case "blockquote": {
          const c = [];
          for (const n of node.children) {
            if (n.type === "paragraph") {
              c.push(...n.children);
            } else {
              c.push(n);
            }
          }
          node.children = c;
          return [node];
        }

        case "paragraph": {
          if (node.children == null) {
            return [node];
          }

          let isOnlyImage = true;
          let len = 0;
          const captions = [];
          for (const n of node.children) {
            switch (n.type) {
              case "image":
                const caption = n.alt || n.title || "";
                if (caption !== "") {
                  captions.push(caption);
                }
                len++;
                break;
              case "text":
                if (!isEmpty(n.value)) {
                  isOnlyImage = false;
                  break;
                }
                break;
              default:
                isOnlyImage = false;
                break;
            }
          }
          if (!isOnlyImage) {
            node.children = transform(node.children);
            return [node];
          }
          if (len < 2) {
            return transform(node.children);
          }

          let i = 0;
          const c = [];
          for (const n of node.children) {
            switch (n.type) {
              case "image":
                let { url } = n;
                if (/^https?:\/\//.test(url)) {
                  const res = request("GET", url);
                  const { width, height } = sizeOf(res.body);
                  n.width = width;
                  n.height = height;
                } else {
                  if (file.history != null && file.history.length > 0) {
                    const dir = path.dirname(file.history[0]);
                    url = path.join(dir, url);
                  }
                  const { width, height } = sizeOf(url);
                  n.width = width;
                  n.height = height;
                }
                let caption;
                if (captions.length <= 1) {
                  caption = n.alt || n.title || "";
                } else {
                  if (i === 0) {
                    caption = captions.join(" | ");
                  } else {
                    caption = "";
                  }
                }
                c.push({
                  type: "figure",
                  class:
                    i === 0
                      ? "graf--layoutOutsetRow"
                      : "graf--layoutOutsetRowContinue",
                  children: [
                    n,
                    {
                      type: "figcaption",
                      children: [
                        {
                          type: "text",
                          value: caption,
                        },
                      ],
                    },
                  ],
                });
                i++;
                break;
            }
          }
          return c;
        }

        case "image":
          const caption = node.alt || node.title || "";
          return [
            {
              type: "figure",
              children: [
                node,
                {
                  type: "figcaption",
                  children: [{ type: "text", value: caption }],
                },
              ],
            },
          ];

        default:
          if (node.children != null) {
            node.children = transform(node.children);
          }
          return [node];
      }
    };
    const transform = children => {
      if (children == null || children.length === 0) {
        return children;
      }
      const newChildren = [];
      for (const child of children) {
        const cs = t(child);
        if (cs != null && cs.length > 0) {
          newChildren.push(...cs);
        }
      }
      return newChildren;
    };
    tree.children = transform(tree.children);

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

const mdast2html = function(options) {
  var settings = options || {};
  var clean = settings.sanitize;
  var schema = clean && typeof clean === "object" ? clean : null;
  var handlers = settings.handlers || {};

  this.Compiler = function(node, file) {
    var root = node && node.type && node.type === "root";
    var hast = mdast2hast(node, {
      allowDangerousHTML: !clean,
      handlers: {
        div: (h, node) => {
          const props = {};
          if (node.class != null) {
            props.class = node.class;
          }
          if (node.paragraphCount != null) {
            props["data-paragraph-count"] = node.paragraphCount;
          }
          return h(node, "div", props, all(h, node));
        },
        figure: (h, node) => {
          const props = {};
          if (node.class != null) {
            props.class = node.class;
          }
          return h(node, "figure", props, all(h, node));
        },
        figcaption: (h, node) => {
          return h(node, "figcaption", all(h, node));
        },
        image: (h, node) => {
          const props: any = { src: normalize(node.url), alt: node.alt };
          if (node.title != null) {
            props.title = node.title;
          }
          if (node.width != null) {
            props["data-width"] = node.width;
          }
          if (node.height != null) {
            props["data-height"] = node.height;
          }
          return h(node, "img", props);
        },
        // blockquote: (h, node) => {
        //   const props = {};
        //   if (node.class != null) {
        //     props.class = node.class;
        //   }
        //   if (node.lang != null) {
        //     props['data-lang'] = node.lang;
        //   }
        //   return h(node, 'blockquote', props, wrap(all(h, node), true));
        // },
      },
    });
    var result;

    if (file.extname) {
      file.extname = ".html";
    }

    if (clean) {
      hast = sanitize(hast, schema);
    }

    result = hast2html(hast, {
      ...settings,
      allowDangerousHTML: !clean,
    });

    /* Add a final newline. */
    if (root && result.charAt(result.length - 1) !== "\n") {
      result += "\n";
    }

    return result;
  };
};
var trim = require("trim");
var own = {}.hasOwnProperty;

/* Transform an unknown node. */
function unknown(h, node) {
  if (text(node)) {
    return h.augment(node, u("text", node.value));
  }

  return h(node, "div", all(h, node));
}

/* Visit a node. */
function one(h, node, parent) {
  var type = node && node.type;
  var fn = own.call(h.handlers, type) ? h.handlers[type] : null;

  /* Fail on non-nodes. */
  if (!type) {
    throw new Error("Expected node, got `" + node + "`");
  }

  return (typeof fn === "function" ? fn : unknown)(h, node, parent);
}

/* Check if the node should be renderered a text node. */
function text(node) {
  var data = node.data || {};

  if (
    own.call(data, "hName") ||
    own.call(data, "hProperties") ||
    own.call(data, "hChildren")
  ) {
    return false;
  }

  return "value" in node;
}

function all(h, parent) {
  var nodes = parent.children || [];
  var length = nodes.length;
  var values = [];
  var index = -1;
  var result;
  var head;

  while (++index < length) {
    result = one(h, nodes[index], parent);

    if (result) {
      if (index && nodes[index - 1].type === "break") {
        if (result.value) {
          result.value = trim.left(result.value);
        }

        head = result.children && result.children[0];

        if (head && head.value) {
          head.value = trim.left(head.value);
        }
      }

      values = values.concat(result);
    }
  }

  return values;
}

/* Wrap `nodes` with newlines between each entry.
 * Optionally adds newlines at the start and end. */
function wrap(nodes, loose) {
  var result = [];
  var index = -1;
  var length = nodes.length;

  if (loose) {
    result.push(u("text", "\n"));
  }

  while (++index < length) {
    if (index) {
      result.push(u("text", "\n"));
    }

    result.push(nodes[index]);
  }

  if (loose && nodes.length !== 0) {
    result.push(u("text", "\n"));
  }

  return result;
}

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

const md2html = (md: string | VFile): Promise<string> =>
  new Promise((resolve, reject) => {
    unified()
      .use(md2mdast)
      .use(breaks)
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
