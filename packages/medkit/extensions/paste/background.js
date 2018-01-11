chrome.runtime.onMessageExternal.addListener((req, sender, cb) => {
  chrome.tabs.sendMessage(sender.tab.id, req, null, cb);
  return true;
});
