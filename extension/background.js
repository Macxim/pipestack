const API_BASE = "http://localhost:3000";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SEND_LEAD") {
    sendLeadToApp(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (message.type === "GET_STAGES") {
    fetchStages()
      .then((stages) => sendResponse({ success: true, stages }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "SEND_LEADS_BATCH") {
    sendLeadsBatch(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function sendLeadToApp(lead) {
  const res = await fetch(`${API_BASE}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send lead");
  }

  return res.json();
}

async function fetchStages() {
  const res = await fetch(`${API_BASE}/api/stages`);
  if (!res.ok) throw new Error("Failed to fetch stages");
  return res.json();
}

async function sendLeadsBatch(payload) {
  const res = await fetch(`${API_BASE}/api/leads/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send leads");
  }

  return res.json();
}