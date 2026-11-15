const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ago = (t) => (t ? new Date(t).toLocaleString() : "never");

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
const form = (f) => Object.fromEntries(new FormData(f));

// ---------- auth ----------
function showAuth(which) {
  $("#auth").classList.remove("hidden"); $("#app").classList.add("hidden");
  document.querySelectorAll("[data-auth]").forEach((b) => b.classList.toggle("on", b.dataset.auth === which));
  $("#login").classList.toggle("hidden", which !== "login");
  $("#signup").classList.toggle("hidden", which !== "signup");
}
document.querySelectorAll("[data-auth]").forEach((b) => (b.onclick = () => showAuth(b.dataset.auth)));
for (const id of ["login", "signup"]) {
  $("#" + id).onsubmit = async (e) => {
    e.preventDefault();
    const err = e.target.querySelector(".err"); err.textContent = "";
    try { await api(`/v1/auth/${id}`, { method: "POST", body: form(e.target) }); boot(); }
    catch (x) { err.textContent = x.message; }
  };
}
$("#logout").onclick = async () => { await api("/v1/auth/logout", { method: "POST" }); location.href = "/"; };

// ---------- tabs ----------
document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => {
  document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll("[data-pane]").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== b.dataset.tab));
  history.replaceState(null, "", "#" + b.dataset.tab);
}));

// ---------- data ----------
let ME, MODS = [];
async function refresh() {
  const s = await api("/v1/me/summary");
  const open = s.findings.filter((f) => f.status === "open");
  $("#nRepos").textContent = s.repos.length; $("#nFind").textContent = open.length;
  $("#nGrid").textContent = open.filter((f) => f.grid_impact).length; $("#nRun").textContent = s.runners.length;
  $("#scans").innerHTML = "<tr><th>Repo</th><th>Source</th><th>Status</th><th>Files</th><th>Findings</th><th>Commit</th><th>When</th></tr>" +
    (s.scans.map((x) => `<tr><td>${esc(x.repo)}</td><td>${esc(x.source)}</td><td>${esc(x.status)}${x.error ? ` <span class="err">${esc(x.error)}</span>` : ""}</td><td>${x.files}</td><td>${x.findings}</td><td class="mono">${esc((x.commit || "").slice(0, 8))}</td><td>${ago(x.created_at)}</td></tr>`).join("") || "<tr><td colspan=7>No scans yet. Add a repo under GitHub.</td></tr>");
  $("#audit").innerHTML = "<tr><th>When</th><th>Actor</th><th>Action</th></tr>" + s.audit.map((a) => `<tr><td>${ago(a.at)}</td><td>${esc(a.actor)}</td><td class="mono">${esc(a.action)}</td></tr>`).join("");
  $("#findings").innerHTML = "<tr><th>Severity</th><th>Rule</th><th>Location</th><th>Detail</th><th>Status</th></tr>" +
    (s.findings.map((f) => `<tr><td class="sev-${esc(f.severity)}">${esc(f.severity)}${f.grid_impact ? '<br><span class="tag">grid</span>' : ""}</td><td class="mono">${esc(f.rule_id)}<br><small>${esc(f.detector)}</small></td><td class="mono">${esc(f.repo)}<br>${esc(f.file)}:${f.line}</td><td>${esc(f.message)}<br><small style="color:var(--muted)">${esc(f.fix)}</small></td><td><select data-finding="${f.id}">${["open", "fixed", "ignored"].map((o) => `<option ${o === f.status ? "selected" : ""}>${o}</option>`).join("")}</select></td></tr>`).join("") || "<tr><td colspan=5>No findings.</td></tr>");
  document.querySelectorAll("[data-finding]").forEach((sel) => (sel.onchange = () => api(`/v1/me/findings/${sel.dataset.finding}`, { method: "PATCH", body: { status: sel.value } }).then(refresh)));
  $("#repos").innerHTML = "<tr><th>Repository</th><th></th></tr>" + (s.repos.map((r) => `<tr><td class="mono">${esc(r.full_name)}</td><td style="text-align:right"><button class="btn small" data-scan="${esc(r.full_name)}">Scan now</button> <button class="btn ghost small" data-rm="${esc(r.full_name)}">Remove</button></td></tr>`).join("") || "<tr><td colspan=2>No repositories.</td></tr>");
  document.querySelectorAll("[data-scan]").forEach((b) => (b.onclick = () => scan(b)));
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => api(`/v1/me/repos/${b.dataset.rm}`, { method: "DELETE" }).then(refresh)));
  $("#runners").innerHTML = "<tr><th>ID</th><th>Mode</th><th>Last seen</th></tr>" + (s.runners.map((r) => `<tr><td class="mono">${esc(r.id.slice(0, 8))}</td><td>${esc(r.mode)}</td><td>${ago(r.last_seen)}</td></tr>`).join("") || "<tr><td colspan=3>No runners.</td></tr>");
  return s;
}

