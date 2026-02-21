let currentUrl = window.location.href;
let buttonInjected = false;
let importPanelOpen = false;

// ─── Boot ─────────────────────────────────────────────────────────

const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    buttonInjected = false;
    removeAllUI();
    setTimeout(tryInjectUI, 2000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(tryInjectUI, 2000);

// ─── Safe messaging ───────────────────────────────────────────────

function safeSendMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        showToast("✗ Extension error. Please refresh the page.", true);
        return;
      }
      callback(response);
    });
  } catch (e) {
    showToast("✗ Extension was reloaded. Please refresh the page.", true);
  }
}

// ─── Page type detection ──────────────────────────────────────────

function getPageType() {
  const url = window.location.href;
  if (url.includes("instagram.com")) return "instagram_profile";
  if (
    url.match(/facebook\.com\/[a-zA-Z0-9.]+\/?$/) ||
    url.match(/facebook\.com\/profile\.php/)
  ) return "facebook_profile";
  return "facebook_feed";
}

// ─── Inject UI ────────────────────────────────────────────────────

function tryInjectUI() {
  if (buttonInjected) return;
  const type = getPageType();

  if (type === "facebook_profile" || type === "instagram_profile") {
    injectProfileButton();
  } else {
    injectIntoAllBars();
    setInterval(injectIntoAllBars, 2500);
  }

  buttonInjected = true;
}

function removeAllUI() {
  document.querySelectorAll(".pipeline-btn").forEach((el) => el.remove());
  document.getElementById("pipeline-toast")?.remove();
  document.getElementById("pipeline-panel")?.remove();
  importPanelOpen = false;
}

// ─── Profile page: single import button ──────────────────────────

function injectProfileButton() {
  const name = getNameFromTitle();
  if (!name) return;

  const btn = makeFloatingButton("＋ Add to Pipeline", "#2563eb");
  btn.addEventListener("click", () => {
    safeSendMessage(
      {
        type: "SEND_LEAD",
        payload: {
          name,
          profileUrl: window.location.href,
          platform: window.location.href.includes("instagram") ? "instagram" : "facebook",
        },
      },
      (res) => {
        if (res?.success) showToast("✓ Lead added to pipeline!");
        else showToast("✗ Failed. Is your app running?", true);
      }
    );
  });

  document.body.appendChild(btn);
}

