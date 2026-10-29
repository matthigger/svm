// Tabs: margin geometry, hard margin, soft margin. Each tab keeps its own
// state while hidden; the hash names the open tab.

const HASH = { geometry: "#geometry", hard: "#hard", soft: "#soft" };
const SHOW = { geometry: geoShow, hard: hardShow, soft: softShow };

function setMode(mode) {
  history.replaceState(null, "", HASH[mode]);
  for (const t of document.querySelectorAll(".tab")) {
    t.setAttribute("aria-selected", t.dataset.mode === mode);
  }
  for (const el of document.querySelectorAll("[data-show]")) {
    el.hidden = !el.dataset.show.split(" ").includes(mode);
  }
  SHOW[mode]();
}

for (const t of document.querySelectorAll(".tab")) {
  t.onclick = () => setMode(t.dataset.mode);
}

setMode(Object.keys(HASH).find(m => HASH[m] === location.hash) ||
  "geometry");
