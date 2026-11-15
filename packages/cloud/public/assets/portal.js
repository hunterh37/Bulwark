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
let ME, MODS = [], FIXABLE = new Set(), SUM = { findings: [], scans: [], repos: [] }, FILTER = "open";
const isOpen = (f) => f.status === "open" || f.status === "fixing";
const canFix = (f) => !f.pr_url && f.status === "open" && f.commit !== "local" && !f.context && FIXABLE.has(f.rule_id);

function renderFindings() {
  const repo = $("#fRepo").value, tests = $("#fTest").checked;
  const rows = SUM.findings.filter((f) => (tests || !f.context) && (!repo || f.repo === repo) && (
    FILTER === "all" ? true : FILTER === "open" ? isOpen(f) : FILTER === "new" ? f.is_new && isOpen(f) : FILTER === "grid" ? f.grid_impact && isOpen(f)
    : FILTER === "kev" ? f.kev && isOpen(f) : canFix(f)));
  $("#fCount").textContent = `${rows.length} shown of ${SUM.findings.length} in the latest scans`;
  $("#findings").innerHTML = "<tr><th>Severity</th><th>Rule</th><th>Location</th><th>Detail</th><th>Status</th></tr>" +
    (rows.map((f) => `<tr><td class="sev-${esc(f.severity)}">${esc(f.severity)}<br>${f.grid_impact ? '<span class="tag">grid</span>' : ""}${f.kev ? '<span class="tag kev">KEV</span>' : ""}${f.is_new ? '<span class="tag new">new</span>' : ""}${f.context ? '<span class="tag test">test</span>' : ""}</td><td class="mono">${esc(f.rule_id)}<br><small>${esc(f.cwe || "")} · ${esc(f.detector)}</small></td><td class="mono">${esc(f.repo)}<br>${esc(f.file)}:${f.line}</td><td>${esc(f.message)}<br><small>${esc(f.fix)}</small></td><td>${f.pr_url ? `<a href="${esc(f.pr_url)}" target="_blank" rel="noopener">${f.status === "pr_open" ? "PR open" : esc(f.status)}</a>` : f.status === "fixing" ? "fixing…" : `<select data-finding="${f.id}">${["open", "fixed", "ignored"].map((o) => `<option ${o === f.status ? "selected" : ""}>${o}</option>`).join("")}</select>`}${canFix(f) ? `<br><button class="btn small" data-fix="${f.id}">Fix</button>` : ""}${f.fix_error ? `<br><small class="err">${esc(f.fix_error)}</small>` : ""}</td></tr>`).join("") || "<tr><td colspan=5>No findings match.</td></tr>");
  document.querySelectorAll("[data-finding]").forEach((sel) => (sel.onchange = () => api(`/v1/me/findings/${sel.dataset.finding}`, { method: "PATCH", body: { status: sel.value } }).then(refresh)));
  document.querySelectorAll("[data-fix]").forEach((b) => (b.onclick = () => fix(b)));
}
document.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => {
  FILTER = b.dataset.f;
  document.querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("on", x === b));
  renderFindings();
}));
$("#fRepo").onchange = renderFindings; $("#fTest").onchange = renderFindings;

