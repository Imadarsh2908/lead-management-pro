// =================== DATA STORE ===================
let leads = JSON.parse(localStorage.getItem('lms_leads') || '[]');
let activities = JSON.parse(localStorage.getItem('lms_activities') || '[]');
let tasks = JSON.parse(localStorage.getItem('lms_tasks') || '[]');
let teamMembers = JSON.parse(localStorage.getItem('lms_team') || '["Rohan Sharma","Aditi Verma","Karan Singh"]');
let globalTags = JSON.parse(localStorage.getItem('lms_tags') || '["VIP","Enterprise","Hot Lead","Follow-up"]');
let selectedLeads = new Set();
let currentSort = { field: 'created', dir: 'desc' };
let viewingLeadId = null;

// =================== PERSISTENCE ===================
function saveAll() {
  localStorage.setItem('lms_leads', JSON.stringify(leads));
  localStorage.setItem('lms_activities', JSON.stringify(activities));
  localStorage.setItem('lms_tasks', JSON.stringify(tasks));
  localStorage.setItem('lms_team', JSON.stringify(teamMembers));
  localStorage.setItem('lms_tags', JSON.stringify(globalTags));
}

// =================== UTILITY ===================
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
function fmtDateTime(d) { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function fmtMoney(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast ' + type, 3000);
}

function logActivity(text, leadId = null) {
  activities.unshift({ id: uid(), text, leadId, time: new Date().toISOString() });
  if (activities.length > 200) activities = activities.slice(0, 200);
  saveAll();
}

// =================== TABS ===================
function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'pipeline') renderPipeline();
  if (name === 'analytics') renderAnalytics();
  if (name === 'activities') renderActivities();
  if (name === 'tasks') renderTasks();
  if (name === 'settings') renderSettings();
}

// =================== MODALS ===================
function openModal(name, id = null) {
  if (name === 'addLead') {
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = '';
    document.getElementById('leadModalTitle').textContent = id ? 'Edit Lead' : 'Add New Lead';
    populateAssignedDropdown();
    if (id) {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        document.getElementById('leadId').value = lead.id;
        document.getElementById('firstName').value = lead.firstName || '';
        document.getElementById('lastName').value = lead.lastName || '';
        document.getElementById('email').value = lead.email || '';
        document.getElementById('phone').value = lead.phone || '';
        document.getElementById('company').value = lead.company || '';
        document.getElementById('jobTitle').value = lead.jobTitle || '';
        document.getElementById('status').value = lead.status || 'New';
        document.getElementById('priority').value = lead.priority || 'Medium';
        document.getElementById('source').value = lead.source || 'Website';
        document.getElementById('assignedTo').value = lead.assignedTo || '';
        document.getElementById('dealValue').value = lead.dealValue || 0;
        document.getElementById('rating').value = lead.rating || 0;
        document.getElementById('website').value = lead.website || '';
        document.getElementById('industry').value = lead.industry || '';
        document.getElementById('address').value = lead.address || '';
        document.getElementById('city').value = lead.city || '';
        document.getElementById('country').value = lead.country || '';
        document.getElementById('notes').value = lead.notes || '';
        document.getElementById('tags').value = (lead.tags || []).join(', ');
      }
    }
  }
  if (name === 'addTask') {
    document.getElementById('taskForm').reset();
    populateTaskLeadDropdown();
  }
  document.getElementById('modal-' + name).classList.add('active');
}

function closeModal(name) {
  document.getElementById('modal-' + name).classList.remove('active');
}

function populateAssignedDropdown() {
  const sel = document.getElementById('assignedTo');
  sel.innerHTML = '<option value="">Unassigned</option>' + teamMembers.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  const filterAssigned = document.getElementById('filterAssigned');
  filterAssigned.innerHTML = '<option value="">All</option>' + teamMembers.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
}

function populateTaskLeadDropdown() {
  const sel = document.getElementById('taskLead');
  sel.innerHTML = '<option value="">None</option>' + leads.map(l => `<option value="${l.id}">${escapeHtml(l.firstName + ' ' + l.lastName)} - ${escapeHtml(l.company || '')}</option>`).join('');
}

