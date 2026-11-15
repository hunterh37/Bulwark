const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
document.querySelectorAll("pre[data-origin]").forEach((p) => (p.textContent = p.textContent.replaceAll("https://bulwark-cloud.onrender.com", location.origin)));
fetch("/v1/modules").then((r) => r.json()).then((ms) => {
  const mods = document.getElementById("mods");
  if (mods) mods.innerHTML = ms.map((m) => `<div class="card"><h3>${esc(m.name)}</h3><p class="mono">${esc(m.id)}@${esc(m.version)} · ${m.analyzer ? "lockfile analyzer" : m.rules + " rules"}</p><p>${esc(m.summary)}</p><p>${m.sectors.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</p></div>`).join("");
  const rules = document.getElementById("rules");
  if (rules) rules.innerHTML = "<tr><th>Rule</th><th>Severity</th><th>CWE</th><th>What it flags</th><th>Fix PR</th></tr>" + ms.flatMap((m) => m.ruleList).map((r) => `<tr><td class="mono">${esc(r.id)}</td><td class="sev-${esc(r.severity)}">${esc(r.severity)}</td><td class="mono">${esc(r.cwe)}</td><td>${esc(r.message)}<br><small>${esc(r.fix)}</small></td><td>${r.autofix ? "yes" : ""}</td></tr>`).join("");
});
