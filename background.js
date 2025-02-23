const browserAPI = chrome || browser;
browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Active Tab:", tabs[0]);
});


browserAPI.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed!");
});