// =================== LEAD CRUD ===================
function saveLead(e) {
  e.preventDefault();
  const id = document.getElementById('leadId').value;
  const tagsRaw = document.getElementById('tags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const data = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    company: document.getElementById('company').value.trim(),
    jobTitle: document.getElementById('jobTitle').value.trim(),
    status: document.getElementById('status').value,
    priority: document.getElementById('priority').value,
    source: document.getElementById('source').value,
    assignedTo: document.getElementById('assignedTo').value,
    dealValue: parseFloat(document.getElementById('dealValue').value) || 0,
    rating: parseInt(document.getElementById('rating').value) || 0,
    website: document.getElementById('website').value.trim(),
    industry: document.getElementById('industry').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    country: document.getElementById('country').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    tags: tags
  };

  if (id) {
    const idx = leads.findIndex(l => l.id === id);
    if (idx >= 0) {
      const old = leads[idx];
      leads[idx] = { ...old, ...data, updated: new Date().toISOString() };
      logActivity(`Updated lead: ${data.firstName} ${data.lastName}`, id);
      showToast('Lead updated successfully!');
    }
  } else {
    const newLead = { id: uid(), ...data, leadNotes: [], created: new Date().toISOString(), updated: new Date().toISOString() };
    leads.unshift(newLead);
    logActivity(`Created new lead: ${data.firstName} ${data.lastName}`, newLead.id);
    showToast('Lead added successfully!');
  }

  saveAll();
  closeModal('addLead');
  renderLeads();
  renderStats();
}

function deleteLead(id) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  const lead = leads.find(l => l.id === id);
  leads = leads.filter(l => l.id !== id);
  if (lead) logActivity(`Deleted lead: ${lead.firstName} ${lead.lastName}`);
  saveAll();
  renderLeads();
  renderStats();
  showToast('Lead deleted', 'info');
}

function viewLead(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  viewingLeadId = id;
  const html = `
    <div class="detail-section">
      <h3 style="margin-bottom:10px;font-size:18px;">${escapeHtml(lead.firstName + ' ' + lead.lastName)}</h3>
      <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></div></div>
      <div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(lead.phone || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Company</div><div class="detail-value">${escapeHtml(lead.company || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Job Title</div><div class="detail-value">${escapeHtml(lead.jobTitle || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Industry</div><div class="detail-value">${escapeHtml(lead.industry || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Website</div><div class="detail-value">${lead.website ? `<a href="${escapeHtml(lead.website)}" target="_blank">${escapeHtml(lead.website)}</a>` : '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value"><span class="badge badge-${lead.status.toLowerCase()}">${escapeHtml(lead.status)}</span></div></div>
      <div class="detail-row"><div class="detail-label">Priority</div><div class="detail-value"><span class="badge badge-${lead.priority.toLowerCase()}">${escapeHtml(lead.priority)}</span></div></div>
      <div class="detail-row"><div class="detail-label">Source</div><div class="detail-value">${escapeHtml(lead.source || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Assigned To</div><div class="detail-value">${escapeHtml(lead.assignedTo || 'Unassigned')}</div></div>
      <div class="detail-row"><div class="detail-label">Deal Value</div><div class="detail-value"><strong>${fmtMoney(lead.dealValue)}</strong></div></div>
      <div class="detail-row"><div class="detail-label">Rating</div><div class="detail-value">${lead.rating ? '⭐'.repeat(lead.rating) : 'Not rated'}</div></div>
      <div class="detail-row"><div class="detail-label">Address</div><div class="detail-value">${escapeHtml([lead.address, lead.city, lead.country].filter(Boolean).join(', ') || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Tags</div><div class="detail-value">${(lead.tags || []).map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join(' ') || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Notes</div><div class="detail-value">${escapeHtml(lead.notes || '-')}</div></div>
      <div class="detail-row"><div class="detail-label">Created</div><div class="detail-value">${fmtDateTime(lead.created)}</div></div>
      <div class="detail-row"><div class="detail-label">Last Updated</div><div class="detail-value">${fmtDateTime(lead.updated)}</div></div>
    </div>
  `;
  document.getElementById('leadDetails').innerHTML = html;
  renderLeadNotes();
  openModal('viewLead');
}

