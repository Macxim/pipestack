document.addEventListener("DOMContentLoaded", () => {
  const body = document.getElementById("body");

  // Check if API key is already saved
  chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (response) => {
    if (response?.key) {
      renderConnected(response.key);
    } else {
      renderSetup();
    }
  });

  function renderConnected(key) {
    body.innerHTML = `
      <div class="connected">
        ✓ Connected to your pipeline
      </div>
      <div class="label">Your API Key</div>
      <input type="text" value="${key}" readonly id="key-display" />
      <button class="btn secondary" id="change-btn">Change API Key</button>
      <hr class="divider" />
      <div class="status" id="page-status">Navigate to a Facebook or Instagram profile to import leads.</div>
    `;

    document.getElementById("change-btn").addEventListener("click", renderSetup);

    // Also check current tab
    checkCurrentTab();
  }

  function renderSetup() {
    body.innerHTML = `
      <p style="font-size:12px; color:#6b7280; margin-bottom:12px; line-height:1.5;">
        Paste your API key from the pipeline app to connect your extension.
      </p>
      <div class="label">API Key</div>
      <input type="text" id="api-key-input" placeholder="pk_..." />
      <button class="btn" id="save-btn">Save & Connect</button>
      <div class="status" id="save-status"></div>
    `;

    document.getElementById("save-btn").addEventListener("click", () => {
      const key = document.getElementById("api-key-input").value.trim();
      if (!key || !key.startsWith("pk_")) {
        document.getElementById("save-status").textContent = "Invalid key. It should start with pk_";
        document.getElementById("save-status").className = "status error";
        return;
      }

      chrome.runtime.sendMessage({ type: "SAVE_API_KEY", key }, (res) => {
        if (res?.success) {
          renderConnected(key);
        }
      });
    });
  }

  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      const url = tab?.url ?? "";
      const statusEl = document.getElementById("page-status");
      if (!statusEl) return;

      if (url.includes("facebook.com") || url.includes("instagram.com")) {
        statusEl.textContent = "✓ Active on this page";
        statusEl.className = "status success";
      }
    });
  }
});