#!/usr/bin/env node
// @flow

const program = require("commander");
const Client = require("@minodisk/medkit");
const { sync } = require("./post");

program
  .version("0.0.1")
  .option("-c, --cookies-path <path>", "cookies file path", "cookies.json");

// program
//   .command("fetch [ids...]")
//   .description("fetches posts")
//   .option("-o, --out <directory>", "output directory")
//   .action((ids, options) => {
//     console.log("action:", ids, options);
//   })
//   .on("--help", () => {
//     process.stdout.write(`
//   Examples:
//
//     medic fetch 0123456789abc
//     medic fetch --out=articles/
//     medic fetch --out=articles/ 0123456789abc
// `);
//   });

program
  .command("sync <patterns...>")
  .description("creates or updates posts")
  .action(async (patterns, options) => {
    try {
      const { cookiesPath } = options.parent;
      await sync(new Client({ cookiesPath }), patterns);
    } catch (err) {
      process.stderr.write(err.toString());
    }
  })
  .on("--help", () => {
    process.stdout.write(`
  Examples:

    medic sync articles/
    medic sync articles/example.md
    medic sync $(git diff --name-only)
`);
  });

// program
//   .command("delete <patterns...>")
//   .description("deletes posts")
//   .action((patterns, options) => {
//     console.log("delete:", patterns, options);
//   })
//   .on("--help", () => {
//     process.stdout.write(`
//   Examples:
//
//     medic delete articles/example.md
// `);
//   });

program.parse(process.argv);
