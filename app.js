(() => {
  "use strict";
  const cfg = window.TRACKO_CONFIG || {};
  const currency = cfg.currency || "INR";
  const locale = cfg.locale || "en-IN";
  const storeKey = "daywork.v1.data";
  const sessionKey = "daywork.v1.session";
  const workValues = [0, 0.5, 1, 1.5, 2];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const today = dateKey(new Date());
  let data = loadData();
  let selectedDate = today;
  let editingWorkerId = null;
  let profileWorkerId = null;
  let profileMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedWork = 1;
  let session = readSession();
  let toastTimer;

  function loadData() {
    try { const parsed = JSON.parse(localStorage.getItem(storeKey) || "{}"); return { workers: parsed.workers || [], entries: parsed.entries || [], payments: parsed.payments || [] }; }
    catch { return { workers: [], entries: [], payments: [] }; }
  }
  function persist() { localStorage.setItem(storeKey, JSON.stringify(data)); }
  function dateKey(date) { const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0"); return `${y}-${m}-${d}`; }
  function parseDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
  function id() { return crypto.randomUUID ? crypto.randomUUID() : `dw-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function formatMoney(amount) { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount) || 0); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]); }
  function worker(idValue) { return data.workers.find((item) => item.id === idValue); }
  function entry(workerId, date) { return data.entries.find((item) => item.worker_id === workerId && item.work_date === date); }
  function showToast(message, error = false) { const toast = $("#toast"); toast.textContent = message; toast.classList.toggle("error", error); toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800); }
  function openDialog(idValue) { $("#" + idValue).showModal(); }
  function closeDialog(idValue) { $("#" + idValue).close(); }

  function render() { renderMode(); renderDashboard(); if (profileWorkerId) renderProfile(); renderWorkersList(); }
  function renderMode() {
    const pill = $("#modePill");
    if (session?.access_token) { pill.classList.add("synced"); pill.querySelector("span").textContent = "Cloud synced"; }
    else { pill.classList.remove("synced"); pill.querySelector("span").textContent = "On this device"; }
  }
  function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join(""); }
  function earnedFor(workerId) { return data.entries.filter((e) => e.worker_id === workerId).reduce((sum, e) => sum + Number(e.work_amount || 0) * Number(e.daily_wage || 0), 0); }
  function paidFor(workerId) { return data.payments.filter((p) => p.worker_id === workerId).reduce((sum, p) => sum + Number(p.amount || 0), 0); }
  function dueFor(workerId) { return earnedFor(workerId) - paidFor(workerId); }
  function balanceLabel(amount) { return amount < 0 ? `Advance ${formatMoney(Math.abs(amount))}` : formatMoney(amount); }
  function monthPrefix(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
  function renderDashboard() {
    const isProfile = Boolean(profileWorkerId && worker(profileWorkerId));
    $("#dashboardView").classList.toggle("hidden", isProfile);
    $("#workerProfileView").classList.toggle("hidden", !isProfile);
    const month = monthPrefix(new Date());
    const monthEntries = data.entries.filter((e) => e.work_date.startsWith(month));
    $("#summaryWorkers").textContent = data.workers.length;
    $("#summaryWork").textContent = monthEntries.reduce((sum, e) => sum + Number(e.work_amount || 0), 0);
    $("#summaryWorkFoot").textContent = `${monthEntries.length} attendance ${monthEntries.length === 1 ? "record" : "records"} this month`;
    $("#summaryDue").textContent = balanceLabel(data.workers.reduce((sum, w) => sum + dueFor(w.id), 0));
    $("#directoryCount").textContent = `${data.workers.length} ${data.workers.length === 1 ? "worker" : "workers"}`;
    const list = $("#dashboardWorkers");
    if (!data.workers.length) {
      list.innerHTML = `<div class="directory-empty"><span class="empty-illustration">✳</span><h3>Your labour list is empty</h3><p>Add your first worker, then open their profile to record attendance and payments.</p><button class="primary-button" data-add-first>＋ Add a worker</button></div>`;
      list.querySelector("[data-add-first]").addEventListener("click", () => openWorker()); return;
    }
    list.innerHTML = data.workers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((w) => {
      const work = monthEntries.filter((e) => e.worker_id === w.id).reduce((sum, e) => sum + Number(e.work_amount || 0), 0);
      return `<button class="directory-row" data-open-profile="${escapeHtml(w.id)}"><span class="directory-name"><span class="avatar">${escapeHtml(initials(w.name))}</span><span><strong>${escapeHtml(w.name)}</strong><small>${formatMoney(w.daily_wage)} usual daily wage</small></span></span><span class="directory-work"><strong>${work}</strong><small>times this month</small></span><span class="directory-due"><strong>${balanceLabel(dueFor(w.id))}</strong><small>due now</small></span><span class="row-chevron">›</span></button>`;
    }).join("");
    $$('[data-open-profile]').forEach((button) => button.addEventListener("click", () => openProfile(button.dataset.openProfile)));
  }
  function renderProfileCalendar() {
    const w = worker(profileWorkerId); if (!w) return;
    $("#profileMonthTitle").textContent = profileMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
    const grid = $("#profileCalendarGrid"), weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const first = new Date(profileMonth.getFullYear(), profileMonth.getMonth(), 1), offset = (first.getDay() + 6) % 7, days = new Date(profileMonth.getFullYear(), profileMonth.getMonth() + 1, 0).getDate();
    let html = weekdays.map((name) => `<div class="weekday" role="columnheader">${name}</div>`).join("");
    for (let i = 0; i < offset; i++) html += `<div class="calendar-cell outside" aria-hidden="true"></div>`;
    for (let day = 1; day <= days; day++) {
      const key = dateKey(new Date(profileMonth.getFullYear(), profileMonth.getMonth(), day));
      const item = entry(w.id, key), cls = ["calendar-cell", item ? "has-entry" : "", key === selectedDate ? "selected" : "", key === today ? "today" : ""].filter(Boolean).join(" ");
      html += `<button class="${cls}" role="gridcell" data-profile-date="${key}" aria-label="${key}${item ? `, ${item.work_amount} times` : ", no attendance"}"><span class="cell-date">${day}</span>${item ? `<span class="cell-work">${item.work_amount} <small>${Number(item.work_amount) === 1 ? "time" : "times"}</small></span><span class="cell-pay">${formatMoney(Number(item.work_amount) * Number(item.daily_wage))}</span>` : `<span class="cell-empty">·</span>`}</button>`;
    }
    for (let i = 0; i < (7 - ((offset + days) % 7)) % 7; i++) html += `<div class="calendar-cell outside" aria-hidden="true"></div>`;
    grid.innerHTML = html;
    $$('[data-profile-date]').forEach((button) => button.addEventListener("click", () => { selectedDate = button.dataset.profileDate; renderProfileCalendar(); renderProfileDay(); }));
  }
  function renderProfileDay() {
    const w = worker(profileWorkerId), item = w && entry(w.id, selectedDate); if (!w) return;
    const date = parseDate(selectedDate).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("#profileDayRecords").innerHTML = `<div class="profile-day-heading"><div><strong>${escapeHtml(date)}</strong>${item ? `<span>${item.work_amount} ${Number(item.work_amount) === 1 ? "time" : "times"} · ${formatMoney(Number(item.work_amount) * Number(item.daily_wage))}</span>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}` : `<span>No work recorded</span>`}</div><button class="secondary-button" id="editSelectedAttendance">${item ? "Edit" : "＋ Record work"}</button></div>`;
    $("#editSelectedAttendance").addEventListener("click", () => openEntry(w.id));
  }
  function renderProfile() {
    const w = worker(profileWorkerId); if (!w) { profileWorkerId = null; renderDashboard(); return; }
    $("#profileWorkerName").textContent = w.name;
    $("#profileWorkerRate").textContent = `Usual daily wage: ${formatMoney(w.daily_wage)}`;
    const totalWork = data.entries.filter((e) => e.worker_id === w.id).reduce((sum, e) => sum + Number(e.work_amount || 0), 0);
    const due = dueFor(w.id), paid = paidFor(w.id);
    $("#profileDue").textContent = balanceLabel(due); $("#profileWork").textContent = totalWork; $("#profilePaid").textContent = formatMoney(paid);
    renderProfileCalendar(); renderProfileDay();
    const history = data.payments.filter((p) => p.worker_id === w.id).sort((a, b) => b.payment_date.localeCompare(a.payment_date) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
    $("#paymentCount").textContent = history.length;
    $("#paymentHistory").innerHTML = history.length ? history.map((p) => `<div class="payment-row"><span class="payment-symbol">↓</span><span class="payment-info"><strong>${escapeHtml(parseDate(p.payment_date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }))}</strong><small>${escapeHtml(p.note || "Payment")}</small></span><strong class="payment-amount">−${formatMoney(p.amount)}</strong><button class="edit-payment-button" type="button" data-edit-payment="${escapeHtml(p.id)}" aria-label="Edit payment of ${escapeHtml(formatMoney(p.amount))}">Edit</button><button class="delete-payment-button" type="button" data-delete-payment="${escapeHtml(p.id)}" aria-label="Delete payment of ${escapeHtml(formatMoney(p.amount))}">Delete</button></div>`).join("") : `<div class="payments-empty">No payments recorded yet.</div>`;
    $$('[data-edit-payment]').forEach((button) => button.addEventListener("click", () => openPayment(button.dataset.editPayment)));
    $$('[data-delete-payment]').forEach((button) => button.addEventListener("click", () => deletePayment(button.dataset.deletePayment)));
  }
  function openProfile(workerId) {
    profileWorkerId = workerId; profileMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); selectedDate = today; render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderWorkersList() {
    const box = $("#workersList");
    if (!data.workers.length) { box.innerHTML = `<p class="empty-filter">No workers yet. Add someone to get started.</p>`; return; }
    box.innerHTML = data.workers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((w) => `<div class="managed-worker"><span class="avatar">${escapeHtml(initials(w.name))}</span><span class="worker-main"><strong>${escapeHtml(w.name)}</strong><span>${formatMoney(w.daily_wage)} usual daily wage</span></span><button class="small-edit" data-edit-worker="${escapeHtml(w.id)}">Edit</button><button class="small-delete" data-remove-worker="${escapeHtml(w.id)}" aria-label="Remove ${escapeHtml(w.name)}">×</button></div>`).join("");
    $$('[data-edit-worker]').forEach((button) => button.addEventListener("click", () => openWorker(button.dataset.editWorker)));
    $$('[data-remove-worker]').forEach((button) => button.addEventListener("click", () => removeWorker(button.dataset.removeWorker)));
  }
  function openWorker(workerId) {
    const w = worker(workerId);
    editingWorkerId = workerId || null;
    $("#workerDialogTitle").textContent = w ? "Edit worker" : "Add a worker";
    $("#workerName").value = w?.name || "";
    $("#workerWage").value = w?.daily_wage ?? "";
    $("#workerId").value = workerId || "";
    openDialog("workerDialog");
    setTimeout(() => $("#workerName").focus(), 80);
  }
  function openEntry(workerId) {
    const w = worker(workerId); if (!w) return;
    const item = entry(workerId, selectedDate);
    $("#entryWorkerId").value = workerId;
    $("#entryDate").value = selectedDate;
    $("#entryDialogTitle").textContent = w.name;
    $("#entryWage").value = item?.daily_wage ?? w.daily_wage;
    $("#entryNote").value = item?.note || "";
    $("#deleteEntryButton").classList.toggle("hidden", !item);
    selectedWork = item ? Number(item.work_amount) : 1;
    renderWorkOptions(); updatePayPreview(); openDialog("entryDialog");
  }
  function renderWorkOptions() {
    $("#workOptions").innerHTML = workValues.map((amount) => `<button type="button" class="work-option ${amount === selectedWork ? "active" : ""}" data-work="${amount}"><strong>${amount}</strong><span>${amount === 1 ? "1 time" : `${amount} times`}</span></button>`).join("");
    $$("[data-work]").forEach((button) => button.addEventListener("click", () => { selectedWork = Number(button.dataset.work); renderWorkOptions(); updatePayPreview(); }));
  }
  function updatePayPreview() { $("#payPreview").textContent = formatMoney(selectedWork * Number($("#entryWage").value || 0)); }
  async function saveWorker(event) {
    event.preventDefault();
    const workerId = $("#workerId").value || id();
    const record = { id: workerId, name: $("#workerName").value.trim(), daily_wage: Number($("#workerWage").value), created_at: worker(workerId)?.created_at || new Date().toISOString() };
    if (!record.name || record.daily_wage < 0) return;
    const existing = data.workers.findIndex((w) => w.id === workerId);
    if (existing >= 0) data.workers[existing] = record; else data.workers.push(record);
    persist(); closeDialog("workerDialog"); render(); await cloudUpsert("workers", record, "id"); showToast(existing >= 0 ? "Worker updated" : "Worker added");
  }
  async function saveEntry(event) {
    event.preventDefault();
    const workerId = $("#entryWorkerId").value, workDate = $("#entryDate").value;
    const old = entry(workerId, workDate);
    const record = { id: old?.id || id(), worker_id: workerId, work_date: workDate, work_amount: selectedWork, daily_wage: Number($("#entryWage").value), note: $("#entryNote").value.trim(), updated_at: new Date().toISOString() };
    const index = data.entries.findIndex((e) => e.worker_id === workerId && e.work_date === workDate);
    if (index >= 0) data.entries[index] = record; else data.entries.push(record);
    persist(); closeDialog("entryDialog"); render(); await cloudUpsert("attendance", record, "user_id,worker_id,work_date"); showToast("Attendance saved");
  }
  function openPayment(paymentId) {
    if (!profileWorkerId) return;
    const existing = paymentId ? data.payments.find((p) => p.id === paymentId) : null;
    $("#paymentWorkerId").value = profileWorkerId;
    $("#paymentId").value = existing?.id || "";
    $("#paymentDialogTitle").textContent = existing ? "Edit payment" : "Record a payment";
    $("#savePaymentButton").textContent = existing ? "Save changes" : "Save payment";
    $("#paymentAmount").value = existing?.amount ?? "";
    $("#paymentDate").value = existing?.payment_date || today;
    $("#paymentNote").value = existing?.note || "";
    openDialog("paymentDialog");
  }
  async function savePayment(event) {
    event.preventDefault();
    const existingId = $("#paymentId").value;
    const previous = existingId ? data.payments.find((p) => p.id === existingId) : null;
    const record = { id: existingId || id(), worker_id: $("#paymentWorkerId").value, payment_date: $("#paymentDate").value, amount: Number($("#paymentAmount").value), note: $("#paymentNote").value.trim(), created_at: previous?.created_at || new Date().toISOString() };
    if (!record.worker_id || !record.payment_date || !(record.amount > 0)) return;
    if (previous) data.payments[data.payments.findIndex((p) => p.id === existingId)] = record; else data.payments.push(record);
    persist(); closeDialog("paymentDialog"); render();
    await cloudUpsert("payments", record, "id"); showToast(previous ? "Payment updated" : "Payment recorded");
  }
  async function deletePayment(paymentId) {
    const payment = data.payments.find((p) => p.id === paymentId);
    if (!payment || !confirm(`Delete this ${formatMoney(payment.amount)} payment? The due balance will increase by this amount.`)) return;
    data.payments = data.payments.filter((p) => p.id !== paymentId);
    persist(); render();
    await cloudDelete("payments", `id=eq.${encodeURIComponent(paymentId)}`);
    showToast("Payment deleted");
  }
  async function deleteEntry() {
    const workerId = $("#entryWorkerId").value, workDate = $("#entryDate").value;
    const item = entry(workerId, workDate); if (!item) return;
    data.entries = data.entries.filter((e) => e.id !== item.id); persist(); closeDialog("entryDialog"); render();
    await cloudDelete("attendance", `id=eq.${encodeURIComponent(item.id)}`); showToast("Attendance removed");
  }
  async function removeWorker(workerId) {
    const w = worker(workerId); if (!w) return;
    if (!confirm(`Remove ${w.name} and all of their attendance records?`)) return;
    const entryIds = data.entries.filter((e) => e.worker_id === workerId).map((e) => e.id);
    data.entries = data.entries.filter((e) => e.worker_id !== workerId); data.payments = data.payments.filter((p) => p.worker_id !== workerId); data.workers = data.workers.filter((e) => e.id !== workerId); if (profileWorkerId === workerId) profileWorkerId = null; persist(); render();
    if (entryIds.length) await cloudDelete("attendance", `worker_id=eq.${encodeURIComponent(workerId)}`);
    await cloudDelete("payments", `worker_id=eq.${encodeURIComponent(workerId)}`);
    await cloudDelete("workers", `id=eq.${encodeURIComponent(workerId)}`); showToast("Worker removed");
  }

  function hasConfig() { return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey); }
  function readSession() { try { return JSON.parse(localStorage.getItem(sessionKey) || "null"); } catch { return null; } }
  function saveSession(value) { session = value; if (value) localStorage.setItem(sessionKey, JSON.stringify(value)); else localStorage.removeItem(sessionKey); renderMode(); }
  function authHeaders(token = session?.access_token) { return { "apikey": cfg.supabaseAnonKey, "Authorization": `Bearer ${token || cfg.supabaseAnonKey}`, "Content-Type": "application/json" }; }
  async function api(path, options = {}, token) {
    const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}${path}`, { ...options, headers: { ...authHeaders(token), ...(options.headers || {}) } });
    const bodyText = await response.text(); let body; try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = bodyText; }
    if (!response.ok) throw new Error(body?.msg || body?.message || body?.hint || body?.details || body?.error_description || `Request failed (${response.status})`);
    return body;
  }
  async function refreshSession() {
    if (!session?.refresh_token || !hasConfig()) return false;
    try { const next = await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) }, cfg.supabaseAnonKey); saveSession(next); return true; }
    catch { saveSession(null); return false; }
  }
  async function tableRequest(table, query = "", options = {}, retried = false) {
    if (!hasConfig() || !session?.access_token) return null;
    try { return await api(`/rest/v1/${table}${query ? `?${query}` : ""}`, options); }
    catch (err) { if (!retried && /JWT|token|expired/i.test(err.message) && await refreshSession()) return tableRequest(table, query, options, true); throw err; }
  }
  function cloudRecord(record) { return { ...record, user_id: session.user.id }; }
  async function cloudUpsert(table, record, conflict) {
    if (!session?.access_token) return;
    try { await tableRequest(table, `on_conflict=${conflict}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(cloudRecord(record)) }); }
    catch (error) { showToast(`Saved on device; cloud sync failed: ${error.message}`, true); }
  }
  async function cloudDelete(table, query) {
    if (!session?.access_token) return;
    try { await tableRequest(table, query, { method: "DELETE", headers: { Prefer: "return=minimal" } }); }
    catch (error) { showToast(`Removed on device; cloud sync failed: ${error.message}`, true); }
  }
  async function pullCloud() {
    const [workers, entries, payments] = await Promise.all([tableRequest("workers", "select=id,name,daily_wage,created_at&order=name.asc"), tableRequest("attendance", "select=id,worker_id,work_date,work_amount,daily_wage,note,updated_at&order=work_date.desc"), tableRequest("payments", "select=id,worker_id,payment_date,amount,note,created_at&order=payment_date.desc")]);
    const remoteWorkers = workers || [], remoteEntries = entries || [];
    const remoteWorkerIds = new Set(remoteWorkers.map((w) => w.id));
    const mergedWorkers = new Map(remoteWorkers.map((w) => [w.id, w]));
    for (const w of data.workers) if (!mergedWorkers.has(w.id)) { mergedWorkers.set(w.id, w); await cloudUpsert("workers", w, "id"); }
    const mergedEntries = new Map(remoteEntries.map((e) => [`${e.worker_id}:${e.work_date}`, e]));
    for (const e of data.entries) {
      if (!mergedWorkerIds.has(e.worker_id) && !mergedWorkers.has(e.worker_id)) continue;
      const key = `${e.worker_id}:${e.work_date}`;
      if (!mergedEntries.has(key)) { mergedEntries.set(key, e); await cloudUpsert("attendance", e, "user_id,worker_id,work_date"); }
    }
    const remotePayments = payments || [], mergedPayments = new Map(remotePayments.map((p) => [p.id, p]));
    for (const payment of data.payments) if (!mergedPayments.has(payment.id) && mergedWorkers.has(payment.worker_id)) { mergedPayments.set(payment.id, payment); await cloudUpsert("payments", payment, "id"); }
    data = { workers: Array.from(mergedWorkers.values()), entries: Array.from(mergedEntries.values()), payments: Array.from(mergedPayments.values()) };
    persist(); render();
  }
  function setAccountStatus(message, error = false) { const el = $("#accountStatus"); el.textContent = message; el.classList.toggle("error", error); el.classList.toggle("hidden", !message); }
  function updateAccountDialog() {
    const connected = Boolean(session?.access_token);
    $("#authForm").classList.toggle("hidden", connected);
    $("#signoutButton").classList.toggle("hidden", !connected);
    if (!hasConfig()) setAccountStatus("Add your Supabase project URL and anon key to config.js to enable account sign-in and cloud sync.", true);
    else if (connected) setAccountStatus(`Signed in as ${session.user?.email || "your account"}. Records sync to your private cloud workspace.`);
    else setAccountStatus("Use an email and password to create your manager account or sign in.");
  }
  async function authenticate(signUp) {
    if (!hasConfig()) { updateAccountDialog(); return; }
    const email = $("#authEmail").value.trim(), password = $("#authPassword").value;
    setAccountStatus(signUp ? "Creating your account…" : "Signing in…");
    try {
      const result = await api(signUp ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, cfg.supabaseAnonKey);
      if (!result.access_token) { setAccountStatus("Check your email to confirm the account, then come back and sign in."); return; }
      saveSession(result); setAccountStatus("Signed in. Loading and syncing your records…"); await pullCloud(); updateAccountDialog(); showToast("Cloud sync connected");
    } catch (error) { setAccountStatus(error.message, true); }
  }
  async function signOut() { saveSession(null); closeDialog("accountDialog"); showToast("Signed out. Your device copy is still available."); }
  async function startup() {
    $("#currencySymbol").textContent = currency === "INR" ? "₹" : new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((part) => part.type === "currency")?.value || currency;
    $("#entryCurrencySymbol").textContent = $("#currencySymbol").textContent;
    $("#paymentCurrencySymbol").textContent = $("#currencySymbol").textContent;
    if (session?.refresh_token && hasConfig()) { if (await refreshSession()) { try { await pullCloud(); } catch (error) { showToast(`Cloud sync unavailable: ${error.message}`, true); } } }
    render();
  }
  $("#workerForm").addEventListener("submit", saveWorker);
  $("#entryForm").addEventListener("submit", saveEntry);
  $("#entryWage").addEventListener("input", updatePayPreview);
  $("#deleteEntryButton").addEventListener("click", deleteEntry);
  $("#profilePrevMonth").addEventListener("click", () => { profileMonth = new Date(profileMonth.getFullYear(), profileMonth.getMonth() - 1, 1); selectedDate = dateKey(profileMonth); renderProfileCalendar(); renderProfileDay(); });
  $("#profileNextMonth").addEventListener("click", () => { profileMonth = new Date(profileMonth.getFullYear(), profileMonth.getMonth() + 1, 1); selectedDate = dateKey(profileMonth); renderProfileCalendar(); renderProfileDay(); });
  $("#backToDashboard").addEventListener("click", () => { profileWorkerId = null; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("#editProfileWorker").addEventListener("click", () => openWorker(profileWorkerId));
  $("#recordPaymentButton").addEventListener("click", openPayment);
  $("#paymentForm").addEventListener("submit", savePayment);
  $("#addWorkerTop").addEventListener("click", () => openWorker());
  $("#manageWorkersButton").addEventListener("click", () => openDialog("workersDialog"));
  $("#addWorkerInList").addEventListener("click", () => openWorker());
  $("#accountButton").addEventListener("click", () => { updateAccountDialog(); openDialog("accountDialog"); });
  $("#authForm").addEventListener("submit", (event) => { event.preventDefault(); authenticate(false); });
  $("#signupButton").addEventListener("click", () => authenticate(true));
  $("#signoutButton").addEventListener("click", signOut);
  $$('[data-close]').forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.close)));
  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  startup();
})();