async function refresh() {
  const s = (SUM = await api("/v1/me/summary"));
  const open = s.findings.filter((f) => isOpen(f) && !f.context);
  $("#nRepos").textContent = s.repos.length; $("#nFind").textContent = open.length;
  $("#nGrid").textContent = open.filter((f) => f.grid_impact).length; $("#nRun").textContent = s.runners.length;
  $("#nKev").textContent = open.filter((f) => f.kev).length; $("#nPr").textContent = s.findings.filter((f) => f.status === "pr_open").length;
  $("#scans").innerHTML = "<tr><th>Repo</th><th>Source</th><th>Status</th><th>Files</th><th>Findings</th><th>New</th><th>Commit</th><th>When</th></tr>" +
    (s.scans.map((x) => `<tr><td>${esc(x.repo)}</td><td>${esc(x.source === "runner" ? "runner" : x.trigger)}</td><td>${esc(x.status)}${x.error ? ` <span class="err">${esc(x.error)}</span>` : ""}</td><td>${x.files}</td><td>${x.findings}</td><td>${x.new_findings || ""}</td><td class="mono">${esc((x.commit || "").slice(0, 8))}</td><td>${ago(x.created_at)}</td></tr>`).join("") || "<tr><td colspan=8>No scans yet. Add a repository under GitHub.</td></tr>");
  $("#audit").innerHTML = "<tr><th>When</th><th>Actor</th><th>Action</th></tr>" + s.audit.map((a) => `<tr><td>${ago(a.at)}</td><td>${esc(a.actor)}</td><td class="mono">${esc(a.action)}</td></tr>`).join("");
  const keep = $("#fRepo").value;
  $("#fRepo").innerHTML = '<option value="">All repositories</option>' + [...new Set(s.findings.map((f) => f.repo))].map((r) => `<option ${r === keep ? "selected" : ""}>${esc(r)}</option>`).join("");
  renderFindings();
  const sbom = new Set(s.scans.filter((x) => x.status === "done" && x.components > 0).map((x) => x.repo));
  $("#repos").innerHTML = `<tr><th>Repository (${s.repos.length} of ${ME.limits.repos} on the ${esc(ME.org.plan)} plan)</th><th></th></tr>` + (s.repos.map((r) => `<tr><td class="mono">${esc(r.full_name)}</td><td style="text-align:right">${sbom.has(r.full_name) ? `<a class="btn ghost small" href="/v1/me/sbom?repo=${encodeURIComponent(r.full_name)}">SBOM</a> ` : ""}<button class="btn small" data-scan="${esc(r.full_name)}">Scan now</button> <button class="btn ghost small" data-rm="${esc(r.full_name)}">Remove</button></td></tr>`).join("") || "<tr><td colspan=2>No repositories.</td></tr>");
  document.querySelectorAll("[data-scan]").forEach((b) => (b.onclick = () => scan(b)));
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => api(`/v1/me/repos/${b.dataset.rm}`, { method: "DELETE" }).then(refresh)));
  $("#runners").innerHTML = "<tr><th>ID</th><th>Mode</th><th>Last seen</th></tr>" + (s.runners.map((r) => `<tr><td class="mono">${esc(r.id.slice(0, 8))}</td><td>${esc(r.mode)}</td><td>${ago(r.last_seen)}</td></tr>`).join("") || "<tr><td colspan=3>No runners.</td></tr>");
  return s;
}

function confirmFix(f, plan) {
  const d = $("#fixDlg");
  $("#fixTitle").textContent = `${f.rule_id} in ${f.file}`;
  $("#fixWhy").textContent = f.message;
  $("#fixDiff").innerHTML = plan.before.map((l) => `<span class="del">- ${esc(l)}</span>`).join("") + plan.after.map((l) => `<span class="add">+ ${esc(l)}</span>`).join("");
  $("#fixVerify").textContent = `Rescan of the patched file: finding gone, ${plan.verification.findingsBefore} findings before, ${plan.verification.findingsAfter} after. Engine: ${plan.engine}.`;
  d.showModal();
  return new Promise((res) => {
    $("#fixGo").onclick = () => { d.close(); res(true); };
    $("#fixCancel").onclick = () => { d.close(); res(false); };
    d.oncancel = () => res(false);
  });
}

