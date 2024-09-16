function openPopup() {
	chrome.windows.create({
		url: "popup.html",
		type: "popup",
		width: 400,
		height: 500,
	});
}

function startAutoPopup() {
	chrome.storage.sync.get(["popupInterval"], function (result) {
		const interval = (result.popupInterval || 15) * 60 * 1000; // Default to 15 minutes
		setInterval(openPopup, interval);
	});
}

chrome.runtime.onInstalled.addListener(function () {
	startAutoPopup();
});
