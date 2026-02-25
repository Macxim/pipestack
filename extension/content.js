let currentUrl = window.location.href;
let buttonInjected = false;
let importPanelOpen = false;

// ─── Design System ────────────────────────────────────────────────
const DESIGN = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  accent: "#7c3aed",
  accentHover: "#6d28d9",
  glass: "rgba(255, 255, 255, 1)",
  border: "rgba(255, 255, 255, 0.2)",
  shadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  radius: "12px",
  pill: "50px",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};

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
        showToast("Extension error. Please refresh the page.", true);
        return;
      }
      callback(response);
    });
  } catch (e) {
    showToast("Extension was reloaded. Please refresh the page.", true);
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

  const btn = makeFloatingButton("＋ Add to Pipestack", DESIGN.primary);
  btn.addEventListener("click", () => {
    safeSendMessage(
      {
        type: "SEND_LEAD",
        payload: {
          name,
          profileUrl: cleanProfileUrl(window.location.href),
          platform: window.location.href.includes("instagram") ? "instagram" : "facebook",
        },
      },
      (res) => {
        if (res?.success) showToast("✓ Lead added to Pipestack!");
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
    transition: ${DESIGN.transition};
  `;
  wrap.innerHTML = `
    <div style="
      background:${color}; color:white; padding:12px 24px;
      border-radius:${DESIGN.pill}; font-family:${DESIGN.font};
      font-size:14px; font-weight:700; cursor:pointer;
      display:flex; align-items:center; gap:10px; user-select:none;
      border: 1px solid rgba(255,255,255,0.1);
      transform: translateY(0);
      transition: ${DESIGN.transition};
    "
      <svg style="width:18px; height:18px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
      </svg>
      ${label}
    </div>
  `;
  return wrap;
}

// ─── Feed: inject Import button into each post action bar ─────────

function injectIntoAllBars() {
  findActionBars().forEach((bar) => {
    // Target the broader post footer container for full-width injection
    const container = bar.closest('.x1n2onr6') || bar.parentElement;
    if (!container || container.querySelector(".pipestack-integrated-bar")) return;

    const integratedBar = document.createElement("div");
    integratedBar.className = "pipeline-btn pipestack-integrated-bar";
    integratedBar.style.cssText = `
      width: 100%;
      margin: 12px 0px 12px;
      padding: 10px 16px;
      background: linear-gradient(135deg, ${DESIGN.primary} 0%, ${DESIGN.accent} 100%);
      border-radius: ${DESIGN.radius};
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      font-family: ${DESIGN.font};
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition: opacity 0.2s ease;
    `;

    integratedBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px">
        <div style="background:rgba(255,255,255,0.25); border-radius:8px; padding:5px; display:flex;">
          <svg style="width:18px; height:18px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <span>Import commenters into Pipestack</span>
      </div>
      <svg style="width:16px; height:16px; opacity:0.8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
      </svg>
    `;

    integratedBar.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (importPanelOpen) return;
      const postRoot = getPostRoot(bar);
      openImportFlow(postRoot);
    });

    integratedBar.addEventListener("mouseover", () => (integratedBar.style.opacity = "0.9"));
    integratedBar.addEventListener("mouseout", () => (integratedBar.style.opacity = "1"));

    // Prepend to container to ensure it sits above the buttons/reactions
    container.insertBefore(integratedBar, container.firstChild);
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

function openImportFlow(postRoot) {
  // First, try to find and click the comments button to open the post modal
  const opened = tryOpenPostComments(postRoot);

  if (opened) {
    // Wait for the modal to open and comments to fully render
    waitForModalAndScrape();
  } else {
    // Already in a modal or single post page — scrape directly
    expandComments(postRoot);
    setTimeout(() => {
      const commenters = scrapeCommenters(postRoot);
      if (commenters.length === 0) {
        showToast("No commenters found. Try scrolling to load comments first.", true);
        return;
      }
      showPanel(commenters);
    }, 1500);
  }
}

function tryOpenPostComments(postRoot) {
  // Look for the "X comments" button/link near this post
  const candidates = Array.from(postRoot.querySelectorAll("[role='button'], a, span"));

  const commentsBtn = candidates.find((el) => {
    const text = el.textContent?.trim() ?? "";
    return (
      text.match(/^\d+\s+comments?$/i) ||
      text.match(/^\d+K?\s+comments?$/i) ||
      el.getAttribute("aria-label")?.match(/\d+\s+comments?/i)
    );
  });

  if (commentsBtn) {
    commentsBtn.click();
    return true;
  }

  return false;
}

function waitForModalAndScrape() {
  const maxWait = 8000;
  const interval = 500;
  let elapsed = 0;

  showToast("Opening post & loading comments...", false);

  const timer = setInterval(() => {
    elapsed += interval;

    // Check if a dialog/modal has opened
    const dialog = document.querySelector("[role='dialog']");

    if (dialog) {
      clearInterval(timer);
      document.getElementById("pipeline-toast")?.remove();

      // Expand "view more comments" links first
      expandComments(dialog);

      // Auto-scroll inside the modal to lazy-load more comments
      autoScrollModal(dialog, () => {
        const nodes = findCommentNodes(dialog);
        const commenters = extractFromCommentNodes(nodes);

        if (commenters.length === 0) {
          showToast("No commenters found. Try scrolling inside the post first.", true);
          return;
        }

        showPanel(commenters, dialog);
      });

      return;
    }

    if (elapsed >= maxWait) {
      clearInterval(timer);
      document.getElementById("pipeline-toast")?.remove();
      showToast("Couldn't open post. Try clicking the post manually first.", true);
    }
  }, interval);
}

function autoScrollModal(dialog, callback) {
  // Find the scrollable container inside the modal
  const scrollable =
    dialog.querySelector("[class*='overflow']") ||
    dialog.querySelector("[style*='overflow']") ||
    Array.from(dialog.querySelectorAll("div")).find(
      (el) => el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 200
    ) ||
    dialog;

  const scrollStep = 600;
  const scrollInterval = 400;
  const maxScrolls = 15; // ~6 seconds of scrolling max
  let scrollCount = 0;
  let lastHeight = scrollable.scrollHeight;
  let stableCount = 0;

  showToast("Scrolling to load comments...", false);

  const scroller = setInterval(() => {
    scrollable.scrollTop += scrollStep;
    scrollCount++;

    // Click any "view more" buttons that appear
    expandComments(dialog);

    // Check if we've reached the bottom (scrollHeight stopped growing)
    if (scrollable.scrollHeight === lastHeight) {
      stableCount++;
    } else {
      stableCount = 0;
      lastHeight = scrollable.scrollHeight;
    }

    // Stop when content stopped growing (3 stable checks) or max reached
    if (stableCount >= 3 || scrollCount >= maxScrolls) {
      clearInterval(scroller);
      document.getElementById("pipeline-toast")?.remove();

      // One final expand pass after scrolling
      expandComments(dialog);

      // Wait a bit for the last batch of comments to render
      setTimeout(callback, 1000);
    }
  }, scrollInterval);
}

function expandComments(root) {
  const buttons = Array.from(root.querySelectorAll("[role='button'], span, div"));
  buttons.forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (
      text.match(/^View \d+ more comments?/) ||
      text.match(/^View \d+ repl/) ||
      text === "View more comments" ||
      text.match(/^View \d+ previous comments?/)
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

  // The FIRST article is always the post itself — skip it
  const withoutPostRoot = all.slice(1);

  return withoutPostRoot.filter((node) => {
    // Must contain at least one link
    if (!node.querySelector("a[href]")) return false;

    // Skip containers wrapping many nested articles (thread wrappers)
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

    // Avatar strategy:
    // 1. The hidden avatar <a aria-hidden="true"> always contains the profile pic
    //    either as a regular <img> or as an SVG <image xlink:href>
    // 2. Fall back to any fbcdn img/image elsewhere in the node

    let avatar = null;

    // Look inside the hidden avatar anchor first — most reliable
    const avatarAnchor = node.querySelector("a[aria-hidden='true']");
    if (avatarAnchor) {
      avatar =
        avatarAnchor.querySelector("image")?.getAttribute("xlink:href") ??
        avatarAnchor.querySelector("img[src*='fbcdn']")?.src ??
        avatarAnchor.querySelector("img[src*='scontent']")?.src ??
        null;
    }

    // Fallback: any fbcdn image anywhere in the comment node
    if (!avatar) {
      avatar =
        node.querySelector("img[src*='fbcdn']")?.src ??
        node.querySelector("img[src*='scontent']")?.src ??
        node.querySelector("image[*|href*='fbcdn']")?.getAttribute("xlink:href") ??
        node.querySelector("image")?.getAttribute("xlink:href") ??
        null;
    }

    commenters.set(name, {
      name,
      profileUrl: cleanProfileUrl(profileUrl),
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

    if (!text || text.length < 2 || text.length > 80) continue;
    if (text.match(/^\d+[smhdwy]$/i)) continue;
    if (text.match(/^\d+\s*(min|hour|day|week|month|year)/i)) continue;
    if (/^(Like|Comment|Reply|Share|See more|Follow|Add friend|Author|Top fan|View)$/i.test(text)) continue;

    // Looser name check — initials/dots/slashes are possible in names or titles
    if (text.includes("@")) continue; // Still skip emails
    if (text === text.toUpperCase() && text.length > 12) continue;
    if (text.match(/^\d+$/)) continue;

    if (isProfileUrl(href)) {
      return { name: text, profileUrl: href };
    }
  }
  return null;
}

function isProfileUrl(href) {
  if (!href || !href.includes("facebook.com")) return false;
  if (href.includes("l.php")) return false;

  const badPaths = [
    "/pages/", "/events/", "/marketplace/",
    "/watch/", "/stories/", "/hashtag/", "/gaming/",
    "/notifications/", "/settings/", "/help/", "/ads/",
    "/permalink/", "/photo", "/videos/"
  ];

  try {
    const url = new URL(href);
    const path = url.pathname;

    // Direct check for common profile patterns
    if (url.searchParams.has("id")) return true;
    if (path.includes("/people/")) return true;
    if (path.includes("/user/")) return true;

    // Filter out obvious non-profile paths
    if (badPaths.some(p => path.includes(p))) return false;

    // Ignore posts/groups unless they have the 'user' subpath checked above
    if (path.includes("/groups/") || path.includes("/posts/")) {
      if (path.includes("/user/")) return true;
      return false;
    }

    // Vanity URL check: should be a simple path /username
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1 && segments[0].length >= 2) return true;

    return false;
  } catch (e) {
    return false;
  }
}

function cleanProfileUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);

    // 1. Handle Group Membership URLs: /groups/GROUP_ID/user/USER_ID/
    if (u.pathname.includes("/groups/") && u.pathname.includes("/user/")) {
      const match = u.pathname.match(/\/user\/(\d+)/);
      if (match) {
        return `https://www.facebook.com/profile.php?id=${match[1]}`;
      }
    }

    // 2. Handle numeric IDs: facebook.com/profile.php?id=...
    if (u.searchParams.has("id")) {
      return `https://www.facebook.com/profile.php?id=${u.searchParams.get("id")}`;
    }

    // 3. Handle vanity URLs and people/Name/ID
    // Also remove group context if URL is like /groups/.../posts/... but links to a user (unlikely but safe)
    let path = u.pathname.replace(/\/$/, "");

    // If it's a vanity URL, it should just be /username
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1) {
      return `https://www.facebook.com/${segments[0]}`;
    }

    // For people/Name/ID or other complex paths, take only the first two segments if it's "people/name"
    if (segments[0] === "people" && segments.length >= 2) {
      return `https://www.facebook.com/people/${segments[1]}/${segments[2] || ""}`.replace(/\/$/, "");
    }

    return `${u.protocol}//${u.host}${path}`;
  } catch (e) {
    return url;
  }
}

function getNameFromTitle() {
  const match = document.title.match(/^(.+?)\s*[|\-–]\s*(Facebook|Instagram)/);
  if (match?.[1]) return match[1].trim();
  const og = document.querySelector('meta[property="og:title"]');
  return og?.getAttribute("content")?.split("|")[0].trim() ?? null;
}

// ─── Import panel ─────────────────────────────────────────────────

function showPanel(commenters, scrapeRoot = null) {
  importPanelOpen = true;

  const panel = document.createElement("div");
  panel.id = "pipeline-panel";
  panel.style.cssText = `
    position:fixed; top:12px; right:12px; width:400px; height:calc(100vh - 24px);
    background:${DESIGN.glass}; z-index:2147483647;
    border-radius: 20px;
    border: 1px solid ${DESIGN.border};
    display:flex; flex-direction:column;
    font-family:${DESIGN.font};
    overflow: hidden;
    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .pp-item:hover { background: rgba(0,0,0,0.03); }
    .pp-btn-import { background: ${DESIGN.primary}; transition: ${DESIGN.transition}; }
    .pp-btn-import:hover { background: ${DESIGN.primaryHover}; }
    .pp-btn-import:active { transform: translateY(0); }
    .pp-list::-webkit-scrollbar { width: 6px; }
    .pp-list::-webkit-scrollbar-track { background: transparent; }
    .pp-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
  `;
  document.head.appendChild(styleSheet);

  panel.innerHTML = `
    <div style="padding:24px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <div>
        <div style="font-size:20px; font-weight:800; color:#1e293b; letter-spacing:-0.5px;">Import Leads</div>
        <div id="pp-subtitle" style="font-size:13px; color:#64748b; margin-top:4px; font-weight:500;">${commenters.length} people identified</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button id="pp-refresh" style="
          width:36px; height:36px; border:none; background:rgba(0,0,0,0.05);
          border-radius:12px; cursor:pointer; font-size:16px; color:#64748b;
          display:flex; align-items:center; justify-content:center;
          transition: ${DESIGN.transition};
        " onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'" title="Re-scan for more commenters">↻</button>
        <button id="pp-close" style="
          width:36px; height:36px; border:none; background:rgba(0,0,0,0.05);
          border-radius:12px; cursor:pointer; font-size:18px; color:#64748b;
          display:flex; align-items:center; justify-content:center;
          transition: ${DESIGN.transition};
        " onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'">✕</button>
      </div>
    </div>

    <div style="padding:14px 24px; background:rgba(0,0,0,0.02); border-bottom:1px solid rgba(0,0,0,0.05); display:flex; align-items:center; gap:10px; flex-shrink:0;">
      <input type="checkbox" id="pp-select-all" checked style="width:18px; height:18px; cursor:pointer; accent-color:${DESIGN.primary}" />
      <label for="pp-select-all" style="font-size:14px; font-weight:600; color:#475569; cursor:pointer;">Select All</label>
      <span id="pp-count" style="font-size:12px; color:#94a3b8; margin-left:auto; font-weight:600; background:white; padding:2px 8px; border-radius:6px;">${commenters.length} active</span>
    </div>

    <div id="pp-list" class="pp-list" style="flex:1; overflow-y:auto; padding:16px 24px; display:flex; flex-direction:column; gap:10px;">
      ${commenters.map((c, i) => `
        <label class="pp-item" style="
          display:flex; align-items:center; gap:14px;
          padding:12px; border-radius:14px; border:1px solid rgba(0,0,0,0.05);
          cursor:pointer; background:rgba(255,255,255,0.5);
          transition: ${DESIGN.transition};
        ">
          <input type="checkbox" class="pp-cb" data-index="${i}" checked
            style="width:18px; height:18px; cursor:pointer; flex-shrink:0; accent-color:${DESIGN.primary}" />
          ${c.avatarUrl
      ? `<img src="${c.avatarUrl}" style="width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
      : `<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#64748b;">${c.name.charAt(0).toUpperCase()}</div>`
    }
          <div style="min-width:0; flex:1;">
            <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
            <div style="font-size:11px;color:#94a3b8;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${c.profileUrl.replace("https://www.facebook.com/", "fb.com/")}</div>
          </div>
        </label>
      `).join("")}
    </div>

    <div style="padding:24px; background:white; border-top:1px solid rgba(0,0,0,0.05); flex-shrink:0;">
      <button id="pp-import" class="pp-btn-import" style="
        width:100%; padding:16px; color:white;
        border:none; border-radius:14px; font-size:15px; font-weight:700;
        cursor:pointer;
      ">Import Selected Leads</button>
      <div id="pp-status" style="font-size:12px;text-align:center;margin-top:12px;color:#64748b;min-height:16px;font-weight:500;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("pp-close").addEventListener("click", () => {
    panel.remove();
    importPanelOpen = false;
  });

  // Refresh button — re-scrape and merge new commenters
  document.getElementById("pp-refresh").addEventListener("click", () => {
    const refreshBtn = document.getElementById("pp-refresh");
    refreshBtn.style.animation = "spin 0.6s ease";
    refreshBtn.disabled = true;

    // Add spin animation if not already present
    if (!document.getElementById("pp-spin-style")) {
      const s = document.createElement("style");
      s.id = "pp-spin-style";
      s.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      document.head.appendChild(s);
    }

    // Determine where to scrape from
    const root = scrapeRoot || document.querySelector("[role='dialog']") || document.body;

    // Expand any new "view more" buttons
    expandComments(root);

    setTimeout(() => {
      const newCommenters = scrapeCommenters(root);

      // Merge: add any new names not already in the list
      const existingNames = new Set(commenters.map((c) => c.name));
      const added = newCommenters.filter((c) => !existingNames.has(c.name));

      if (added.length > 0) {
        added.forEach((c) => commenters.push(c));

        // Rebuild the list
        const listEl = document.getElementById("pp-list");
        added.forEach((c, offset) => {
          const i = commenters.length - added.length + offset;
          const item = document.createElement("label");
          item.className = "pp-item";
          item.style.cssText = `
            display:flex; align-items:center; gap:14px;
            padding:12px; border-radius:14px; border:1px solid rgba(0,0,0,0.05);
            cursor:pointer; background:rgba(255,255,255,0.5);
            transition: ${DESIGN.transition};
          `;
          item.innerHTML = `
            <input type="checkbox" class="pp-cb" data-index="${i}" checked
              style="width:18px; height:18px; cursor:pointer; flex-shrink:0; accent-color:${DESIGN.primary}" />
            ${c.avatarUrl
              ? `<img src="${c.avatarUrl}" style="width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
              : `<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#64748b;">${c.name.charAt(0).toUpperCase()}</div>`
            }
            <div style="min-width:0; flex:1;">
              <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
              <div style="font-size:11px;color:#94a3b8;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${c.profileUrl.replace("https://www.facebook.com/", "fb.com/")}</div>
            </div>
          `;
          listEl.appendChild(item);
        });

        document.getElementById("pp-subtitle").textContent = `${commenters.length} people identified (+${added.length} new)`;
        updateCount();
        showToast(`Found ${added.length} new commenter${added.length > 1 ? "s" : ""}!`);
      } else {
        showToast("No new commenters found. Try scrolling through the comments first.");
      }

      refreshBtn.style.animation = "";
      refreshBtn.disabled = false;
    }, 1000);
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
  t.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="background:rgba(255,255,255,0.2); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px;">
        ${isError ? "✕" : "✓"}
      </div>
      ${message}
    </div>
  `;
  t.style.cssText = `
    position:fixed; bottom:32px; right:32px; z-index:2147483647;
    background:${isError ? "#ef4444" : "#10b981"};
    color:white; padding:12px 20px; border-radius:14px;
    font-family:${DESIGN.font}; font-size:14px; font-weight:600;
    border: 1px solid rgba(255,255,255,0.1);
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  if (!document.getElementById("pipeline-toast-style")) {
    const s = document.createElement("style");
    s.id = "pipeline-toast-style";
    s.textContent = `@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`;
    document.head.appendChild(s);
  }

  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    t.style.transition = DESIGN.transition;
    setTimeout(() => t.remove(), 300);
  }, 4000);
}