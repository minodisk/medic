if (window.pasteExtensionId == null) {
  const script = document.createElement("script");
  script.textContent = `window.pasteExtensionId = ${JSON.stringify(
    chrome.runtime.id,
  )}`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

chrome.extension.onMessage.addListener((req, sender, cb) => {
  cb(document.execCommand(req));
});
