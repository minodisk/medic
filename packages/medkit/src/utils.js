// @flow

const fs = require("fs");

exports.wait = (msec: number): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, msec);
  });

exports.stat = (path: string): Promise<any> =>
  new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err != null) {
        return reject(err);
      }
      resolve(stats);
    });
  });

exports.readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, text) => {
      if (err != null) {
        return reject(err);
      }
      resolve(text.toString());
    });
  });

exports.writeFile = (path: string, data: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, err => {
      if (err != null) {
        return reject(err);
      }
      resolve();
    });
  });

exports.removeFile = (path: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.unlink(path, err => {
      if (err != null) {
        return reject(err);
      }
      resolve();
    });
  });