async function scan(btn) {
  btn.disabled = true; btn.textContent = "Scanning…";
  try {
    const { id } = await api("/v1/me/scans", { method: "POST", body: { repo: btn.dataset.scan } });
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await api(`/v1/me/scans/${id}`);
      if (s.status === "done" || s.status === "failed") break;
    }
  } catch (x) { $("#repoErr").textContent = x.message; }
  refresh();
}

function renderGithub() {
  const login = ME.org.github_login;
  $("#ghState").innerHTML = login ? `Connected as <b class="mono">${esc(login)}</b>.` : "Not connected. Public repos still scan; private repos need a connection.";
  $("#ghDisconnect").classList.toggle("hidden", !login);
  $("#ghOauthWrap").classList.toggle("hidden", !ME.githubOAuth || !!login);
  if (login) api("/v1/me/github/repos").then((rs) => ($("#ghRepos").innerHTML = rs.map((r) => `<option value="${esc(r.full_name)}">`).join(""))).catch(() => {});
}
$("#ghToken").onsubmit = async (e) => {
  e.preventDefault(); $("#ghErr").textContent = "";
  try { await api("/v1/me/github", { method: "POST", body: form(e.target) }); e.target.reset(); await loadMe(); renderGithub(); }
  catch (x) { $("#ghErr").textContent = x.message; }
};
$("#ghDisconnect").onclick = async () => { await api("/v1/me/github", { method: "DELETE" }); await loadMe(); renderGithub(); };
$("#addRepo").onsubmit = async (e) => {
  e.preventDefault(); $("#repoErr").textContent = "";
  try { await api("/v1/me/repos", { method: "POST", body: form(e.target) }); e.target.reset(); refresh(); }
  catch (x) { $("#repoErr").textContent = x.message; }
};

function renderModules() {
  $("#modList").innerHTML = MODS.map((m) => `<label class="card check"><input type="checkbox" value="${esc(m.id)}" ${ME.org.modules.includes(m.id) ? "checked" : ""}><span><b>${esc(m.name)}</b><br><span class="mono">${esc(m.id)}@${esc(m.version)} · ${m.rules} rules</span><br><span style="color:var(--muted)">${esc(m.summary)}</span></span></label>`).join("");
}
$("#saveMods").onclick = async () => {
  const ids = [...document.querySelectorAll("#modList input:checked")].map((i) => i.value);
  await api("/v1/me/modules", { method: "PUT", body: { modules: ids } });
  ME.org.modules = ids; $("#modMsg").textContent = "Saved."; setTimeout(() => ($("#modMsg").textContent = ""), 2000);
};

$("#newRunner").onsubmit = async (e) => {
  e.preventDefault();
  const r = await api("/v1/me/runners", { method: "POST", body: form(e.target) });
  $("#runnerOut").classList.remove("hidden");
  $("#runnerCmd").textContent = r.mode === "airgap"
    ? `# Air-gapped: runs with no network. Results in ./bulwark-results\nnode bulwark-runner.mjs scan /srv/git/<repo> --offline\n\n# Runner token for later import from a connected host:\n${r.token}`
    : `export BULWARK_URL=${location.origin}\nexport BULWARK_TOKEN=${r.token}\nnode bulwark-runner.mjs scan /srv/git/<repo>\n\n# or as a service\nREPOS_DIR=/srv/git docker compose up -d`;
  refresh();
};

$("#profile").onsubmit = async (e) => {
  e.preventDefault();
  await api("/v1/me/profile", { method: "PATCH", body: form(e.target) });
  await loadMe(); $("#profMsg").textContent = "Saved."; setTimeout(() => ($("#profMsg").textContent = ""), 2000);
};

async function loadMe() {
  ME = await api("/v1/me");
  $("#who").textContent = `${ME.user.email} · ${ME.org.name}`;
  const p = $("#profile");
  p.name.value = ME.user.name; p.org.value = ME.org.name; p.sector.value = ME.org.sector;
}

async function boot() {
  try { await loadMe(); } catch { return showAuth(location.hash === "#signup" ? "signup" : "login"); }
  MODS = await api("/v1/modules");
  $("#auth").classList.add("hidden"); $("#app").classList.remove("hidden"); $("#logout").classList.remove("hidden");
  renderGithub(); renderModules(); await refresh();
  const tab = document.querySelector(`[data-tab="${location.hash.slice(1)}"]`);
  if (tab) tab.click();
  if (new URLSearchParams(location.search).get("gh")) document.querySelector('[data-tab="github"]').click();
}
boot();
