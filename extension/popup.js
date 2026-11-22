// Trade Side clipper. One click adds the page you have open to Trade Side.
//
// What it does: reads the page in the tab you clicked it on, and sends that
// page's address and source to your own Trade Side account.
// What it never does: type into a page, press a button on a page, submit a
// form, fill a password or solve a verification check. It has no access to a
// tab until you click it there.

const DEFAULT_SERVER = "https://www.thetradeside.com";
/** Kept under Trade Side's upload limit. */
const MAX_HTML_CHARS = 2_800_000;

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => ($(id).hidden = !on);

let server = DEFAULT_SERVER;
let tab = null;
let itemLink = "";

function fail(message) {
  $("error").textContent = message;
  show("error");
}

function isPin(url) {
  try {
    const u = new URL(url);
    return /(^|\.)pinterest\.[a-z.]+$/.test(u.hostname) && /\/pin\//.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * Runs inside the page, only after the click. Returns the page's address and
 * a copy of its source with everything a product read doesn't need taken out:
 * styles, drawings, frames, and every text box, so nothing typed into the
 * page is ever sent. On a pin it returns the pin's title, photo and the page
 * it came from instead.
 */
async function readPage(maxChars) {
  const meta = (doc, name) => doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content") || "";

  if (/(^|\.)pinterest\.[a-z.]+$/.test(location.hostname) && /\/pin\//.test(location.pathname)) {
    // Pinterest swaps pins without loading a new page, so the open document can describe an earlier pin. Ask for this pin's own page.
    let doc = document;
    let raw = "";
    try {
      raw = await (await fetch(location.href, { credentials: "include" })).text();
      doc = new DOMParser().parseFromString(raw, "text/html");
    } catch {
      // Fall back to what is on screen.
    }
    let source = meta(doc, "og:see_also") || meta(doc, "pinterestapp:source");
    if (!source) {
      const found = raw.match(/"link":"(https?:[^"]+)"/);
      if (found) {
        try {
          source = JSON.parse(`"${found[1]}"`);
        } catch {
          source = "";
        }
      }
    }
    return {
      pin: {
        url: location.origin + location.pathname,
        // Pinterest adds " | board names" after the pin's own title.
        title: (meta(doc, "og:title") || document.title).split(" | ")[0].trim(),
        image: meta(doc, "og:image"),
        source,
      },
    };
  }

  const copy = document.documentElement.cloneNode(true);
  for (const node of copy.querySelectorAll("style, link, svg, canvas, video, audio, iframe, noscript, template, input, textarea")) node.remove();
  for (const script of copy.querySelectorAll("script")) {
    const type = (script.getAttribute("type") || "").toLowerCase();
    // Keep only the scripts that describe the product: the page's own product data.
    const keep = type === "application/ld+json" || type === "application/json" || script.textContent.trimStart().startsWith("self.__next_f");
    if (!keep) script.remove();
  }
  // The address of each photo as it is shown now, since many sites fill these in late.
  for (const img of copy.querySelectorAll("img")) {
    const live = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (live) img.setAttribute("src", new URL(live, location.href).href);
    img.removeAttribute("srcset");
    img.removeAttribute("style");
  }
  return { url: location.href, html: `<!doctype html>${copy.outerHTML}`.slice(0, maxChars) };
}

async function call(path, options) {
  let res;
  try {
    res = await fetch(`${server}${path}`, { credentials: "include", ...options });
  } catch {
    throw new Error("Couldn't reach Trade Side. Check your connection and try again.");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    // Not a Trade Side answer.
  }
  if (!res.ok) {
    const err = new Error(data.error || "Trade Side couldn't take that. Try again.");
    err.reason = data.reason || (res.status === 401 ? "signed-out" : "");
    throw err;
  }
  return data;
}

async function start() {
  const saved = await chrome.storage.local.get(["server", "project"]);
  server = saved.server || DEFAULT_SERVER;
  $("server").value = server;
  $("project").value = saved.project || "";

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) {
    show("status", false);
    return fail("Open a product page or a pin, then press the button again.");
  }

  try {
    const me = await call("/api/clip");
    $("projects").replaceChildren(...me.projects.map((name) => Object.assign(document.createElement("option"), { value: name })));
  } catch (err) {
    show("status", false);
    if (err.reason === "signed-out") return show("signin");
    return fail(err.message);
  }

  show("status", false);
  $("page-title").textContent = tab.title || tab.url;
  $("page-site").textContent = new URL(tab.url).hostname.replace(/^www\./, "");
  if (isPin(tab.url)) {
    show("pin-note");
    $("add").textContent = "Add this pin";
  }
  show("clip");
  $("project").focus();
}

$("clip").addEventListener("submit", async (event) => {
  event.preventDefault();
  show("error", false);
  const button = $("add");
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Adding…";
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage, args: [MAX_HTML_CHARS] });
    if (!result) throw new Error("This page can't be read. Add the item by hand in Trade Side.");
    const project = $("project").value.trim();
    await chrome.storage.local.set({ project });
    const added = await call("/api/clip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...result, project }) });
    itemLink = added.link;
    $("done-text").textContent = added.reading
      ? `Added${project ? ` to ${project}` : ""}. Trade Side is reading the page now, which usually takes under a minute.`
      : `Added${project ? ` to ${project}` : ""} with the pin's photo and title. This pin has no source page, so the rest is yours to fill in.`;
    show("clip", false);
    show("done");
  } catch (err) {
    if (err.reason === "signed-out") {
      show("clip", false);
      show("signin");
    } else {
      fail(/Cannot access|cannot be scripted|chrome:\/\//i.test(err.message) ? "Chrome doesn't let extensions read this page. Add the item by hand in Trade Side." : err.message);
    }
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

$("open-signin").addEventListener("click", () => chrome.tabs.create({ url: `${server}/login` }));
$("open-item").addEventListener("click", () => chrome.tabs.create({ url: itemLink }));

$("save-server").addEventListener("click", async () => {
  show("error", false);
  let origin;
  try {
    origin = new URL($("server").value.trim()).origin;
  } catch {
    return fail("That isn't a web address.");
  }
  // Chrome asks the person before the extension may talk to any address other than Trade Side's own.
  const granted = origin === DEFAULT_SERVER || (await chrome.permissions.request({ origins: [`${origin}/*`] }));
  if (!granted) return fail("Chrome didn't allow that address.");
  await chrome.storage.local.set({ server: origin });
  location.reload();
});

start();
