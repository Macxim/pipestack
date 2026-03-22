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

function injectStyles() {
  if (document.getElementById("pipestack-styles")) return;
  const s = document.createElement("style");
  s.id = "pipestack-styles";
  s.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
    @keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }
    .pp-item:hover { background: rgba(0,0,0,0.03); }
    .pp-btn-import { background: ${DESIGN.primary}; transition: ${DESIGN.transition}; }
    .pp-btn-import:hover { background: ${DESIGN.primaryHover}; }
    .pp-btn-import:active { transform: translateY(0); }
    .pp-list::-webkit-scrollbar { width: 6px; }
    .pp-list::-webkit-scrollbar-track { background: transparent; }
    .pp-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

    /* Custom checkboxes */
    .pp-checkbox { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; flex-shrink: 0; position: relative; transition: all 0.15s ease; }
    .pp-checkbox:hover { border-color: ${DESIGN.primary}; }
    .pp-checkbox:checked { background: ${DESIGN.primary}; border-color: ${DESIGN.primary}; }
    .pp-checkbox:checked::after { content: ''; position: absolute; left: 5px; top: 0px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .pp-checkbox:indeterminate { background: ${DESIGN.primary}; border-color: ${DESIGN.primary}; }
    .pp-checkbox:indeterminate::after { content: ''; position: absolute; left: 4px; top: 7px; width: 8px; height: 2px; background: white; border-radius: 1px; }
  `;
  document.head.appendChild(s);
}
injectStyles();

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

  if (url.includes("facebook.com")) {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/$/, "");
      const segments = path.split("/").filter(Boolean);

      // profile.php?id=xxx
      if (path === "/profile.php" || u.searchParams.has("id")) return "facebook_profile";

      // Single segment vanity URL: /username
      // But exclude known non-profile paths
      const NON_PROFILE = ["groups", "pages", "events", "marketplace",
        "watch", "stories", "gaming", "notifications",
        "settings", "help", "ads", "hashtag", "search"];

      if (segments.length === 1 && !NON_PROFILE.includes(segments[0])) {
        return "facebook_profile";
      }
    } catch { }
  }

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
  console.log("[PS] page type:", getPageType());
  console.log("[PS] name from title:", name);
  console.log("[PS] document.title:", document.title);

  if (!name) {
    console.log("[PS] no name found — button not injected");
    return;
  }

  const btn = makeFloatingButton("＋ Add to Pipestack", DESIGN.primary);
  btn.addEventListener("click", () => {
    const avatarUrl = getProfileAvatar();
    safeSendMessage(
      {
        type: "SEND_LEAD",
        payload: {
          name,
          profileUrl: cleanProfileUrl(window.location.href),
          avatarUrl,
          platform: window.location.href.includes("instagram") ? "instagram" : "facebook",
        },
      },
      (res) => {
        if (res?.success && res.result?.skipped) showToast("Lead already in your pipeline.");
        else if (res?.success) showToast("Lead added to Pipestack!");
        else showToast("Failed. Is your app running?", true);
      }
    );
  });

  document.body.appendChild(btn);
}

function getProfileAvatar() {
  const name = getNameFromTitle();

  // 1. Find the SVG with aria-label matching the profile name
  // This is exactly how Facebook marks the profile picture
  if (name) {
    const profileSvg = document.querySelector(`svg[aria-label="${name}"]`);
    if (profileSvg) {
      const img = profileSvg.querySelector("image");
      const href = img?.getAttribute("xlink:href") || img?.getAttribute("href");
      if (href) return href;
    }
  }

  // 2. Fallback — largest SVG image on the page
  const svgImages = Array.from(document.querySelectorAll("svg[role='img'] image"));
  if (svgImages.length > 0) {
    const largest = svgImages.reduce((best, img) => {
      const w = parseFloat(img.closest("svg")?.style.width ?? "0");
      const bestW = parseFloat(best.closest("svg")?.style.width ?? "0");
      return w > bestW ? img : best;
    }, svgImages[0]);

    const href = largest.getAttribute("xlink:href") || largest.getAttribute("href");
    if (href) return href;
  }

  // 3. Regular img fallback
  const fbImg = document.querySelector(
    'img[src*="fbcdn.net"][alt*="profile"], img[src*="scontent"][alt*="profile"]'
  );
  if (fbImg?.src) return fbImg.src;

  // 4. Instagram
  const igPic = document.querySelector(
    'header img[src*="cdninstagram"], img[alt*="profile picture"]'
  );
  if (igPic?.src) return igPic.src;

  return null;
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
  // Strategy 1: explicit toolbar role — most reliable
  const toolbars = Array.from(document.querySelectorAll("[role='toolbar']"));
  if (toolbars.length > 0) return toolbars;

  // Strategy 2: divs that contain Like + Comment + Share as direct button children
  // Must have role='button' children — not just text anywhere in the subtree
  return Array.from(document.querySelectorAll("div")).filter((div) => {
    // Must have between 2-5 children to be an action bar
    if (div.children.length < 2 || div.children.length > 5) return false;

    // Require actual role='button' children (not just text match anywhere)
    const buttons = Array.from(div.querySelectorAll("[role='button'], [aria-label]"));
    if (buttons.length < 2) return false;

    const labels = buttons.map(b =>
      (b.getAttribute("aria-label") ?? b.textContent ?? "").toLowerCase()
    );

    const hasLike = labels.some(t => t.includes("like") || t.includes("react"));
    const hasComment = labels.some(t => t.includes("comment") || t.includes("leave a comment"));
    const hasShare = labels.some(t => t.includes("share"));

    return hasLike && hasComment && hasShare;
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
  // If a dialog is already open (user manually opened it), scrape it directly
  const existingDialog = getVisibleDialog();
  if (existingDialog) {
    waitForDialogToStabilize(existingDialog, () => {
      expandComments(existingDialog);
      setTimeout(() => {
        const nodes = findCommentNodes(existingDialog);
        const commenters = extractFromCommentNodes(nodes);
        if (commenters.length === 0) {
          showToast("No commenters found. Try scrolling inside the post first.", true);
          importPanelOpen = false;
          return;
        }
        checkAndShowPanel(commenters, existingDialog);
      }, 800);
    });
    return;
  }

  // No dialog open — always try to open the modal to get ALL comments
  // (inline comments on the feed are never complete)
  const opened = tryOpenPostComments(postRoot);
  if (opened) {
    waitForModalAndScrape();
  } else {
    // Modal couldn't be opened — last resort: scrape whatever is inline
    const inlineNodes = findCommentNodes(postRoot);
    if (inlineNodes.length > 0) {
      const commenters = extractFromCommentNodes(inlineNodes);
      if (commenters.length > 0) {
        checkAndShowPanel(commenters, postRoot);
        return;
      }
    }
    showToast("Couldn't load comments. Try clicking the post to open it first.", true);
    importPanelOpen = false;
  }
}

function tryOpenPostComments(postRoot) {
  const candidates = Array.from(postRoot.querySelectorAll("[role='button'], a, span"));

  const COMMENT_REGEX = /^\d+[KkM]?\s+comments?$/i;
  // Prefer role='button' element over plain spans
  const commentsBtn =
    // First try: div/element with role='button' containing comment count
    candidates.find((el) => {
      return (
        el.getAttribute("role") === "button" &&
        COMMENT_REGEX.test(el.textContent?.trim() ?? "")
      );
    }) ||
    // Fallback: any element with matching text
    candidates.find((el) => {
      return (
        COMMENT_REGEX.test(el.textContent?.trim() ?? "") ||
        COMMENT_REGEX.test(el.getAttribute("aria-label") ?? "")
      );
    });

  console.log("[PS] clicking:", commentsBtn?.tagName, commentsBtn?.getAttribute("role"), commentsBtn?.textContent?.trim());

  if (commentsBtn) {
    commentsBtn.focus();
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      commentsBtn.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
    });
    return true;
  }

  return false;
}

function waitForModalAndScrape() {
  const maxWait = 15000;
  const interval = 500;
  let elapsed = 0;

  showToast("Opening post...", false);

  const timer = setInterval(() => {
    elapsed += interval;

    const dialog = getVisibleDialog();

    if (dialog) {
      clearInterval(timer);
      document.getElementById("pipeline-toast")?.remove();

      // Show loading panel immediately so user knows it's working
      showLoadingPanel();

      // Give the dialog extra time to settle before we even start watching it
      setTimeout(() => {
        waitForDialogToStabilize(dialog, () => {
          expandComments(dialog);

          // After expanding, wait again for new comments to render
          setTimeout(() => {
            autoScrollModal(dialog, () => {
              const nodes = findCommentNodes(dialog);
              const commenters = extractFromCommentNodes(nodes);

              if (commenters.length === 0) {
                updateLoadingPanel("No commenters found. Try hitting refresh ↻", true);
                return;
              }

              // Replace loading panel with real results
              document.getElementById("pipeline-panel")?.remove();
              importPanelOpen = false;
              checkAndShowPanel(commenters, dialog);
            });
          }, 2000); // wait after expand before scrolling
        });
      }, 2000); // initial settle time after dialog appears

      return;
    }

    if (elapsed >= maxWait) {
      clearInterval(timer);
      document.getElementById("pipeline-toast")?.remove();
      showToast("Couldn't open post. Try clicking the post manually first.", true);
      importPanelOpen = false;
    }
  }, interval);
}

function waitForDialogToStabilize(dialog, callback) {
  const checkInterval = 600;
  const requiredStableChecks = 4;
  const maxChecks = 30; // 18 seconds max
  let lastCount = -1;
  let stableChecks = 0;
  let totalChecks = 0;

  updateLoadingPanel("Waiting for comments to load...");

  const checker = setInterval(() => {
    totalChecks++;
    const currentCount = dialog.querySelectorAll("[role='article']").length;

    updateLoadingPanel(`Loading comments... (${currentCount} found so far)`);

    // Only start counting stable checks once we have at least 1 article
    if (currentCount > 0 && currentCount === lastCount) {
      stableChecks++;
    } else {
      stableChecks = 0; // reset if count changed OR still zero
    }

    lastCount = currentCount;

    const isStable = stableChecks >= requiredStableChecks;
    const timedOut = totalChecks >= maxChecks;

    if (isStable || (timedOut && currentCount > 0)) {
      // Only proceed if we actually have something
      clearInterval(checker);
      updateLoadingPanel("Expanding & scrolling through comments...");
      callback();
    } else if (timedOut && currentCount === 0) {
      // Gave up with nothing — tell the user
      clearInterval(checker);
      updateLoadingPanel("No comments loaded. Try opening the post manually first.", true);
    }
  }, checkInterval);
}

function showLoadingPanel() {
  importPanelOpen = true;
  document.getElementById("pipeline-panel")?.remove();

  const panel = document.createElement("div");
  panel.id = "pipeline-panel";
  panel.style.cssText = `
    position:fixed; top:12px; right:12px; width:400px; height:calc(100vh - 24px);
    background:${DESIGN.glass}; z-index:2147483647;
    border-radius:20px; border:1px solid ${DESIGN.border};
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family:${DESIGN.font};
    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  panel.innerHTML = `
    <div style="text-align:center; padding:40px;">
      <div id="pp-loading-spinner" style="
        width:48px; height:48px; border:3px solid #e2e8f0;
        border-top:3px solid ${DESIGN.primary};
        border-radius:50%; margin:0 auto 24px;
        animation: spin 0.8s linear infinite;
      "></div>
      <div style="font-size:18px; font-weight:800; color:#1e293b; margin-bottom:8px;">Import Leads</div>
      <div id="pp-loading-status" style="font-size:13px; color:#64748b; font-weight:500; line-height:1.5;">
        Opening post...
      </div>
      <button id="pp-loading-close" style="
        margin-top:32px; padding:8px 20px; background:#f1f5f9;
        border:none; border-radius:10px; font-size:13px;
        color:#64748b; cursor:pointer; font-weight:600;
      ">Cancel</button>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("pp-loading-close").addEventListener("click", () => {
    panel.remove();
    importPanelOpen = false;
  });
}

function updateLoadingPanel(message, isError = false) {
  const statusEl = document.getElementById("pp-loading-status");
  const spinner = document.getElementById("pp-loading-spinner");
  if (!statusEl) return;

  statusEl.textContent = message;

  if (isError) {
    statusEl.style.color = "#ef4444";
    if (spinner) {
      spinner.style.borderTopColor = "#ef4444";
      spinner.style.animation = "none";
    }
  }
}

function getVisibleDialog() {
  const dialogs = Array.from(document.querySelectorAll("[role='dialog']"));

  let best = null;
  let bestArea = 0;

  dialogs.forEach(d => {
    const rect = d.getBoundingClientRect();
    const area = rect.width * rect.height;

    // Must be meaningfully sized
    if (area <= 10000) return;

    // Must have actual text content — skip skeleton/loading dialogs
    const text = d.innerText?.trim() ?? "";
    if (text.length < 20) return;

    // Prefer dialogs with articles already in them
    const articles = d.querySelectorAll("[role='article']").length;
    const score = area + articles * 50000; // weight toward dialogs with content

    if (score > bestArea) {
      bestArea = score;
      best = d;
    }
  });

  return best;
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
  // Only click elements that are INSIDE root and won't open a new modal
  // Exclude anything that might trigger a dialog open
  const buttons = Array.from(root.querySelectorAll("[role='button'], span, div"));
  buttons.forEach((el) => {
    // Skip if this element is outside our root (safety check)
    if (!root.contains(el)) return;

    // Skip if clicking this would likely open a new dialog
    // (these are typically anchor tags or elements with href)
    if (el.tagName === "A" && el.href) return;

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
  const dialog = getVisibleDialog();
  if (dialog) {
    const nodes = findCommentNodes(dialog);
    if (nodes.length > 0) return extractFromCommentNodes(nodes);
  }

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
  // document.title no longer contains the name on profile pages

  // 1. og:title meta tag (most reliable, often still populated)
  const og = document.querySelector('meta[property="og:title"]');
  if (og?.getAttribute("content")) {
    const clean = og.getAttribute("content").split(/[|\-–•]/)[0].trim();
    if (clean && clean.toLowerCase() !== "facebook") return clean;
  }

  // 2. The profile name heading — Facebook renders it as an h1 or a
  //    prominent span near the cover photo
  const candidates = [
    'h1',
    '[data-testid="profile_name_in_profile_page"]',
    'span[dir="auto"]',
  ];

  for (const sel of candidates) {
    const els = Array.from(document.querySelectorAll(sel));
    for (const el of els) {
      const text = el.textContent?.trim();
      if (!text) continue;
      if (text.length < 2 || text.length > 80) continue;
      if (/^(Facebook|Instagram|Add friend|Follow|Message|More)$/i.test(text)) continue;
      if (text.match(/^\d+$/)) continue;
      // Must look like a name — at least two words OR a single word that's capitalised
      if (text.includes(" ") || /^[A-Z]/.test(text)) return text;
    }
  }

  return null;
}

// ─── Import panel ─────────────────────────────────────────────────

function checkAndShowPanel(commenters, scrapeRoot) {
  // Show a brief "Checking for duplicates..." status
  updateLoadingPanel("Checking for duplicates...");

  const leads = commenters.map((c) => ({
    name: c.name,
    profileUrl: c.profileUrl,
  }));

  safeSendMessage({ type: "CHECK_DUPLICATES", leads }, (response) => {
    const duplicateSet = new Set(response?.result?.duplicates ?? []);

    const taggedCommenters = commenters.map((c) => ({
      ...c,
      isDuplicate: duplicateSet.has(c.profileUrl),
    }));

    document.getElementById("pipeline-panel")?.remove();
    importPanelOpen = false;
    showPanel(taggedCommenters, scrapeRoot);
  });
}

function createCommenterHTML(c, index) {
  const avatarHtml = c.avatarUrl
    ? `<img src="${c.avatarUrl}" style="width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#64748b;">${c.name.charAt(0).toUpperCase()}</div>`;

  const isDupe = c.isDuplicate === true;

  return `
    <label class="pp-item" style="
      display:flex; align-items:center; gap:14px;
      padding:12px; border-radius:14px; border:1px solid rgba(0,0,0,0.05);
      cursor:pointer; background:rgba(255,255,255,0.5);
      transition: ${DESIGN.transition};
      ${isDupe ? "opacity: 0.5;" : ""}
    ">
      <input type="checkbox" class="pp-cb pp-checkbox" data-index="${index}" data-duplicate="${isDupe}"
        ${isDupe ? "" : "checked"} />
      ${avatarHtml}
      <div style="min-width:0; flex:1;">
        <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
        <div style="font-size:11px;color:#94a3b8;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${c.profileUrl.replace("https://www.facebook.com/", "fb.com/")}</div>
        ${isDupe ? `<span class="pp-dupe-badge" style="display:inline-block; font-size:10px; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-top:3px;">Already in pipeline</span>` : ""}
      </div>
    </label>
  `;
}

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

    <div style="padding:14px 24px; background:rgba(0,0,0,0.02); border-bottom:1px solid rgba(0,0,0,0.05); flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="checkbox" id="pp-select-all" checked class="pp-checkbox" />
        <label for="pp-select-all" style="font-size:14px; font-weight:600; color:#475569; cursor:pointer;">Select All</label>
        <span id="pp-count" style="font-size:12px; color:#94a3b8; margin-left:auto; font-weight:600; background:white; padding:2px 8px; border-radius:6px;">${commenters.length} selected</span>
      </div>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="pp-hide-dupes" class="pp-checkbox" />
        <span style="font-size:12px; color:#94a3b8; font-weight:600;">Hide already imported</span>
      </label>
    </div>

    <div id="pp-list" class="pp-list" style="flex:1; overflow-y:auto; padding:16px 24px; display:flex; flex-direction:column; gap:10px;">
      ${commenters.map((c, i) => createCommenterHTML(c, i)).join("")}
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

  // Refresh button — auto-scroll dialog then re-scrape and merge new commenters
  document.getElementById("pp-refresh").addEventListener("click", () => {
    const refreshBtn = document.getElementById("pp-refresh");
    refreshBtn.style.animation = "spin 0.6s ease";
    refreshBtn.disabled = true;

    // Determine where to scrape from
    const root = scrapeRoot || document.querySelector("[role='dialog']") || document.body;

    // Expand any new "view more" buttons
    expandComments(root);

    // Auto-scroll the dialog to load more comments, then scrape
    autoScrollModal(root, () => {
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
          const div = document.createElement("div");
          div.innerHTML = createCommenterHTML(c, i).trim();
          // The first child is the label element
          listEl.appendChild(div.firstElementChild);
        });

        document.getElementById("pp-subtitle").textContent = `${commenters.length} people identified (+${added.length} new)`;
        updateCount();
        showToast(`Found ${added.length} new commenter${added.length > 1 ? "s" : ""}!`);
      } else {
        showToast("No new commenters found.");
      }

      refreshBtn.style.animation = "";
      refreshBtn.disabled = false;
    });
  });

  const selectAll = document.getElementById("pp-select-all");
  const countEl = document.getElementById("pp-count");

  function cbs() { return Array.from(document.querySelectorAll(".pp-cb")); }
  function visibleCbs() { return cbs().filter((cb) => cb.closest("label").style.display !== "none"); }
  function updateCount() {
    const n = cbs().filter((cb) => cb.checked).length;
    countEl.textContent = `${n} selected`;
  }

  selectAll.addEventListener("change", () => {
    visibleCbs().forEach((cb) => (cb.checked = selectAll.checked));
    updateCount();
  });

  panel.addEventListener("change", (e) => {
    if (!e.target.classList.contains("pp-cb")) return;

    const cb = e.target;
    const isDupe = cb.dataset.duplicate === "true";
    const item = cb.closest("label");
    const badge = item?.querySelector(".pp-dupe-badge");

    if (isDupe && item) {
      if (cb.checked) {
        item.style.opacity = "1";
        if (badge) {
          badge.textContent = "Will re-import";
          badge.style.color = "#d97706";
          badge.style.background = "#fef3c7";
        }
      } else {
        item.style.opacity = "0.5";
        if (badge) {
          badge.textContent = "Already in pipeline";
          badge.style.color = "#94a3b8";
          badge.style.background = "#f1f5f9";
        }
      }
    }

    const all = visibleCbs();
    selectAll.checked = all.length > 0 && all.every((cb) => cb.checked);
    selectAll.indeterminate = all.some((cb) => cb.checked) && !all.every((cb) => cb.checked);
    updateCount();
  });

  // Hide already-imported toggle
  document.getElementById("pp-hide-dupes").addEventListener("change", (e) => {
    const hide = e.target.checked;
    document.querySelectorAll(".pp-cb").forEach((cb) => {
      const isDupe = cb.dataset.duplicate === "true";
      const item = cb.closest("label");
      if (!item) return;
      // Only hide if it's a dupe AND unchecked (re-import candidates stay visible)
      if (hide && isDupe && !cb.checked) {
        item.style.display = "none";
      } else {
        item.style.display = "flex";
      }
    });
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
          const skippedCount = response.result.skipped ?? 0;
          const importedCount = response.result.count ?? 0;
          importBtn.style.background = "#10b981";
          importBtn.textContent = `✓ ${importedCount} lead${importedCount === 1 ? "" : "s"} imported!`;
          statusEl.textContent = skippedCount > 0
            ? `Added to your pipeline. ${skippedCount} duplicate${skippedCount > 1 ? "s" : ""} skipped.`
            : "Added to your pipeline.";
          statusEl.style.color = "#10b981";

          // Mark just-imported leads as duplicates so they can't be re-imported
          cbs().filter((cb) => cb.checked).forEach((cb) => {
            cb.checked = false;
            cb.dataset.duplicate = "true";
            const item = cb.closest("label");
            if (item) item.style.opacity = "0.5";
            // Add "Already in pipeline" badge if not already present
            const info = item?.querySelector("div[style*='min-width']");
            if (info && !info.querySelector(".pp-dupe-badge")) {
              const badge = document.createElement("span");
              badge.className = "pp-dupe-badge";
              badge.style.cssText = "display:inline-block; font-size:10px; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-top:3px;";
              badge.textContent = "Already in pipeline";
              info.appendChild(badge);
            }
          });

          updateCount();

          // Reset button after a short delay so user can keep working
          setTimeout(() => {
            importBtn.style.background = DESIGN.primary;
            importBtn.textContent = "Import Selected Leads";
            importBtn.disabled = false;
            statusEl.textContent = "";
            statusEl.style.color = "#64748b";
          }, 3000);
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

  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    t.style.transition = DESIGN.transition;
    setTimeout(() => t.remove(), 300);
  }, 4000);
}