async function fix(btn) {
  const id = btn.dataset.fix, f = SUM.findings.find((x) => x.id === id);
  btn.disabled = true; btn.textContent = "Checking…";
  try {
    const plan = await api(`/v1/me/findings/${id}/fix`, { method: "POST", body: { dryRun: true } });
    if (!(await confirmFix(f, plan))) { btn.disabled = false; btn.textContent = "Fix"; return; }
    btn.textContent = "Opening PR…";
    await api(`/v1/me/findings/${id}/fix`, { method: "POST", body: {} });
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const cur = await api(`/v1/me/findings/${id}`);
      if (cur.status !== "fixing") break;
    }
  } catch (x) { f.fix_error = x.message; }
  refresh();
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
  $("#modList").innerHTML = MODS.map((m) => `<label class="card check"><input type="checkbox" value="${esc(m.id)}" ${ME.org.modules.includes(m.id) ? "checked" : ""}><span><b>${esc(m.name)}</b><br><span class="mono">${esc(m.id)}@${esc(m.version)} · ${m.analyzer ? "lockfile analyzer" : m.rules + " rules"}</span><br><span style="color:var(--muted)">${esc(m.summary)}</span></span></label>`).join("");
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

const flash = (sel, text) => { $(sel).textContent = text; setTimeout(() => ($(sel).textContent = ""), 2500); };
$("#profile").onsubmit = async (e) => {
  e.preventDefault();
  await api("/v1/me/profile", { method: "PATCH", body: form(e.target) });
  await loadMe(); flash("#profMsg", "Saved.");
};
$("#monitor").onsubmit = async (e) => {
  e.preventDefault(); $("#monErr").textContent = "";
  const v = form(e.target), body = { scanIntervalHours: Number(v.scanIntervalHours) };
  if (v.alertWebhook) body.alertWebhook = v.alertWebhook;
  try { await api("/v1/me/settings", { method: "PUT", body }); e.target.alertWebhook.value = ""; await loadMe(); flash("#monMsg", "Saved."); }
  catch (x) { $("#monErr").textContent = x.message; }
};
$("#testAlert").onclick = async () => {
  $("#monErr").textContent = "";
  try { await api("/v1/me/settings/test-alert", { method: "POST" }); flash("#monMsg", "Test alert sent."); } catch (x) { $("#monErr").textContent = x.message; }
};
$("#clearAlert").onclick = async () => { await api("/v1/me/settings", { method: "PUT", body: { alertWebhook: null } }); await loadMe(); flash("#monMsg", "Webhook removed."); };
$("#pw").onsubmit = async (e) => {
  e.preventDefault(); $("#pwErr").textContent = "";
  try { await api("/v1/me/password", { method: "POST", body: form(e.target) }); e.target.reset(); flash("#pwMsg", "Password changed."); }
  catch (x) { $("#pwErr").textContent = x.message; }
};
$("#del").onsubmit = async (e) => {
  e.preventDefault(); $("#delErr").textContent = "";
  try { await api("/v1/me", { method: "DELETE", body: form(e.target) }); location.href = "/"; } catch (x) { $("#delErr").textContent = x.message; }
};

async function loadMe() {
  ME = await api("/v1/me");
  $("#who").textContent = `${ME.user.email} · ${ME.org.name}`;
  const p = $("#profile");
  p.name.value = ME.user.name; p.org.value = ME.org.name; p.sector.value = ME.org.sector;
  $("#monitor").scanIntervalHours.value = String(ME.org.scan_interval_hours);
  $("#alertState").textContent = ME.org.alerts ? "Alert webhook is set." : "No alert webhook.";
  $("#testAlert").classList.toggle("hidden", !ME.org.alerts); $("#clearAlert").classList.toggle("hidden", !ME.org.alerts);
}

async function boot() {
  try { await loadMe(); } catch { return showAuth(location.hash === "#signup" ? "signup" : "login"); }
  MODS = await api("/v1/modules");
  FIXABLE = new Set(MODS.flatMap((m) => m.autofix));
  $("#auth").classList.add("hidden"); $("#app").classList.remove("hidden"); $("#logout").classList.remove("hidden");
  renderGithub(); renderModules(); await refresh();
  const tab = document.querySelector(`[data-tab="${location.hash.slice(1)}"]`);
  if (tab) tab.click();
  if (new URLSearchParams(location.search).get("gh")) document.querySelector('[data-tab="github"]').click();
}
boot();
