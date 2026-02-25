const API_BASE = "http://localhost:3000";

// On install, check if we have a stored API key
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("apiKey", (result) => {
    if (!result.apiKey) {
      console.log("[Pipeline] No API key set. Open the extension popup to add one.");
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SEND_LEAD") {
    sendLeadToApp(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "SEND_LEADS_BATCH") {
    sendLeadsBatch(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "SAVE_API_KEY") {
    chrome.storage.local.set({ apiKey: message.key }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "GET_API_KEY") {
    chrome.storage.local.get("apiKey", (result) => {
      sendResponse({ key: result.apiKey ?? null });
    });
    return true;
  }
});

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("apiKey", (result) => {
      resolve(result.apiKey ?? null);
    });
  });
}

async function sendLeadToApp(lead) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key set. Click the extension icon to add your key.");

  const res = await fetch(`${API_BASE}/api/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send lead");
  }

  return res.json();
}

async function sendLeadsBatch(payload) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key set. Click the extension icon to add your key.");

  const res = await fetch(`${API_BASE}/api/leads/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send leads");
  }

  return res.json();
}