function makeFloatingButton(label, color) {
  const wrap = document.createElement("div");
  wrap.className = "pipeline-btn";
  wrap.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 99999;
  `;
  wrap.innerHTML = `
    <div style="
      background:${color}; color:white; padding:12px 20px;
      border-radius:50px; font-family:-apple-system,sans-serif;
      font-size:14px; font-weight:600; cursor:pointer;
      box-shadow:0 4px 24px rgba(0,0,0,0.25);
      display:flex; align-items:center; gap:8px; user-select:none;
    ">${label}</div>
  `;
  return wrap;
}

// ─── Feed: inject Import button into each post action bar ─────────

function injectIntoAllBars() {
  findActionBars().forEach((bar) => {
    if (bar.querySelector(".pipeline-btn")) return;

    const btn = document.createElement("div");
    btn.className = "pipeline-btn";
    btn.style.cssText = `
      display:inline-flex; align-items:center; gap:5px;
      padding:6px 12px; border-radius:6px; cursor:pointer;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      font-size:13px; font-weight:600; color:#7c3aed;
      background:transparent; user-select:none; margin-left:4px;
      transition: background 0.15s;
    `;
    btn.innerHTML = `<span style="font-size:15px">⬇</span> Import`;
    btn.title = "Import commenters into your pipeline";
    btn.addEventListener("mouseover", () => (btn.style.background = "#f5f3ff"));
    btn.addEventListener("mouseout", () => (btn.style.background = "transparent"));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (importPanelOpen) return;
      const postRoot = getPostRoot(bar);
      openImportFlow(postRoot);
    });

    bar.appendChild(btn);
  });
}

function findActionBars() {
  // Strategy 1: explicit toolbar role
  const toolbars = Array.from(document.querySelectorAll("[role='toolbar']"));
  if (toolbars.length > 0) return toolbars;

  // Strategy 2: divs containing Like + Comment + Share
  return Array.from(document.querySelectorAll("div")).filter((div) => {
    if (div.children.length < 2 || div.children.length > 10) return false;
    const t = div.innerText ?? "";
    return t.includes("Like") && t.includes("Comment") && t.includes("Share");
  });
}

function getPostRoot(bar) {
  const selectors = ["[role='article']", "[data-pagelet]", "article"];
  for (const sel of selectors) {
    const el = bar.closest(sel);
    if (el) return el;
  }
  let el = bar.parentElement;
  for (let i = 0; i < 10; i++) {
    if (!el) break;
    if (el.offsetHeight > 200) return el;
    el = el.parentElement;
  }
  return document.body;
}

// ─── Import flow ──────────────────────────────────────────────────

function openImportFlow(postRoot) {
  expandComments(postRoot);
  setTimeout(() => {

    // DEBUG: log everything to console
    const dialog = document.querySelector("[role='dialog'][aria-modal='true']");
    console.log("[Pipeline] dialog found:", dialog);

    const allArticles = document.querySelectorAll("[role='article']");
    console.log("[Pipeline] total [role='article'] on page:", allArticles.length);

    const allLinks = document.querySelectorAll("a[href*='facebook.com']");
    console.log("[Pipeline] total facebook links on page:", allLinks.length);

    // Log every article's first FB link
    allArticles.forEach((a, i) => {
      const firstLink = a.querySelector("a[href*='facebook.com']");
      console.log(`[Pipeline] article[${i}] first link:`, firstLink?.href, "|", firstLink?.textContent?.trim());
    });

    const commenters = scrapeCommenters(postRoot);
    console.log("[Pipeline] commenters found:", commenters);

    if (commenters.length === 0) {
      showToast("No commenters found. Try scrolling to load comments first.", true);
      return;
    }
    showPanel(commenters);
  }, 1500);
}

function expandComments(root) {
  const buttons = Array.from(root.querySelectorAll("[role='button'], span, div"));
  buttons.forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (
      text.match(/^View \d+ more comments?/) ||
      text.match(/^View \d+ repl/) ||
      text === "View more comments"
    ) {
      try { el.click(); } catch (_) { }
    }
  });
}

// ─── Core scraper ─────────────────────────────────────────────────

function scrapeCommenters(postRoot) {
  // Try multiple dialog/modal selectors — Facebook uses different ones
  const dialogSelectors = [
    "[role='dialog'][aria-modal='true']",
    "[role='dialog']",
    "div[aria-label$='Post']",
    "div[aria-label$=\"'s Post\"]",
  ];

  for (const sel of dialogSelectors) {
    const dialog = document.querySelector(sel);
    if (dialog) {
      const nodes = findCommentNodes(dialog);
      if (nodes.length > 0) {
        console.log("[Pipeline] using dialog:", sel, "nodes:", nodes.length);
        return extractFromCommentNodes(nodes);
      }
    }
  }

  // Fallback to postRoot then document
  const nodes = findCommentNodes(postRoot);
  if (nodes.length > 0) return extractFromCommentNodes(nodes);

  return extractFromCommentNodes(findCommentNodes(document.body));
}

function findCommentNodes(root) {
  const all = Array.from(root.querySelectorAll("[role='article']"));

  return all.filter((node) => {
    if (node === root) return false;

    // Must contain at least one <a> tag with text (any link is fine)
    const hasAnyLink = !!node.querySelector("a[href]");
    if (!hasAnyLink) return false;

    // Skip containers that wrap many articles (thread wrappers, post root)
    const nested = node.querySelectorAll("[role='article']").length;
    if (nested > 3) return false;

    return true;
  });
}

function extractFromCommentNodes(nodes) {
  const commenters = new Map();

  nodes.forEach((node) => {
    const result = findAuthorNameAndUrl(node);
    if (!result) return;

    const { name, profileUrl } = result;
    if (commenters.has(name)) return;

    const avatar =
      node.querySelector("img[src*='fbcdn']")?.src ??
      node.querySelector("img[src*='scontent']")?.src ??
      null;

    commenters.set(name, {
      name,
      profileUrl,
      platform: "facebook",
      avatarUrl: avatar,
    });
  });

  return [...commenters.values()];
}

function findAuthorNameAndUrl(commentNode) {
  const links = Array.from(commentNode.querySelectorAll("a[href]"));

  for (const link of links) {
    const href = link.href ?? "";
    const text = link.textContent?.trim() ?? "";

    // Must have text that looks like a name
    if (!text || text.length < 2 || text.length > 80) continue;

    // Skip timestamps: "6m", "1h", "20h", "1d" etc.
    if (text.match(/^\d+[smhdwy]$/i)) continue;
    if (text.match(/^\d+\s*(min|hour|day|week|month|year)/i)) continue;

    // Skip action words
    if (/^(Like|Comment|Reply|Share|See more|Follow|Add friend|Author|Top fan)$/i.test(text)) continue;

    // Skip if text looks like a URL or contains dots/slashes
    if (text.includes(".") || text.includes("/") || text.includes("@")) continue;

    // Skip all caps long strings (page names, labels)
    if (text === text.toUpperCase() && text.length > 6) continue;

    // Skip numbers only
    if (text.match(/^\d+$/)) continue;

    // Must be a facebook link
    if (!href.includes("facebook.com")) continue;

    // Skip external redirects
    if (href.includes("l.php")) continue;

    // This is our author — use the link href as profileUrl
    // It may be a comment permalink, that's OK for now
    return { name: text, profileUrl: href };
  }

  return null;
}

function extractFromCommentNodes(nodes) {
  const commenters = new Map();

  nodes.forEach((node) => {
    const authorLink = findAuthorLink(node);
    if (!authorLink) return;

    const name = authorLink.textContent?.trim();
    if (!name || name.length < 2 || name.length > 80) return;

    // Try to extract a clean profile URL from the href
    // Facebook comment permalinks look like: /posts/xxx?comment_id=yyy
    // We want just the person's profile if possible
    let profileUrl = authorLink.href;

    // If href has a profile.php?id= somewhere, extract that
    const profilePhpMatch = profileUrl.match(/(https:\/\/www\.facebook\.com\/profile\.php\?id=\d+)/);
    if (profilePhpMatch) {
      profileUrl = profilePhpMatch[1];
    }

    // Use name as dedup key since we may not have unique profile URLs
    if (commenters.has(name)) return;

    const avatar =
      node.querySelector("img[src*='fbcdn']")?.src ??
      node.querySelector("img[src*='scontent']")?.src ??
      null;

    commenters.set(name, {
      name,
      profileUrl,
      platform: "facebook",
      avatarUrl: avatar,
    });
  });

  return [...commenters.values()];
}

function findAuthorLink(commentNode) {
  const links = Array.from(commentNode.querySelectorAll("a[href]"));

  for (const link of links) {
    const href = link.href ?? "";
    const text = link.textContent?.trim() ?? "";

    // Must have text
    if (!text || text.length < 2 || text.length > 80) continue;

    // Skip timestamps like "6m", "1h", "1d"
    if (text.match(/^\d+[smhd]$/)) continue;

    // Skip action words
    if (/^(Like|Comment|Reply|Share|See more|View|Follow|Add friend)$/i.test(text)) continue;

    // Skip if text looks like a URL or contains dots/slashes
    if (text.includes(".") || text.includes("/") || text.includes("@")) continue;

    // Skip all-caps long strings (page names)
    if (text === text.toUpperCase() && text.length > 8) continue;

    // Must link to facebook
    if (!href.includes("facebook.com")) continue;

    // Skip external redirects
    if (href.includes("l.php")) continue;

    // This is our best candidate for an author name
    return link;
  }

  return null;
}

function isProfileUrl(href) {
  if (!href || !href.includes("facebook.com")) return false;
  if (href.includes("l.php")) return false;

  const skip = [
    "/groups/", "/pages/", "/events/", "/marketplace/",
    "/watch/", "/stories/", "/hashtag/", "/gaming/",
    "/notifications/", "/settings/", "/help/",
  ];
  if (skip.some((s) => href.includes(s))) return false;

  return (
    !!href.match(/facebook\.com\/[a-zA-Z0-9.]{3,}\/?(\?.*)?$/) ||
    !!href.match(/facebook\.com\/profile\.php\?id=\d+/)
  );
}

function getNameFromTitle() {
  const match = document.title.match(/^(.+?)\s*[|\-–]\s*(Facebook|Instagram)/);
  if (match?.[1]) return match[1].trim();
  const og = document.querySelector('meta[property="og:title"]');
  return og?.getAttribute("content")?.split("|")[0].trim() ?? null;
}

// ─── Import panel ─────────────────────────────────────────────────

function showPanel(commenters) {
  importPanelOpen = true;

  const panel = document.createElement("div");
  panel.id = "pipeline-panel";
  panel.style.cssText = `
    position:fixed; top:0; right:0; width:380px; height:100vh;
    background:white; z-index:2147483647;
    box-shadow:-4px 0 32px rgba(0,0,0,0.18);
    display:flex; flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  panel.innerHTML = `
    <div style="padding:20px; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <div>
        <div style="font-size:16px; font-weight:700; color:#111827;">Import Commenters</div>
        <div style="font-size:12px; color:#6b7280; margin-top:2px;">${commenters.length} people found</div>
      </div>
      <button id="pp-close" style="
        width:32px; height:32px; border:none; background:#f3f4f6;
        border-radius:8px; cursor:pointer; font-size:16px; color:#6b7280;
        display:flex; align-items:center; justify-content:center;
      ">✕</button>
    </div>

    <div style="padding:12px 20px; border-bottom:1px solid #f3f4f6; display:flex; align-items:center; gap:8px; flex-shrink:0;">
      <input type="checkbox" id="pp-select-all" checked style="width:16px; height:16px; cursor:pointer;" />
      <label for="pp-select-all" style="font-size:13px; font-weight:500; color:#374151; cursor:pointer;">Select all</label>
      <span id="pp-count" style="font-size:12px; color:#6b7280; margin-left:auto;">${commenters.length} selected</span>
    </div>

    <div id="pp-list" style="flex:1; overflow-y:auto; padding:12px 20px; display:flex; flex-direction:column; gap:8px;">
      ${commenters.map((c, i) => `
        <label style="
          display:flex; align-items:center; gap:12px;
          padding:10px 12px; border-radius:8px; border:1px solid #e5e7eb;
          cursor:pointer; background:white;
        ">
          <input type="checkbox" class="pp-cb" data-index="${i}" checked
            style="width:15px; height:15px; cursor:pointer; flex-shrink:0;" />
          ${c.avatarUrl
      ? `<img src="${c.avatarUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
      : `<div style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:#9ca3af;">${c.name.charAt(0).toUpperCase()}</div>`
    }
          <div style="min-width:0; flex:1;">
            <div style="font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
            <div style="font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.profileUrl.replace("https://www.facebook.com/", "fb.com/")}</div>
          </div>
        </label>
      `).join("")}
    </div>

    <div style="padding:16px 20px; border-top:1px solid #f3f4f6; flex-shrink:0;">
      <button id="pp-import" style="
        width:100%; padding:12px; background:#2563eb; color:white;
        border:none; border-radius:8px; font-size:14px; font-weight:600;
        cursor:pointer;
      ">Import Selected Leads</button>
      <div id="pp-status" style="font-size:12px;text-align:center;margin-top:8px;color:#6b7280;min-height:16px;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("pp-close").addEventListener("click", () => {
    panel.remove();
    importPanelOpen = false;
  });

  const selectAll = document.getElementById("pp-select-all");
  const countEl = document.getElementById("pp-count");

  function cbs() { return Array.from(document.querySelectorAll(".pp-cb")); }
  function updateCount() {
    const n = cbs().filter((cb) => cb.checked).length;
    countEl.textContent = `${n} selected`;
  }

  selectAll.addEventListener("change", () => {
    cbs().forEach((cb) => (cb.checked = selectAll.checked));
    updateCount();
  });

  panel.addEventListener("change", (e) => {
    if (!e.target.classList.contains("pp-cb")) return;
    const all = cbs();
    selectAll.checked = all.every((cb) => cb.checked);
    selectAll.indeterminate = all.some((cb) => cb.checked) && !all.every((cb) => cb.checked);
    updateCount();
  });

  document.getElementById("pp-import").addEventListener("click", () => {
    const selected = cbs()
      .filter((cb) => cb.checked)
      .map((cb) => commenters[parseInt(cb.dataset.index)]);

    if (selected.length === 0) {
      document.getElementById("pp-status").textContent = "Select at least one lead.";
      return;
    }

    const importBtn = document.getElementById("pp-import");
    const statusEl = document.getElementById("pp-status");
    importBtn.disabled = true;
    importBtn.textContent = `Importing ${selected.length} leads...`;

    safeSendMessage(
      { type: "SEND_LEADS_BATCH", payload: { leads: selected } },
      (response) => {
        if (response?.success) {
          importBtn.style.background = "#10b981";
          importBtn.textContent = `✓ ${response.result.count} leads imported!`;
          statusEl.textContent = "Added to your pipeline.";
          setTimeout(() => {
            panel.remove();
            importPanelOpen = false;
          }, 2000);
        } else {
          importBtn.disabled = false;
          importBtn.textContent = "Import Selected Leads";
          statusEl.textContent = `✗ ${response?.error ?? "Failed. Is your app running?"}`;
          statusEl.style.color = "#ef4444";
        }
      }
    );
  });
}

// ─── Toast ────────────────────────────────────────────────────────

function showToast(message, isError = false) {
  document.getElementById("pipeline-toast")?.remove();
  const t = document.createElement("div");
  t.id = "pipeline-toast";
  t.textContent = message;
  t.style.cssText = `
    position:fixed; bottom:80px; right:24px; z-index:2147483647;
    background:${isError ? "#ef4444" : "#10b981"};
    color:white; padding:10px 18px; border-radius:8px;
    font-family:-apple-system,sans-serif; font-size:13px; font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}