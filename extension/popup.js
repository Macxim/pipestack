document.addEventListener("DOMContentLoaded", async () => {
  const content = document.getElementById("content");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";

  const isSupported =
    url.includes("facebook.com") || url.includes("instagram.com");

  if (!isSupported) {
    content.innerHTML = `
      <div class="status">
        Navigate to a Facebook or Instagram profile to import a lead.
      </div>
    `;
    return;
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const url = window.location.href;
      const isFacebook = url.includes("facebook.com");
      const nameEl = document.querySelector("h1") ?? document.querySelector("h2");
      return {
        name: nameEl?.textContent?.trim() ?? "Unknown",
        profileUrl: url,
        platform: isFacebook ? "facebook" : "instagram",
      };
    },
  });

  const lead = result?.result;

  if (!lead || lead.name === "Unknown") {
    content.innerHTML = `
      <div class="status error">
        Could not detect a profile on this page. Try navigating directly to a profile.
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="lead-info">
      <div class="lead-name">${lead.name}</div>
      <div class="lead-platform">${lead.platform} · ${lead.profileUrl.split("/")[3] ?? ""}</div>
    </div>
    <button class="btn" id="add-btn">+ Add to Pipestack</button>
    <div id="result" class="status" style="margin-top:10px"></div>
  `;

  document.getElementById("add-btn").addEventListener("click", async () => {
    const btn = document.getElementById("add-btn");
    const resultEl = document.getElementById("result");
    btn.disabled = true;
    btn.textContent = "Adding...";

    chrome.runtime.sendMessage(
      { type: "SEND_LEAD", payload: lead },
      (response) => {
        if (response?.success) {
          resultEl.textContent = "✓ Lead added!";
          resultEl.className = "status success";
          btn.textContent = "✓ Done";
        } else {
          resultEl.textContent = "✗ Failed. Is your app running on localhost:3000?";
          resultEl.className = "status error";
          btn.disabled = false;
          btn.textContent = "+ Add to Pipestack";
        }
      }
    );
  });
});