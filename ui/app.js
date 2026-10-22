// Sprite Tracker. Data: sprites.json (bundled), refreshed from GitHub, plus anything new on the Fortnite Wiki.
"use strict";
const FEED = "https://raw.githubusercontent.com/rileyc313/sprite-tracker/main/ui/sprites.json";
const WIKI = "https://fortnite.fandom.com/api.php";
const RARITIES = ["Rare", "Epic", "Legendary", "Mythic", "Unknown"];
const NEW_DAYS = 14, WIKI_EVERY = 6 * 3600e3;
const $ = id => document.getElementById(id);
const tauri = window.__TAURI__;

// ---------- storage ----------
const load = (k, d) => { try { const v = localStorage.getItem("st." + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem("st." + k, JSON.stringify(v)); } catch {} };

let feed = null;                       // newest of bundled / cached / remote sprites.json
let progress = load("progress", {});   // "season|sprite|type" -> { o: 1, m: 1 }
let custom = load("custom", {});       // seasonId -> [sprite] (added by hand)
let wiki = load("wiki", { checked: 0, seasons: {} }); // seasonId -> { sprites: [], extra: { spriteId: [types] } }
let images = load("images", {});       // wiki file title -> thumb url ("" = not on the wiki), plus _checked
let prefs = Object.assign({ season: "", view: "sprite", theme: "muck", dim: true, hideEmpty: true, sort: "rarity" }, load("prefs", {}));
let wikiNote = "";

// ---------- data model ----------
const season = () => feed.seasons.find(s => s.id === prefs.season) || feed.seasons.find(s => s.current) || feed.seasons[0];
const later = (...d) => d.filter(Boolean).sort().pop() || null;
const fileFor = (sp, type) => type === "Base" ? `File:${sp.file || sp.name + " Sprite"} - Item - Fortnite.png` : `File:${type} ${sp.name} Sprite - Item - Fortnite.png`;

function spritesOf(s) {
  const w = wiki.seasons[s.id] || { sprites: [], extra: {} };
  const base = s.sprites.map(sp => {
    const more = [...(w.extra[sp.id] || []), ...((custom[s.id + ":extra"] || {})[sp.id] || [])];
    return more.length ? { ...sp, extra: [...(sp.extra || []), ...more.filter(t => !(sp.extra || []).includes(t))], wikiExtra: w.extra[sp.id] || [] } : sp;
  });
  const known = new Set(base.map(sp => sp.name.toLowerCase()));
  for (const sp of [...w.sprites, ...(custom[s.id] || [])]) if (!known.has(sp.name.toLowerCase())) { base.push(sp); known.add(sp.name.toLowerCase()); }
  return base;
}

function variantsOf(s) {
  const out = [];
  for (const sp of spritesOf(s)) {
    const types = ["Base", ...(sp.variants || s.defaultVariants), ...(sp.extra || [])].filter((t, i, a) => a.indexOf(t) === i);
    for (const type of types) {
      const vt = s.variantTypes[type] || {};
      out.push({
        key: `${s.id}|${sp.id}|${type}`, sp, type,
        name: type === "Base" ? sp.name : `${type} ${sp.name}`,
        added: later(sp.added, (sp.vadded || {})[type], vt.added),
        how: (sp.how || {})[type] || "",
        cost: type === "Base" ? sp.cost : (sp.specialCost || (s.specialCost || {})[sp.rarity]),
        color: vt.color || "#808080",
        src: sp.custom ? "Yours" : sp.fromWiki || (sp.wikiExtra || []).includes(type) ? "Wiki" : "",
      });
    }
  }
  return out;
}

const isNew = v => v.added && (Date.now() - Date.parse(v.added)) / 864e5 <= NEW_DAYS;
const rc = r => `var(--${(r || "unknown").toLowerCase()})`;
const fmtDate = d => d ? new Date(d.slice(0, 10) + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const BLOB = `<svg class="blob" viewBox="0 0 16 14" shape-rendering="crispEdges"><path fill="var(--rc)" d="M4,11h1v1h-1zM11,11h1v1h-1zM4,12h1v1h-1zM5,12h1v1h-1zM10,12h1v1h-1zM11,12h1v1h-1z"/><path fill="#000" d="M6,0h1v1h-1zM7,0h1v1h-1zM8,0h1v1h-1zM9,0h1v1h-1zM4,1h1v1h-1zM5,1h1v1h-1zM10,1h1v1h-1zM11,1h1v1h-1zM3,2h1v1h-1zM12,2h1v1h-1zM2,3h1v1h-1zM12,3h1v1h-1zM2,4h1v1h-1zM12,4h1v1h-1zM1,5h1v1h-1zM12,5h1v1h-1zM1,6h1v1h-1zM4,6h1v1h-1zM5,6h1v1h-1zM8,6h1v1h-1zM9,6h1v1h-1zM13,6h1v1h-1zM1,7h1v1h-1zM4,7h1v1h-1zM8,7h1v1h-1zM13,7h1v1h-1zM1,8h1v1h-1zM14,8h1v1h-1zM1,9h1v1h-1zM14,9h1v1h-1zM2,10h1v1h-1zM13,10h1v1h-1zM2,11h1v1h-1zM3,11h1v1h-1zM12,11h1v1h-1zM13,11h1v1h-1zM3,12h1v1h-1zM6,12h1v1h-1zM9,12h1v1h-1zM12,12h1v1h-1zM4,13h1v1h-1zM5,13h1v1h-1zM7,13h1v1h-1zM8,13h1v1h-1zM10,13h1v1h-1zM11,13h1v1h-1z"/><path fill="var(--rc)" d="M6,1h1v1h-1zM7,1h1v1h-1zM8,1h1v1h-1zM9,1h1v1h-1zM4,2h1v1h-1zM5,2h1v1h-1zM6,2h1v1h-1zM7,2h1v1h-1zM8,2h1v1h-1zM9,2h1v1h-1zM10,2h1v1h-1zM11,2h1v1h-1zM3,3h1v1h-1zM4,3h1v1h-1zM6,3h1v1h-1zM7,3h1v1h-1zM8,3h1v1h-1zM9,3h1v1h-1zM10,3h1v1h-1zM11,3h1v1h-1zM3,4h1v1h-1zM6,4h1v1h-1zM7,4h1v1h-1zM8,4h1v1h-1zM9,4h1v1h-1zM10,4h1v1h-1zM11,4h1v1h-1zM2,5h1v1h-1zM3,5h1v1h-1zM4,5h1v1h-1zM5,5h1v1h-1zM6,5h1v1h-1zM7,5h1v1h-1zM8,5h1v1h-1zM9,5h1v1h-1zM10,5h1v1h-1zM11,5h1v1h-1zM2,6h1v1h-1zM3,6h1v1h-1zM6,6h1v1h-1zM7,6h1v1h-1zM10,6h1v1h-1zM11,6h1v1h-1zM12,6h1v1h-1zM2,7h1v1h-1zM3,7h1v1h-1zM6,7h1v1h-1zM7,7h1v1h-1zM10,7h1v1h-1zM11,7h1v1h-1zM12,7h1v1h-1zM2,8h1v1h-1zM3,8h1v1h-1zM4,8h1v1h-1zM5,8h1v1h-1zM6,8h1v1h-1zM7,8h1v1h-1zM8,8h1v1h-1zM9,8h1v1h-1zM10,8h1v1h-1zM11,8h1v1h-1zM12,8h1v1h-1zM13,8h1v1h-1zM2,9h1v1h-1zM3,9h1v1h-1zM4,9h1v1h-1zM5,9h1v1h-1zM8,9h1v1h-1zM9,9h1v1h-1zM10,9h1v1h-1zM11,9h1v1h-1zM12,9h1v1h-1zM13,9h1v1h-1zM3,10h1v1h-1zM4,10h1v1h-1zM5,10h1v1h-1zM6,10h1v1h-1zM7,10h1v1h-1zM8,10h1v1h-1zM9,10h1v1h-1zM10,10h1v1h-1zM11,10h1v1h-1zM12,10h1v1h-1zM5,11h1v1h-1zM6,11h1v1h-1zM7,11h1v1h-1zM8,11h1v1h-1zM9,11h1v1h-1zM10,11h1v1h-1zM7,12h1v1h-1zM8,12h1v1h-1z"/><path fill="#fff" d="M5,3h1v1h-1zM4,4h1v1h-1zM5,4h1v1h-1zM5,7h1v1h-1zM9,7h1v1h-1z"/><path fill="#FF6FB5" d="M6,9h1v1h-1zM7,9h1v1h-1z"/><path fill="rgba(0,0,0,.35)" d="M4,11h1v1h-1zM11,11h1v1h-1zM4,12h1v1h-1zM5,12h1v1h-1zM10,12h1v1h-1zM11,12h1v1h-1z"/></svg>`; // stand-in sprite when the wiki has no picture yet
const initials = n => n.replace(/[^A-Za-z0-9 -]/g, "").split(/[ -]/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

// ---------- render ----------
function filtered() {
  const s = season(), q = $("search").value.trim().toLowerCase();
  const r = $("fRarity").value, t = $("fType").value, show = $("fShow").value;
  return variantsOf(s).filter(v => {
    const p = progress[v.key] || {};
    if (r && v.sp.rarity !== r) return false;
    if (t && v.type !== t) return false;
    if (show === "missing" && p.o) return false;
    if (show === "owned" && !p.o) return false;
    if (show === "unmastered" && (!p.o || p.m)) return false;
    if (show === "mastered" && !p.m) return false;
    if (show === "new" && !isNew(v)) return false;
    if (q && !`${v.name} ${v.type} ${v.sp.ability} ${v.how} ${v.sp.rarity}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function sortSprites(list) {
  const by = prefs.sort;
  return list.sort((a, b) => by === "name" ? a.name.localeCompare(b.name)
    : by === "newest" ? (b.added || "").localeCompare(a.added || "") || a.name.localeCompare(b.name)
    : RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || (a.added || "9").localeCompare(b.added || "9") || a.name.localeCompare(b.name));
}

// picture: the variant's own (wiki, then feed), else the base sprite's with a variant badge, else the stand-in
function picture(v) {
  const own = images[fileFor(v.sp, v.type)] || (v.sp.imgs || {})[v.type] || (v.type === "Base" && v.sp.img);
  if (own) return { url: own, own: true };
  const base = images[fileFor(v.sp, "Base")] || v.sp.img;
  return base ? { url: base, own: false } : null;
}

function art(v) {
  const p = picture(v);
  return p ? `<img src="${esc(p.url)}" alt="" loading="lazy" draggable="false" referrerpolicy="no-referrer">${p.own ? "" : `<span class="vbadge" style="--vc:${v.color}" title="No picture of this variant yet; showing the base sprite">${esc(v.type)}</span>`}`
    : `<div class="fallback" style="--rc:${rc(v.sp.rarity)}">${BLOB}<b>${esc(initials(v.sp.name))}</b></div>`;
}

function tile(v, label) {
  const p = progress[v.key] || {};
  return `<div class="tile raised ${p.o ? "" : "missing"}" data-key="${esc(v.key)}" data-tip="${esc(tipFor(v))}">
    ${isNew(v) ? `<span class="newtag">NEW</span>` : ""}${v.src ? `<span class="src">${v.src}</span>` : ""}
    <div class="art sunken">${art(v)}<div class="ribbon" style="--vc:${v.color}"></div></div>
    <div class="vname">${esc(label)}</div>
    <div class="sub">${esc(v.how || (label === v.type ? (season().variantTypes[v.type] || {}).effect || v.sp.rarity : v.sp.rarity))}</div>
    <div class="acts"><label class="chk"><input type="checkbox" data-own ${p.o ? "checked" : ""}>Owned</label>
      <button class="star ${p.m ? "on" : ""}" data-master title="Mastered (Level 5)">★</button></div>
  </div>`;
}

function tipFor(v) {
  const s = season(), vt = s.variantTypes[v.type] || {};
  return [v.name + " Sprite", `${v.sp.rarity}${v.type !== "Base" ? " · " + v.type : ""}`, v.sp.ability,
    vt.effect && v.type !== "Base" ? `${v.type}: ${vt.effect}` : "", v.how ? "How to get: " + v.how : "",
    v.cost ? `Summon: ${v.cost.toLocaleString()} Sprite Dust` : "", v.added ? "Added " + fmtDate(v.added) : "", v.sp.note || ""].filter(Boolean).join("\n");
}

function render() {
  document.querySelectorAll("#toolbar select").forEach(sel => sel.nextElementSibling && sel.nextElementSibling.classList.contains("combo") && combo(sel));
  const s = season(), all = variantsOf(s), shown = filtered(), el = $("list"), keep = el.scrollTop;
  const spriteIds = [...new Set(shown.map(v => v.sp.id))];
  if (!shown.length) el.innerHTML = `<div class="empty">No sprites match.<br><br><button data-act="reset">Clear filters</button></div>`;
  else if (prefs.view === "list") {
    el.innerHTML = `<table class="grid"><tr><th></th><th>Sprite</th><th>Variant</th><th>Rarity</th><th>Added</th><th>How to get</th><th>Owned</th><th>Mastered</th></tr>` +
      (order => shown.slice().sort((a, b) => order.indexOf(a.sp.id) - order.indexOf(b.sp.id)))(sortSprites(spritesOf(s)).map(sp => sp.id)).map(v => {
        const p = progress[v.key] || {}, img = (picture(v) || {}).url;
        return `<tr class="${p.o ? "" : "missing"}" data-key="${esc(v.key)}" data-tip="${esc(tipFor(v))}">
          <td>${img ? `<img class="thumb" src="${esc(img)}" alt="" referrerpolicy="no-referrer">` : `<span class="chip" style="--rc:${v.color}">&nbsp;</span>`}</td>
          <td>${esc(v.sp.name)}${isNew(v) ? ` <span class="chip" style="--rc:#C00000">NEW</span>` : ""}</td><td>${esc(v.type)}</td>
          <td><span class="chip" style="--rc:${rc(v.sp.rarity)}">${esc(v.sp.rarity)}</span></td><td>${fmtDate(v.added)}</td><td>${esc(v.how)}</td>
          <td><input type="checkbox" data-own ${p.o ? "checked" : ""}></td><td><button class="star ${p.m ? "on" : ""}" data-master>★</button></td></tr>`;
      }).join("") + `</table>`;
  } else if (prefs.view === "type") {
    const types = Object.keys(s.variantTypes).filter(t => shown.some(v => v.type === t));
    el.innerHTML = types.map(t => {
      const vs = shown.filter(v => v.type === t), got = all.filter(v => v.type === t && (progress[v.key] || {}).o).length;
      const order = sortSprites([...new Set(vs.map(v => v.sp))]);
      vs.sort((a, b) => order.indexOf(a.sp) - order.indexOf(b.sp));
      return `<fieldset class="group"><legend><span class="chip" style="--rc:${s.variantTypes[t].color}">${esc(t)}</span></legend>
        <div class="ghead"><span class="ability">${esc(s.variantTypes[t].effect || "")}</span><span class="count">${got} / ${all.filter(v => v.type === t).length}</span></div>
        <div class="tiles">${vs.map(v => tile(v, v.sp.name)).join("")}</div></fieldset>`;
    }).join("");
  } else {
    const sprites = sortSprites(spritesOf(s).filter(sp => !prefs.hideEmpty || spriteIds.includes(sp.id)));
    el.innerHTML = sprites.map(sp => {
      const vs = shown.filter(v => v.sp.id === sp.id), mine = all.filter(v => v.sp.id === sp.id);
      const got = mine.filter(v => (progress[v.key] || {}).o).length;
      return `<fieldset class="group"><legend>${esc(sp.name)} Sprite <span class="chip" style="--rc:${rc(sp.rarity)}">${esc(sp.rarity)}</span>${sp.starter ? ` <span class="chip" style="--rc:var(--teal)">Starter</span>` : ""}</legend>
        <div class="ghead"><span class="ability">${esc(sp.ability || "")}${sp.added ? ` · added ${fmtDate(sp.added)}` : ""}</span><span class="count">${got} / ${mine.length}</span></div>
        <div class="tiles">${vs.map(v => tile(v, v.type === "Base" ? "Base" : v.type)).join("") || `<span style="color:var(--dim)">Nothing matches the filters.</span>`}</div></fieldset>`;
    }).join("");
  }
  el.scrollTop = keep;
  stats(all);
  $("stShown").textContent = `${shown.length} of ${all.length} variants shown · ${spriteIds.length} sprites`;
}

function statRow(label, got, total, color, filter) {
  return `<div class="statrow ${filter && filter.active ? "active" : ""}" ${filter ? `data-f="${filter.id}" data-v="${esc(filter.v)}"` : ""}>
    <span>${esc(label)}</span><span>${got} / ${total}</span>
    <div class="bar small sunken"><i style="width:${total ? got / total * 100 : 0}%;--c:${color}"></i></div></div>`;
}

function stats(all) {
  const s = season(), own = v => (progress[v.key] || {}).o, got = all.filter(own).length;
  $("sTotal").textContent = `${got} / ${all.length}`;
  $("sBar").style.width = (all.length ? got / all.length * 100 : 0) + "%";
  const sprites = spritesOf(s), mastered = all.filter(v => (progress[v.key] || {}).m).length;
  const complete = sprites.filter(sp => all.filter(v => v.sp.id === sp.id).every(own)).length;
  $("sMastered").innerHTML = `★ ${mastered} mastered<br>${complete} of ${sprites.length} sprites complete`;
  $("sRarity").innerHTML = RARITIES.map(r => {
    const vs = all.filter(v => v.sp.rarity === r);
    return vs.length ? statRow(r, vs.filter(own).length, vs.length, rc(r), { id: "fRarity", v: r, active: $("fRarity").value === r }) : "";
  }).join("");
  $("sType").innerHTML = Object.entries(s.variantTypes).map(([t, vt]) => {
    const vs = all.filter(v => v.type === t);
    return vs.length ? statRow(t, vs.filter(own).length, vs.length, vt.color, { id: "fType", v: t, active: $("fType").value === t }) : "";
  }).join("");
  // newest additions, grouped by day then sprite
  const fresh = all.filter(isNew).sort((a, b) => b.added.localeCompare(a.added));
  const days = {};
  for (const v of fresh) ((days[v.added] ||= {})[v.sp.name] ||= []).push(v);
  $("sNew").innerHTML = Object.keys(days).length ? Object.entries(days).map(([d, sps]) =>
    `<div class="newday">${fmtDate(d)}</div>` + Object.entries(sps).map(([n, vs]) => {
      const types = vs.map(v => v.type);
      return `<div class="newitem" data-search="${esc(n)}">${esc(n)}: ${esc(types.length > 3 ? types.length + " variants" : types.join(", "))}</div>`;
    }).join("")).join("") : `<span style="color:var(--dim)">Nothing in the last ${NEW_DAYS} days.</span>`;
}

function fillSelects() {
  const s = season();
  $("season").innerHTML = feed.seasons.map(x => `<option value="${x.id}" ${x.id === s.id ? "selected" : ""}>${esc(x.name)}${x.current ? " (current)" : ""}</option>`).join("");
  const r = $("fRarity").value, t = $("fType").value, all = variantsOf(s);
  $("fRarity").innerHTML = `<option value="">All rarities</option>` + RARITIES.filter(x => all.some(v => v.sp.rarity === x)).map(x => `<option ${x === r ? "selected" : ""}>${x}</option>`).join("");
  $("fType").innerHTML = `<option value="">All variants</option>` + Object.keys(s.variantTypes).map(x => `<option ${x === t ? "selected" : ""}>${esc(x)}</option>`).join("");
  $("fSort").value = prefs.sort;
  document.querySelectorAll("select:not([size])").forEach(combo);
}

// Win95 drop-down boxes over the real <select>s (the native list ignores the theme)
function combo(sel) {
  let box = sel.nextElementSibling;
  if (!box || !box.classList.contains("combo")) {
    box = document.createElement("div"); box.className = "combo sunken"; box.tabIndex = 0; box.title = sel.title;
    box.innerHTML = `<span></span><b class="raised">6</b>`;
    sel.after(box); sel.style.display = "none";
    const open = () => {
      closeCombos();
      const list = document.createElement("div"); list.className = "clist"; list.id = "clist";
      list.innerHTML = [...sel.options].map((o, i) => `<div data-i="${i}" class="${i === sel.selectedIndex ? "sel" : ""}">${esc(o.text)}</div>`).join("");
      document.body.appendChild(list);
      const r = box.getBoundingClientRect();
      list.style.minWidth = r.width + "px"; list.style.left = r.left + "px";
      list.style.top = (r.bottom + list.offsetHeight > innerHeight ? r.top - list.offsetHeight : r.bottom) + "px";
      list.onmousedown = e => { const d = e.target.closest("[data-i]"); if (!d) return; sel.selectedIndex = +d.dataset.i; closeCombos(); sel.dispatchEvent(new Event("change", { bubbles: true })); combo(sel); e.preventDefault(); };
    };
    box.onmousedown = e => { e.preventDefault(); box.focus(); $("clist") ? closeCombos() : open(); };
    box.onkeydown = e => {
      const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      e.preventDefault(); sel.selectedIndex = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + step));
      sel.dispatchEvent(new Event("change", { bubbles: true })); combo(sel);
    };
  }
  box.firstElementChild.textContent = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : "";
}
function closeCombos() { const l = $("clist"); if (l) l.remove(); }

function syncMenus() {
  document.querySelectorAll("[data-view]").forEach(d => d.classList.toggle("radio", d.dataset.view === prefs.view));
  document.querySelectorAll("[data-theme]").forEach(d => d.classList.toggle("radio", d.dataset.theme === prefs.theme));
  document.querySelector('[data-act="dim"]').classList.toggle("checked", prefs.dim);
  document.querySelector('[data-act="hideEmpty"]').classList.toggle("checked", prefs.hideEmpty);
  document.body.classList.toggle("nodim", !prefs.dim);
}

function setPrefs(p) { Object.assign(prefs, p); save("prefs", prefs); syncMenus(); }

// ---------- marks ----------
function mark(key, field) {
  const p = progress[key] || {};
  if (field === "o") { p.o = p.o ? 0 : 1; if (!p.o) p.m = 0; }
  else { p.m = p.m ? 0 : 1; if (p.m) p.o = 1; }
  if (p.o || p.m) progress[key] = p; else delete progress[key];
  save("progress", progress); render();
}

// ---------- theme (follows Muck95's settings.json) ----------
const SCHEMES = { // Muck95 App.Palette: light face / title colours by scheme
  "Brick": ["#C2BFA5", "#800000"], "Desert": ["#D5CCBB", "#008080"], "Eggplant": ["#90B0A8", "#588078"], "Lilac": ["#AEA8D9", "#5A4EB1"],
};
async function applyTheme() {
  let dark = matchMedia("(prefers-color-scheme: dark)").matches, accent = null, scheme = null, muck = false;
  if (prefs.theme === "muck" && tauri) {
    try {
      const raw = await tauri.core.invoke("muck95_settings");
      if (raw) { const m = JSON.parse(raw.replace(/^﻿/, "")); muck = true; dark = !!m.DarkMode; accent = m.AccentColor; scheme = m.Scheme; }
    } catch {}
  } else if (prefs.theme !== "muck") dark = prefs.theme === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.removeProperty("--face"); root.style.removeProperty("--navy");
  if (!dark && SCHEMES[scheme]) { root.style.setProperty("--face", SCHEMES[scheme][0]); root.style.setProperty("--navy", SCHEMES[scheme][1]); }
  if (accent) root.style.setProperty("--navy", accent);
  document.querySelector('[data-theme="muck"]').textContent = "Theme: follow Muck95" + (prefs.theme === "muck" && !muck ? " (not found)" : "");
}

// ---------- updates: GitHub feed ----------
async function loadFeed() {
  const bundled = await fetch("sprites.json").then(r => r.json());
  const cached = load("feed", null);
  feed = cached && cached.updated >= bundled.updated ? cached : bundled;
  $("stFeed").textContent = "Sprite list: " + fmtDate(feed.updated);
}

async function checkFeed() {
  try {
    const r = await fetch(FEED + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const remote = await r.json();
    if (!remote.seasons || !(remote.updated > feed.updated)) return 0;
    const before = new Set(feed.seasons.flatMap(s => variantsOf(s).map(v => v.key)));
    feed = remote; save("feed", feed);
    $("stFeed").textContent = "Sprite list: " + fmtDate(feed.updated);
    return feed.seasons.flatMap(s => variantsOf(s)).filter(v => !before.has(v.key)).length;
  } catch { $("stFeed").textContent = "Sprite list: " + fmtDate(feed.updated) + " (couldn't check)"; return 0; }
}

// ---------- updates: Fortnite Wiki ----------
const wikiGet = params => fetch(WIKI + "?" + new URLSearchParams({ format: "json", origin: "*", ...params })).then(r => r.json());
const stripWiki = t => (t || "").replace(/\{\{(?:Health|Shield)\}\}/g, m => m.slice(2, -2).toLowerCase()).replace(/\{\{[^{}]*\|([^{}|]*)\}\}/g, "$1").replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?|<[^>]+>/g, "").trim();
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function checkWiki(force) {
  if (!force && Date.now() - wiki.checked < WIKI_EVERY) return 0;
  $("stWiki").textContent = "Fortnite Wiki: checking...";
  try {
    const cat = await wikiGet({ action: "query", list: "categorymembers", cmtitle: "Category:Sprites", cmlimit: "500", cmnamespace: "0" });
    const titles = cat.query.categorymembers.map(m => m.title);
    const pages = [];
    for (let i = 0; i < titles.length; i += 50) {
      const r = await wikiGet({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: titles.slice(i, i + 50).join("|") });
      pages.push(...Object.values(r.query.pages).filter(p => p.revisions));
    }
    const fresh = { checked: Date.now(), seasons: {} };
    let found = 0;
    for (const page of pages) {
      const text = page.revisions[0].slots.main["*"];
      const addedIn = (text.match(/added in \[\[(Chapter \d+: Season \d+)/) || [])[1];
      const info = k => stripWiki((text.match(new RegExp("\\|\\s*" + k + "\\s*=([^\\n]*)")) || [])[1]);
      const name = (info("name") || page.title.replace(/\/.*/, "")).replace(/ Sprite$/, "");
      // find which season this page belongs to: a known sprite, else the season it says it was added in
      let s = feed.seasons.find(x => x.sprites.some(sp => (sp.wiki || sp.name + " Sprite") === page.title || slug(sp.name) === slug(name) && x.wikiSeason === addedIn));
      const known = s && s.sprites.find(sp => (sp.wiki || sp.name + " Sprite") === page.title || slug(sp.name) === slug(name));
      if (!s) s = feed.seasons.find(x => x.wikiSeason && x.wikiSeason === addedIn);
      if (!s) continue;
      const w = fresh.seasons[s.id] ||= { sprites: [], extra: {} };
      // variant table rows: [[File:Gold Jonesy Sprite - Item - Fortnite.png|100px]]<br>Gold Jonesy Sprite
      const types = [...text.matchAll(/\[\[File:([^\]|]+?) - Item - Fortnite\.png[^\]]*\]\]\s*(?:<br\s*\/?>|<hr\s*\/?>)\s*([^\n|]+)/g)]
        .map(m => m[2].trim().replace(/ Sprite$/, "")).map(v => v.toLowerCase() === name.toLowerCase() ? "Base" : v.replace(new RegExp("\\s*" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i"), "").trim())
        .filter(Boolean);
      if (known) {
        const have = ["Base", ...(known.variants || s.defaultVariants), ...(known.extra || [])];
        const extra = types.filter(t => !have.includes(t));
        if (extra.length) { w.extra[known.id] = extra; found += extra.length; }
        for (const t of extra) s.variantTypes[t] ||= { color: "#808080" };
      } else {
        const rar = RARITIES.find(r => info("rarity").startsWith(r)) || "Unknown";
        const date = info("date").replace(/(\d+)(st|nd|rd|th)/, "$1");
        const sp = { id: "wiki-" + slug(name), name, rarity: rar, ability: info("effect"), fromWiki: "Wiki", wiki: page.title,
          added: isNaN(Date.parse(date)) ? null : new Date(Date.parse(date)).toISOString().slice(0, 10),
          variants: types.filter(t => t !== "Base") };
        sp.variants.forEach(t => s.variantTypes[t] ||= { color: "#808080" });
        w.sprites.push(sp); found += 1 + sp.variants.length;
      }
    }
    wiki = fresh; save("wiki", wiki);
    wikiNote = found ? `Fortnite Wiki: +${found} not in the list yet` : "Fortnite Wiki: nothing extra";
  } catch { wikiNote = "Fortnite Wiki: couldn't reach it"; }
  $("stWiki").textContent = wikiNote + " · " + new Date(wiki.checked || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return 0;
}

// sprite pictures from the wiki, cached; misses are retried every 6 hours
async function loadImages(force) {
  if (force || Date.now() - (images._checked || 0) > WIKI_EVERY) for (const k in images) if (images[k] === "") delete images[k];
  const want = [...new Set(feed.seasons.flatMap(s => variantsOf(s)).map(v => fileFor(v.sp, v.type)))].filter(t => !(t in images));
  if (!want.length) return;
  let got = false;
  for (let i = 0; i < want.length; i += 50) {
    try {
      const batch = want.slice(i, i + 50);
      const r = await wikiGet({ action: "query", prop: "imageinfo", iiprop: "url", iiurlwidth: "128", titles: batch.join("|") });
      const norm = Object.fromEntries((r.query.normalized || []).map(n => [n.to, n.from]));
      for (const p of Object.values(r.query.pages)) {
        const title = norm[p.title] || p.title, info = (p.imageinfo || [])[0];
        images[title] = info ? info.thumburl || info.url : "";
        if (info) got = true;
      }
      for (const t of batch) if (!(t in images)) images[t] = "";
    } catch { return; }
  }
  images._checked = Date.now(); save("images", images);
  if (got) render();
}

async function checkAll(force) {
  $("bUpdate").disabled = true;
  const n = await checkFeed();
  await checkWiki(force);
  fillSelects(); render();
  await loadImages(force);
  $("bUpdate").disabled = false;
  if (n) say("New sprites!", `<p>The sprite list was updated (${fmtDate(feed.updated)}): <b>${n}</b> new variant${n === 1 ? "" : "s"}.</p><p>Look for the red NEW tags, or pick <b>New (last 14 days)</b> in the Show box.</p>`);
  else if (force) $("stShown").textContent = "Checked: you're up to date.";
}

// ---------- dialogs ----------
function dialog(title, html, buttons = [["OK", true]]) {
  return new Promise(done => {
    $("dTitle").textContent = title; $("dBody").innerHTML = html;
    $("dBtns").innerHTML = buttons.map(([l], i) => `<button data-i="${i}">${l}</button>`).join("");
    $("modal").classList.add("show");
    const close = v => { closeCombos(); $("modal").classList.remove("show"); done(v); };
    $("dBtns").onclick = e => { const b = e.target.closest("button"); if (b) close(buttons[b.dataset.i][1]); };
    $("dX").onclick = () => close(false);
    $("modal").onkeydown = e => { if (e.key === "Escape") close(false); if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") close(buttons[0][1]); };
    $("dBody").querySelectorAll("select:not([size])").forEach(combo);
    ($("dBody").querySelector("input,textarea,select[size],.combo") || $("dBtns").querySelector("button")).focus();
  });
}
const say = (t, h) => dialog(t, h);

async function addDialog() {
  const s = season(), sprites = spritesOf(s);
  const ok = await dialog("Add sprite or variant", `<p>Missing something? Add it here. Pick an existing sprite to give it a new variant, or type a new name.</p>
    <div class="row"><label>Sprite</label><input type="text" id="aName" list="aNames" placeholder="e.g. Honey"></div>
    <datalist id="aNames">${sprites.map(sp => `<option value="${esc(sp.name)}">`).join("")}</datalist>
    <div class="row"><label>Rarity</label><select id="aRar">${RARITIES.map(r => `<option>${r}</option>`).join("")}</select></div>
    <div class="row"><label>Variants</label><input type="text" id="aVar" placeholder="Gold, Cheat Master, ... (comma separated)"></div>
    <div class="row"><label>Ability</label><input type="text" id="aAb" placeholder="optional"></div>`, [["Add", true], ["Cancel", false]]);
  if (!ok) return;
  const name = $("aName").value.trim().replace(/ Sprite$/i, ""), types = $("aVar").value.split(",").map(t => t.trim()).filter(Boolean);
  if (!name) return;
  types.forEach(t => s.variantTypes[t] ||= { color: "#808080" });
  const existing = sprites.find(sp => sp.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    const ex = custom[s.id + ":extra"] ||= {};
    ex[existing.id] = [...new Set([...(ex[existing.id] || []), ...types])];
  } else {
    (custom[s.id] ||= []).push({ id: "my-" + slug(name) + "-" + Date.now().toString(36), name, rarity: $("aRar").value, ability: $("aAb").value.trim(),
      added: new Date().toISOString().slice(0, 10), custom: true, variants: types });
  }
  save("custom", custom); fillSelects(); render(); loadImages();
}

async function removeDialog() {
  const s = season(), mine = custom[s.id] || [], ex = custom[s.id + ":extra"] || {};
  const items = [...mine.map(sp => ["s:" + sp.id, `${sp.name} (sprite)`]), ...Object.entries(ex).flatMap(([id, ts]) => ts.map(t => [`v:${id}:${t}`, `${t} ${(spritesOf(s).find(x => x.id === id) || {}).name || id} (variant)`]))];
  if (!items.length) return say("Remove", "<p>You haven't added anything to this season.</p>");
  const ok = await dialog("Remove what you added", `<select id="rSel" size="8" style="height:auto">${items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>`, [["Remove", true], ["Cancel", false]]);
  const v = ok && $("rSel").value;
  if (!v) return;
  const [kind, id, t] = v.split(":");
  if (kind === "s") custom[s.id] = mine.filter(sp => sp.id !== id);
  else { ex[id] = ex[id].filter(x => x !== t); if (!ex[id].length) delete ex[id]; }
  save("custom", custom); fillSelects(); render();
}

async function exportDialog() {
  const data = JSON.stringify({ app: "sprite-tracker", saved: new Date().toISOString(), progress, custom });
  const ok = await dialog("Export backup", `<p>Copy this and keep it somewhere safe. Import it on another PC to bring your collection along.</p><textarea id="eTxt" rows="8" readonly>${esc(data)}</textarea>`, [["Copy", true], ["Close", false]]);
  if (ok) { try { await navigator.clipboard.writeText(data); } catch { } $("stShown").textContent = "Backup copied to the clipboard."; }
}

async function importDialog() {
  const ok = await dialog("Import backup", `<p>Paste a backup. Sprites marked in it get added to what you have now.</p><textarea id="iTxt" rows="8"></textarea>`, [["Import", true], ["Cancel", false]]);
  if (!ok) return;
  try {
    const d = JSON.parse($("iTxt").value);
    if (d.app !== "sprite-tracker") throw 0;
    for (const [k, p] of Object.entries(d.progress || {})) progress[k] = { ...(progress[k] || {}), ...p };
    for (const [k, v] of Object.entries(d.custom || {})) custom[k] = Array.isArray(v) ? [...(custom[k] || []).filter(a => !v.some(b => b.id === a.id)), ...v] : { ...(custom[k] || {}), ...v };
    save("progress", progress); save("custom", custom); fillSelects(); render();
    say("Import backup", `<p>Imported ${Object.keys(d.progress || {}).length} marks.</p>`);
  } catch { say("Import backup", "<p>That doesn't look like a Sprite Tracker backup.</p>"); }
}

const HELP = `<p><b>Tick Owned</b> on every sprite variant you've extracted. Click <b>★</b> when it's mastered (Level 5).</p>
<p>The <b>Show</b> box finds what you're still missing. Click a row under <b>By rarity</b> or <b>By variant</b> to filter, and click it again to clear.</p>
<p>Hover over a sprite for its ability, summon cost and how to get it (lobby codes and Cheat Codes).</p>
<p><b>Staying up to date:</b> on launch the app downloads the newest sprite list from GitHub and checks the Fortnite Wiki for sprites that aren't on it yet (marked <i>Wiki</i>). F5 checks again. Anything still missing? <b>Edit ▸ Add sprite or variant</b>.</p>
<p>Your ticks stay on this PC. <b>File ▸ Export backup</b> copies them.</p>`;

// ---------- events ----------
function closeMenus() { document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open")); }

async function act(a) {
  closeMenus();
  const shownKeys = () => filtered().map(v => v.key);
  if (a === "update") checkAll(true);
  else if (a === "export") exportDialog();
  else if (a === "import") importDialog();
  else if (a === "exit") tauri ? tauri.window.getCurrentWindow().close() : window.close();
  else if (a === "add") addDialog();
  else if (a === "removeCustom") removeDialog();
  else if (a === "ownShown") { shownKeys().forEach(k => progress[k] = { ...(progress[k] || {}), o: 1 }); save("progress", progress); render(); }
  else if (a === "clearShown") {
    const keys = shownKeys();
    if (await dialog("Clear marks", `<p>Clear Owned and Mastered on all <b>${keys.length}</b> variants shown right now?</p>`, [["Yes", true], ["No", false]])) {
      keys.forEach(k => delete progress[k]); save("progress", progress); render();
    }
  }
  else if (a === "dim") { setPrefs({ dim: !prefs.dim }); }
  else if (a === "hideEmpty") { setPrefs({ hideEmpty: !prefs.hideEmpty }); render(); }
  else if (a === "help") say("How to use", HELP);
  else if (a === "about") say("About Sprite Tracker", `<p><b>Sprite Tracker</b> 1.0 for Fortnite Sprites.</p><p>Sprite list updated ${fmtDate(feed.updated)}. Pictures and new finds come from the Fortnite Wiki (fortnite.fandom.com, CC BY-SA). Not affiliated with Epic Games.</p>`);
  else if (a === "reset") { $("search").value = ""; ["fRarity", "fType", "fShow"].forEach(id => $(id).value = ""); render(); }
}

function wire() {
  document.addEventListener("mousedown", e => {
    const label = e.target.closest(".mlabel");
    if (label) { const m = label.parentElement, open = m.classList.contains("open"); closeMenus(); if (!open) m.classList.add("open"); e.preventDefault(); return; }
    if (!e.target.closest(".drop")) closeMenus();
    if (!e.target.closest(".combo, .clist")) closeCombos();
  });
  document.addEventListener("mouseover", e => { // Win95: hovering another menu title while one is open switches to it
    const label = e.target.closest(".mlabel"), open = document.querySelector(".menu.open");
    if (label && open && open !== label.parentElement) { closeMenus(); label.parentElement.classList.add("open"); }
  });
  document.addEventListener("click", e => {
    const d = e.target.closest(".drop div, [data-act]");
    if (d && d.dataset.view) { setPrefs({ view: d.dataset.view }); closeMenus(); render(); return; }
    if (d && d.dataset.theme) { setPrefs({ theme: d.dataset.theme }); closeMenus(); applyTheme(); return; }
    if (d && d.dataset.act) return act(d.dataset.act);
    const row = e.target.closest("[data-key]");
    if (row) {
      if (e.target.closest("[data-master]")) return mark(row.dataset.key, "m");
      if (e.target.closest("[data-own]") || e.target.closest(".tile") && !e.target.closest("label")) return mark(row.dataset.key, "o");
    }
    const f = e.target.closest(".statrow[data-f]");
    if (f) { const sel = $(f.dataset.f); sel.value = sel.value === f.dataset.v ? "" : f.dataset.v; render(); }
    const n = e.target.closest(".newitem");
    if (n) { $("search").value = n.dataset.search; $("fShow").value = "new"; render(); }
  });
  document.addEventListener("change", e => { if (e.target.matches("[data-own]")) e.preventDefault(); });
  $("search").addEventListener("input", render);
  ["fRarity", "fType", "fShow"].forEach(id => $(id).addEventListener("change", render));
  $("fSort").addEventListener("change", () => { setPrefs({ sort: $("fSort").value }); render(); });
  $("season").addEventListener("change", () => { setPrefs({ season: $("season").value }); $("fType").value = ""; fillSelects(); render(); });
  $("bUpdate").addEventListener("click", () => checkAll(true));
  document.addEventListener("keydown", e => {
    if (e.key === "F5" || (e.ctrlKey && e.key === "r")) { e.preventDefault(); checkAll(true); }
    if (e.ctrlKey && e.key === "f") { e.preventDefault(); $("search").focus(); $("search").select(); }
    if (e.key === "Escape") closeMenus();
  });
  // tooltips
  const tip = $("tip"); let timer;
  document.addEventListener("mouseover", e => {
    const t = e.target.closest("[data-tip]"); clearTimeout(timer); tip.style.display = "none";
    if (!t) return;
    timer = setTimeout(() => {
      tip.textContent = ""; t.dataset.tip.split("\n").forEach((l, i) => { const d = document.createElement("div"); d.textContent = l; if (!i) d.style.fontWeight = "bold"; tip.appendChild(d); });
      tip.style.display = "block";
      const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(innerWidth - w - 4, Math.max(4, r.left + 8)) + "px";
      tip.style.top = (r.bottom + h + 4 > innerHeight ? r.top - h - 2 : r.bottom + 2) + "px";
    }, 550);
  });
  // window buttons (frameless window)
  const win = tauri && tauri.window.getCurrentWindow();
  $("bMin").onclick = () => win && win.minimize();
  $("bMax").onclick = () => win && win.toggleMaximize();
  $("bClose").onclick = () => win ? win.close() : window.close();
  window.addEventListener("blur", () => document.body.classList.add("blur"));
  window.addEventListener("focus", () => { document.body.classList.remove("blur"); applyTheme(); });
  window.addEventListener("resize", async () => { if (win) $("bMax").textContent = (await win.isMaximized()) ? "2" : "1"; });
}

(async function start() {
  await loadFeed();
  wire(); syncMenus(); await applyTheme();
  fillSelects(); render();
  $("stWiki").textContent = wiki.checked ? "Fortnite Wiki: checked " + new Date(wiki.checked).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Fortnite Wiki: not checked yet";
  checkAll(false);
})();
