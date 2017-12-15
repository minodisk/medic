// @flow

const fs = require("fs");

const statusMap = {
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "426": "Upgrade Required",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
};

exports.statusText = (status: number): string => statusMap[status] || "Unknown";

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
