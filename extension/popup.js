document.addEventListener("DOMContentLoaded", () => {
  const body = document.getElementById("body");

  chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (keyResponse) => {
    chrome.runtime.sendMessage({ type: "GET_API_BASE" }, (baseResponse) => {
      if (keyResponse?.key) {
        renderConnected(keyResponse.key, baseResponse?.url ?? "https://pipestack.vercel.app");
      } else {
        renderSetup(baseResponse?.url ?? "https://pipestack.vercel.app");
      }
    });
  });

  function renderConnected(key, apiBase) {
    body.innerHTML = `
      <div class="connected">✓ Connected to your pipeline</div>

      <div class="label">Server URL</div>
      <div style="display:flex; gap:6px; margin-bottom:12px;">
        <input type="text" id="base-input" value="${apiBase}"
          style="flex:1; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:12px; font-family:monospace;" />
        <button id="save-base-btn" style="
          padding:8px 12px; background:#f3f4f6; border:none;
          border-radius:8px; font-size:12px; font-weight:600;
          cursor:pointer; color:#374151; white-space:nowrap;
        ">Save</button>
      </div>

      <div class="label">API Key</div>
      <input type="text" value="${key}" readonly id="key-display"
        style="margin-bottom:8px;" />
      <button class="btn secondary" id="change-btn">Change API Key</button>

      <hr class="divider" />
      <div class="status" id="page-status">
        Navigate to a Facebook or Instagram profile to import leads.
      </div>
    `;

    document.getElementById("save-base-btn").addEventListener("click", () => {
      const url = document.getElementById("base-input").value.trim().replace(/\/$/, "");
      if (!url.startsWith("http")) {
        alert("URL must start with http:// or https://");
        return;
      }
      chrome.runtime.sendMessage({ type: "SAVE_API_BASE", url }, () => {
        const btn = document.getElementById("save-base-btn");
        btn.textContent = "✓ Saved";
        setTimeout(() => { btn.textContent = "Save"; }, 1500);
      });
    });

    document.getElementById("change-btn").addEventListener("click", () => renderSetup(apiBase));
    checkCurrentTab();
  }

  function renderSetup(apiBase) {
    body.innerHTML = `
      <p style="font-size:12px; color:#6b7280; margin-bottom:12px; line-height:1.5;">
        Paste your API key from the pipeline app to connect your extension.
      </p>

      <div class="label">Server URL</div>
      <input type="text" id="base-input" value="${apiBase}"
        style="margin-bottom:12px; font-family:monospace;" />

      <div class="label">API Key</div>
      <input type="text" id="api-key-input" placeholder="pk_..." />
      <button class="btn" id="save-btn">Save & Connect</button>
      <div class="status" id="save-status"></div>
    `;

    document.getElementById("save-btn").addEventListener("click", () => {
      const key = document.getElementById("api-key-input").value.trim();
      const url = document.getElementById("base-input").value.trim().replace(/\/$/, "");

      if (!key || !key.startsWith("pk_")) {
        document.getElementById("save-status").textContent = "Invalid key — should start with pk_";
        document.getElementById("save-status").className = "status error";
        return;
      }
      if (!url.startsWith("http")) {
        document.getElementById("save-status").textContent = "Invalid URL";
        document.getElementById("save-status").className = "status error";
        return;
      }

      chrome.runtime.sendMessage({ type: "SAVE_API_BASE", url }, () => {
        chrome.runtime.sendMessage({ type: "SAVE_API_KEY", key }, (res) => {
          if (res?.success) renderConnected(key, url);
        });
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