function renderLeadNotes() {
  const lead = leads.find(l => l.id === viewingLeadId);
  if (!lead) return;
  const notes = lead.leadNotes || [];
  document.getElementById('leadNotes').innerHTML = notes.length === 0
    ? '<div style="color:#9ca3af;font-size:13px;padding:10px;">No notes yet</div>'
    : notes.map(n => `<div class="note-item"><div class="note-time">${fmtDateTime(n.time)}</div>${escapeHtml(n.text)}</div>`).join('');
}

function addNoteToLead() {
  const text = document.getElementById('newNote').value.trim();
  if (!text || !viewingLeadId) return;
  const lead = leads.find(l => l.id === viewingLeadId);
  if (!lead) return;
  if (!lead.leadNotes) lead.leadNotes = [];
  lead.leadNotes.unshift({ id: uid(), text, time: new Date().toISOString() });
  lead.updated = new Date().toISOString();
  logActivity(`Added note to ${lead.firstName} ${lead.lastName}`, lead.id);
  saveAll();
  document.getElementById('newNote').value = '';
  renderLeadNotes();
}

// =================== RENDERING ===================
function getFilteredLeads() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const source = document.getElementById('filterSource').value;
  const assigned = document.getElementById('filterAssigned').value;
  const sortBy = document.getElementById('sortBy').value;

  let filtered = leads.filter(l => {
    if (status && l.status !== status) return false;
    if (priority && l.priority !== priority) return false;
    if (source && l.source !== source) return false;
    if (assigned && l.assignedTo !== assigned) return false;
    if (search) {
      const text = `${l.firstName} ${l.lastName} ${l.email} ${l.phone} ${l.company} ${l.jobTitle} ${(l.tags || []).join(' ')}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });

  const [field, dir] = sortBy.split('-');
  filtered.sort((a, b) => {
    let av, bv;
    if (field === 'name') { av = (a.firstName + a.lastName).toLowerCase(); bv = (b.firstName + b.lastName).toLowerCase(); }
    else if (field === 'value') { av = a.dealValue || 0; bv = b.dealValue || 0; }
    else if (field === 'rating') { av = a.rating || 0; bv = b.rating || 0; }
    else { av = a.created; bv = b.created; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

function renderLeads() {
  const filtered = getFilteredLeads();
  document.getElementById('leadCount').textContent = `${filtered.length} of ${leads.length} leads`;
  const tbody = document.getElementById('leadsBody');

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="icon">📭</div><div>No leads found. ${leads.length === 0 ? 'Click "Add Lead" to get started!' : 'Try adjusting your filters.'}</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td><input type="checkbox" ${selectedLeads.has(l.id) ? 'checked' : ''} onchange="toggleLeadSelect('${l.id}')"></td>
      <td><strong>${escapeHtml(l.firstName + ' ' + l.lastName)}</strong>${l.jobTitle ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(l.jobTitle)}</div>` : ''}</td>
      <td><div style="font-size:12px;">${escapeHtml(l.email)}</div>${l.phone ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(l.phone)}</div>` : ''}</td>
      <td>${escapeHtml(l.company || '-')}</td>
      <td><span class="badge badge-${l.status.toLowerCase()}">${escapeHtml(l.status)}</span></td>
      <td><span class="badge badge-${l.priority.toLowerCase()}">${escapeHtml(l.priority)}</span></td>
      <td>${escapeHtml(l.source || '-')}</td>
      <td><strong>${fmtMoney(l.dealValue)}</strong></td>
      <td><span class="rating">${l.rating ? '⭐'.repeat(l.rating) : '-'}</span></td>
      <td>${escapeHtml(l.assignedTo || '-')}</td>
      <td style="font-size:12px;">${fmtDate(l.created)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-info btn-sm" onclick="viewLead('${l.id}')">👁️</button>
          <button class="btn btn-warning btn-sm" onclick="openModal('addLead','${l.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLead('${l.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderStats() {
  const total = leads.length;
  const newCount = leads.filter(l => l.status === 'New').length;
  const contactedCount = leads.filter(l => l.status === 'Contacted').length;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length;
  const wonCount = leads.filter(l => l.status === 'Won').length;
  const lostCount = leads.filter(l => l.status === 'Lost').length;
  const totalValue = leads.reduce((s, l) => s + (l.dealValue || 0), 0);
  const wonValue = leads.filter(l => l.status === 'Won').reduce((s, l) => s + (l.dealValue || 0), 0);

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card total"><div class="label">Total Leads</div><div class="value">${total}</div><div class="sub">All leads in system</div></div>
    <div class="stat-card new"><div class="label">New</div><div class="value">${newCount}</div><div class="sub">Awaiting contact</div></div>
    <div class="stat-card contacted"><div class="label">Contacted</div><div class="value">${contactedCount}</div><div class="sub">In conversation</div></div>
    <div class="stat-card qualified"><div class="label">Qualified</div><div class="value">${qualifiedCount}</div><div class="sub">Sales ready</div></div>
    <div class="stat-card won"><div class="label">Won</div><div class="value">${wonCount}</div><div class="sub">${fmtMoney(wonValue)}</div></div>
    <div class="stat-card lost"><div class="label">Lost</div><div class="value">${lostCount}</div><div class="sub">Closed lost</div></div>
  `;
}

// =================== PIPELINE ===================
function renderPipeline() {
  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
  const colors = { New: '#3b82f6', Contacted: '#f59e0b', Qualified: '#8b5cf6', Proposal: '#ec4899', Won: '#10b981', Lost: '#ef4444' };
  const board = document.getElementById('pipelineBoard');
  board.innerHTML = stages.map(stage => {
    const stageLeads = leads.filter(l => l.status === stage);
    const stageValue = stageLeads.reduce((s, l) => s + (l.dealValue || 0), 0);
    return `
      <div class="pipeline-col" ondragover="event.preventDefault()" ondrop="dropLead(event,'${stage}')">
        <h3 style="border-color:${colors[stage]};color:${colors[stage]};">${stage}<span class="count">${stageLeads.length}</span></h3>
        <div style="font-size:11px;color:#6b7280;margin-bottom:10px;">${fmtMoney(stageValue)}</div>
        ${stageLeads.map(l => `
          <div class="pipeline-card" draggable="true" ondragstart="dragLead(event,'${l.id}')" onclick="viewLead('${l.id}')" style="border-left-color:${colors[stage]};">
            <div class="name">${escapeHtml(l.firstName + ' ' + l.lastName)}</div>
            <div class="company">${escapeHtml(l.company || 'No company')}</div>
            <div class="value">${fmtMoney(l.dealValue)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function dragLead(e, id) { e.dataTransfer.setData('leadId', id); }
function dropLead(e, status) {
  e.preventDefault();
  const id = e.dataTransfer.getData('leadId');
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  const oldStatus = lead.status;
  lead.status = status;
  lead.updated = new Date().toISOString();
  logActivity(`Moved ${lead.firstName} ${lead.lastName} from ${oldStatus} to ${status}`, id);
  saveAll();
  renderPipeline();
  renderStats();
  renderLeads();
  showToast(`Moved to ${status}`);
}

// =================== ANALYTICS ===================
function renderAnalytics() {
  const statusCounts = {};
  const sourceCounts = {};
  const priorityCounts = {};
  const statusValue = {};
  ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].forEach(s => { statusCounts[s] = 0; statusValue[s] = 0; });

  leads.forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    sourceCounts[l.source || 'Unknown'] = (sourceCounts[l.source || 'Unknown'] || 0) + 1;
    priorityCounts[l.priority] = (priorityCounts[l.priority] || 0) + 1;
    statusValue[l.status] = (statusValue[l.status] || 0) + (l.dealValue || 0);
  });

  document.getElementById('chartStatus').innerHTML = renderBars(statusCounts);
  document.getElementById('chartSource').innerHTML = renderBars(sourceCounts);
  document.getElementById('chartPriority').innerHTML = renderBars(priorityCounts);
  document.getElementById('chartRevenue').innerHTML = renderBars(statusValue, true);

  // KPIs
  const total = leads.length;
  const won = leads.filter(l => l.status === 'Won').length;
  const lost = leads.filter(l => l.status === 'Lost').length;
  const closed = won + lost;
  const conversionRate = closed > 0 ? ((won / closed) * 100).toFixed(1) : 0;
  const avgValue = total > 0 ? leads.reduce((s, l) => s + (l.dealValue || 0), 0) / total : 0;
  const wonValue = leads.filter(l => l.status === 'Won').reduce((s, l) => s + (l.dealValue || 0), 0);
  const pipelineValue = leads.filter(l => !['Won', 'Lost'].includes(l.status)).reduce((s, l) => s + (l.dealValue || 0), 0);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="stat-card total"><div class="label">Conversion Rate</div><div class="value">${conversionRate}%</div><div class="sub">Won / Closed</div></div>
    <div class="stat-card won"><div class="label">Total Won</div><div class="value">${fmtMoney(wonValue)}</div><div class="sub">Closed deals</div></div>
    <div class="stat-card qualified"><div class="label">Pipeline Value</div><div class="value">${fmtMoney(pipelineValue)}</div><div class="sub">Open opportunities</div></div>
    <div class="stat-card new"><div class="label">Avg Deal Size</div><div class="value">${fmtMoney(avgValue)}</div><div class="sub">Per lead</div></div>
  `;

  // Top leads
  const top = [...leads].sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0)).slice(0, 10);
  document.getElementById('topLeadsBody').innerHTML = top.length === 0
    ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af;">No leads to display</td></tr>'
    : top.map((l, i) => `<tr><td><strong>#${i + 1}</strong></td><td>${escapeHtml(l.firstName + ' ' + l.lastName)}</td><td>${escapeHtml(l.company || '-')}</td><td><strong>${fmtMoney(l.dealValue)}</strong></td><td><span class="badge badge-${l.status.toLowerCase()}">${escapeHtml(l.status)}</span></td></tr>`).join('');
}

function renderBars(data, isMoney = false) {
  const entries = Object.entries(data).filter(([k, v]) => v > 0);
  if (entries.length === 0) return '<div style="color:#9ca3af;padding:20px;text-align:center;">No data</div>';
  const max = Math.max(...entries.map(([k, v]) => v));
  return entries.map(([k, v]) => `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(v / max) * 100}%"></div></div>
      <div class="bar-value">${isMoney ? fmtMoney(v) : v}</div>
    </div>
  `).join('');
}

// =================== ACTIVITIES ===================
function renderActivities() {
  const list = document.getElementById('activityList');
  if (activities.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">📋</div><div>No activities yet</div></div>';
    return;
  }
  list.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="time">${fmtDateTime(a.time)}</div>
      <div class="desc">${escapeHtml(a.text)}</div>
    </div>
  `).join('');
}

function clearActivities() {
  if (!confirm('Clear all activity log?')) return;
  activities = [];
  saveAll();
  renderActivities();
  showToast('Activity log cleared', 'info');
}

// =================== TASKS ===================
function saveTask(e) {
  e.preventDefault();
  const task = {
    id: uid(),
    title: document.getElementById('taskTitle').value.trim(),
    date: document.getElementById('taskDate').value,
    leadId: document.getElementById('taskLead').value,
    desc: document.getElementById('taskDesc').value.trim(),
    completed: false,
    created: new Date().toISOString()
  };
  tasks.unshift(task);
  saveAll();
  closeModal('addTask');
  renderTasks();
  showToast('Task created!');
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; saveAll(); renderTasks(); }
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveAll();
  renderTasks();
}

function renderTasks() {
  const filter = document.getElementById('taskFilter').value;
  const today = new Date().toISOString().split('T')[0];
  let filtered = tasks;
  if (filter === 'pending') filtered = tasks.filter(t => !t.completed);
  if (filter === 'completed') filtered = tasks.filter(t => t.completed);
  if (filter === 'overdue') filtered = tasks.filter(t => !t.completed && t.date && t.date < today);

  const list = document.getElementById('tasksList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">✅</div><div>No tasks here</div></div>';
    return;
  }
  list.innerHTML = filtered.map(t => {
    const lead = leads.find(l => l.id === t.leadId);
    const overdue = t.date && t.date < today && !t.completed;
    return `
      <div style="background:${t.completed ? '#f0fdf4' : overdue ? '#fef2f2' : '#f9fafb'};padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid ${t.completed ? '#10b981' : overdue ? '#ef4444' : '#667eea'};">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')" style="margin-top:4px;width:auto;">
          <div style="flex:1;">
            <div style="font-weight:600;${t.completed ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${escapeHtml(t.title)}</div>
            ${t.desc ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${escapeHtml(t.desc)}</div>` : ''}
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">
              ${t.date ? `📅 ${fmtDate(t.date)}` : ''}
              ${lead ? ` • 👤 <a href="javascript:viewLead('${lead.id}')">${escapeHtml(lead.firstName + ' ' + lead.lastName)}</a>` : ''}
              ${overdue ? ' • <strong style="color:#ef4444;">OVERDUE</strong>' : ''}
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// =================== SETTINGS ===================
function addTeamMember() {
  const input = document.getElementById('newTeamMember');
  const name = input.value.trim();
  if (!name) return;
  if (teamMembers.includes(name)) { showToast('Already exists', 'error'); return; }
  teamMembers.push(name);
  saveAll();
  input.value = '';
  renderSettings();
  populateAssignedDropdown();
  showToast('Team member added');
}

function removeTeamMember(name) {
  teamMembers = teamMembers.filter(m => m !== name);
  saveAll();
  renderSettings();
  populateAssignedDropdown();
}

function addGlobalTag() {
  const input = document.getElementById('newTag');
  const tag = input.value.trim();
  if (!tag) return;
  if (globalTags.includes(tag)) { showToast('Already exists', 'error'); return; }
  globalTags.push(tag);
  saveAll();
  input.value = '';
  renderSettings();
}

function removeGlobalTag(tag) {
  globalTags = globalTags.filter(t => t !== tag);
  saveAll();
  renderSettings();
}

function renderSettings() {
  document.getElementById('teamList').innerHTML = teamMembers.map(m => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:white;border-radius:6px;margin-bottom:5px;">
      <span>${escapeHtml(m)}</span>
      <button class="btn btn-danger btn-sm" onclick="removeTeamMember('${escapeHtml(m)}')">×</button>
    </div>
  `).join('') || '<div style="color:#9ca3af;font-size:13px;">No team members</div>';

  document.getElementById('tagsList').innerHTML = globalTags.map(t => `
    <span class="tag-chip">${escapeHtml(t)} <span onclick="removeGlobalTag('${escapeHtml(t)}')">×</span></span>
  `).join('') || '<div style="color:#9ca3af;font-size:13px;">No tags</div>';

  const totalValue = leads.reduce((s, l) => s + (l.dealValue || 0), 0);
  document.getElementById('settingsStats').innerHTML = `
    📊 Total Leads: <strong>${leads.length}</strong><br>
    💰 Total Pipeline Value: <strong>${fmtMoney(totalValue)}</strong><br>
    ✅ Total Tasks: <strong>${tasks.length}</strong><br>
    📋 Activities Logged: <strong>${activities.length}</strong><br>
    👥 Team Members: <strong>${teamMembers.length}</strong><br>
    🏷️ Tags Available: <strong>${globalTags.length}</strong>
  `;
}

// =================== BULK ACTIONS ===================
function toggleLeadSelect(id) {
  if (selectedLeads.has(id)) selectedLeads.delete(id);
  else selectedLeads.add(id);
  updateBulkBar();
}

function toggleSelectAll() {
  const checked = document.getElementById('selectAll').checked;
  const filtered = getFilteredLeads();
  if (checked) filtered.forEach(l => selectedLeads.add(l.id));
  else filtered.forEach(l => selectedLeads.delete(l.id));
  renderLeads();
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  document.getElementById('selectedCount').textContent = selectedLeads.size;
  bar.classList.toggle('show', selectedLeads.size > 0);
}

function clearSelection() {
  selectedLeads.clear();
  renderLeads();
  updateBulkBar();
}

function bulkUpdateStatus() {
  const status = document.getElementById('bulkStatus').value;
  if (!status) return;
  let count = 0;
  selectedLeads.forEach(id => {
    const lead = leads.find(l => l.id === id);
    if (lead) { lead.status = status; lead.updated = new Date().toISOString(); count++; }
  });
  logActivity(`Bulk updated ${count} leads to ${status}`);
  saveAll();
  clearSelection();
  renderLeads();
  renderStats();
  showToast(`Updated ${count} leads`);
}

function bulkDelete() {
  if (!confirm(`Delete ${selectedLeads.size} selected leads?`)) return;
  const count = selectedLeads.size;
  leads = leads.filter(l => !selectedLeads.has(l.id));
  logActivity(`Bulk deleted ${count} leads`);
  saveAll();
  clearSelection();
  renderLeads();
  renderStats();
  showToast(`Deleted ${count} leads`, 'info');
}

// =================== IMPORT/EXPORT ===================
function exportCSV() {
  if (leads.length === 0) { showToast('No data to export', 'error'); return; }
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title', 'Status', 'Priority', 'Source', 'Assigned To', 'Deal Value', 'Rating', 'Industry', 'Website', 'Address', 'City', 'Country', 'Tags', 'Notes', 'Created'];
  const rows = leads.map(l => [l.firstName, l.lastName, l.email, l.phone, l.company, l.jobTitle, l.status, l.priority, l.source, l.assignedTo, l.dealValue, l.rating, l.industry, l.website, l.address, l.city, l.country, (l.tags || []).join('|'), l.notes, l.created]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully!');
}

function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { showToast('CSV is empty', 'error'); return; }
    const parseCSVLine = (line) => {
      const result = []; let cur = ''; let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; }
        else cur += ch;
      }
      result.push(cur); return result;
    };
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    let added = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const get = (name) => { const idx = headers.indexOf(name.toLowerCase()); return idx >= 0 ? cols[idx] : ''; };
      const lead = {
        id: uid(),
        firstName: get('first name') || get('firstname') || '',
        lastName: get('last name') || get('lastname') || '',
        email: get('email') || '',
        phone: get('phone') || '',
        company: get('company') || '',
        jobTitle: get('job title') || get('jobtitle') || '',
        status: get('status') || 'New',
        priority: get('priority') || 'Medium',
        source: get('source') || 'Other',
        assignedTo: get('assigned to') || get('assignedto') || '',
        dealValue: parseFloat(get('deal value') || get('dealvalue') || 0) || 0,
        rating: parseInt(get('rating')) || 0,
        industry: get('industry') || '',
        website: get('website') || '',
        address: get('address') || '',
        city: get('city') || '',
        country: get('country') || '',
        tags: (get('tags') || '').split('|').map(t => t.trim()).filter(Boolean),
        notes: get('notes') || '',
        leadNotes: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      if (lead.firstName || lead.email) { leads.unshift(lead); added++; }
    }
    logActivity(`Imported ${added} leads from CSV`);
    saveAll();
    renderLeads();
    renderStats();
    showToast(`Imported ${added} leads!`);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function exportJSON() {
  const data = { leads, activities, tasks, teamMembers, globalTags, exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `lms_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported!');
}

function importJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('This will replace all current data. Continue?')) return;
      leads = data.leads || [];
      activities = data.activities || [];
      tasks = data.tasks || [];
      teamMembers = data.teamMembers || teamMembers;
      globalTags = data.globalTags || globalTags;
      saveAll();
      renderLeads();
      renderStats();
      populateAssignedDropdown();
      showToast('Backup restored successfully!');
    } catch (err) {
      showToast('Invalid backup file', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function confirmClearAll() {
  if (!confirm('⚠️ This will delete ALL leads, tasks, and activities. Are you sure?')) return;
  if (!confirm('This action cannot be undone. Confirm once more?')) return;
  leads = []; activities = []; tasks = [];
  saveAll();
  renderLeads();
  renderStats();
  showToast('All data cleared', 'info');
}

// =================== SAMPLE DATA ===================
function loadSampleData() {
  if (leads.length > 0) return;
  const samples = [
    { firstName: 'Aarav', lastName: 'Patel', email: 'aarav.p@techcorp.in', phone: '+91-98765-10101', company: 'TechCorp India', jobTitle: 'CTO', status: 'Qualified', priority: 'High', source: 'Referral', assignedTo: 'Rohan Sharma', dealValue: 2500000, rating: 5, industry: 'Technology', city: 'Mumbai', country: 'India', tags: ['Enterprise', 'VIP'], notes: 'Very interested in our enterprise plan' },
    { firstName: 'Vihaan', lastName: 'Desai', email: 'vdesai@globalfinance.in', phone: '+91-98765-10102', company: 'Global Finance India', jobTitle: 'VP Sales', status: 'Proposal', priority: 'High', source: 'Website', assignedTo: 'Aditi Verma', dealValue: 4500000, rating: 4, industry: 'Finance', city: 'Delhi', country: 'India', tags: ['Hot Lead'], notes: 'Reviewing proposal, decision by month end' },
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya@innovatech.in', phone: '+91-98765-43210', company: 'InnovaTech', jobTitle: 'Founder', status: 'New', priority: 'Medium', source: 'Social Media', assignedTo: 'Karan Singh', dealValue: 1200000, rating: 3, industry: 'SaaS', city: 'Bangalore', country: 'India', tags: ['Startup'], notes: 'Inbound lead from LinkedIn' },
    { firstName: 'Diya', lastName: 'Reddy', email: 'diya.r@retailmax.in', phone: '+91-98765-10104', company: 'RetailMax India', jobTitle: 'Operations Manager', status: 'Contacted', priority: 'Medium', source: 'Email Campaign', assignedTo: 'Rohan Sharma', dealValue: 1800000, rating: 4, industry: 'Retail', city: 'Chennai', country: 'India', tags: ['Follow-up'], notes: 'Initial call done, sending case studies' },
    { firstName: 'Arjun', lastName: 'Nair', email: 'arjun@healthplus.in', phone: '+91-98765-10105', company: 'HealthPlus', jobTitle: 'Director', status: 'Won', priority: 'High', source: 'Trade Show', assignedTo: 'Aditi Verma', dealValue: 6700000, rating: 5, industry: 'Healthcare', city: 'Hyderabad', country: 'India', tags: ['Enterprise', 'VIP'], notes: 'Closed! Contract signed last week' },
    { firstName: 'Kabir', lastName: 'Mehta', email: 'kabir@logistica.in', phone: '+91-98765-10106', company: 'Logistica India', jobTitle: 'CEO', status: 'Lost', priority: 'Low', source: 'Cold Call', assignedTo: 'Karan Singh', dealValue: 800000, rating: 2, industry: 'Logistics', city: 'Pune', country: 'India', tags: [], notes: 'Went with competitor due to pricing' },
    { firstName: 'Aisha', lastName: 'Patel', email: 'aisha@edutech.in', phone: '+91-98765-10107', company: 'EduTech Solutions', jobTitle: 'Product Manager', status: 'Qualified', priority: 'High', source: 'Website', assignedTo: 'Rohan Sharma', dealValue: 3200000, rating: 4, industry: 'Education', city: 'Ahmedabad', country: 'India', tags: ['Hot Lead'], notes: 'Demo scheduled for next week' },
    { firstName: 'Rishi', lastName: 'Gupta', email: 'rishi@constructpro.in', phone: '+91-98765-10108', company: 'ConstructPro India', jobTitle: 'Manager', status: 'New', priority: 'Low', source: 'Advertisement', assignedTo: '', dealValue: 550000, rating: 2, industry: 'Construction', city: 'Kolkata', country: 'India', tags: [], notes: 'Just signed up for newsletter' }
  ];
  samples.forEach(s => {
    leads.push({ id: uid(), ...s, leadNotes: [], created: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(), updated: new Date().toISOString() });
  });
  activities.unshift({ id: uid(), text: 'Sample data loaded', leadId: null, time: new Date().toISOString() });
  saveAll();
}

// =================== SORT ===================
function sortTable(field) {
  const map = { name: 'name', status: 'name', value: 'value' };
  const sortBy = document.getElementById('sortBy');
  if (field === 'name') sortBy.value = sortBy.value === 'name-asc' ? 'name-desc' : 'name-asc';
  if (field === 'value') sortBy.value = sortBy.value === 'value-desc' ? 'value-asc' : 'value-desc';
  renderLeads();
}

// =================== INIT ===================
window.addEventListener('DOMContentLoaded', () => {
  if (leads.length === 0) loadSampleData();
  populateAssignedDropdown();
  renderStats();
  renderLeads();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openModal('addLead'); }
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(o => o.classList.remove('active'));
  });
});