// Administrator Console Logic
let currentAdminId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.get('api/me');
    const isStatic = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
    if (!isStatic && me.role !== 'ADMIN') {
      window.location.href = 'admin-login.html';
      return;
    }
    currentAdminId = me.id;
    document.getElementById('who').textContent = 'Administrator';

    loadAdminStats();
    loadAdminUsers();
    loadAdminAnalyses();
    loadAdminDomains();
    loadAdminAuditLogs();
  } catch (err) {
    console.error('Admin session failed:', err);
    window.location.href = 'admin-login.html';
  }
});

function switchAdminTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.dash-nav a').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.style.display = 'block';

  const link = document.querySelector(`.dash-nav a[href="#${tabId}"]`);
  if (link) link.classList.add('active');
}

// 1. STATS
async function loadAdminStats() {
  try {
    const s = await API.get('api/admin/stats');
    const companies = (s && s.totalCompanies !== undefined) ? s.totalCompanies : 0;
    const freelancers = (s && s.totalFreelancers !== undefined) ? s.totalFreelancers : 0;
    const totalUsers = companies + freelancers;

    if (document.getElementById('adm-total-users')) document.getElementById('adm-total-users').textContent = totalUsers;
    if (document.getElementById('adm-companies')) document.getElementById('adm-companies').textContent = companies;
    if (document.getElementById('adm-freelancers')) document.getElementById('adm-freelancers').textContent = freelancers;
    if (document.getElementById('adm-jobs')) document.getElementById('adm-jobs').textContent = s.totalPublishedJobs ?? 0;
    if (document.getElementById('adm-apps')) document.getElementById('adm-apps').textContent = s.totalApplications ?? 0;
    if (document.getElementById('adm-analyses')) document.getElementById('adm-analyses').textContent = s.totalAnalyses ?? 0;
    if (document.getElementById('adm-high-risks')) document.getElementById('adm-high-risks').textContent = s.highSeverityCount ?? 0;
    if (document.getElementById('adm-med-risks')) document.getElementById('adm-med-risks').textContent = s.mediumSeverityCount ?? 0;
    if (document.getElementById('adm-active-users')) document.getElementById('adm-active-users').textContent = totalUsers;
    if (document.getElementById('adm-active-proj')) document.getElementById('adm-active-proj').textContent = s.activeProjects ?? 0;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// 2. USER MANAGEMENT
async function loadAdminUsers() {
  const tbody = document.getElementById('users-tbody');
  try {
    const users = await API.get('api/admin/users');
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td>
          <strong>${escapeHtml(u.name || 'User')}</strong>
          <span class="tag ${u.role === 'COMPANY' ? 'lo' : 'md'}" style="margin-left:6px;">${u.role}</span>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td style="max-width:240px; font-size:13px; color:var(--text-muted);">${escapeHtml(u.details || '')}</td>
        <td>
          <span class="tag ${u.status === 'ACTIVE' ? 'lo' : 'hi'}">${u.status}</span>
        </td>
        <td>
          ${u.status === 'ACTIVE' ? `
            <button class="btn btn-line btn-sm" style="color:var(--red);" onclick="setUserStatus(${u.id}, 'SUSPENDED')">Suspend</button>
          ` : `
            <button class="btn btn-green btn-sm" onclick="setUserStatus(${u.id}, 'ACTIVE')">Activate</button>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

async function setUserStatus(userId, status) {
  try {
    await API.post('api/admin/user-status', { userId, status });
    showToast(`User status updated to ${status}`);
    loadAdminUsers();
    loadAdminAuditLogs();
  } catch (err) {
    showToast(err.message, true);
  }
}

// 3. AGREEMENT ANALYSIS ARCHIVE
async function loadAdminAnalyses(search = '') {
  const tbody = document.getElementById('analyses-tbody');
  try {
    const list = await API.get(`api/admin/analyses?search=${encodeURIComponent(search)}`);
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text-muted);">No analysis reports in archive.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(a => `
      <tr>
        <td>#${a.id}</td>
        <td><strong>${escapeHtml(a.originalFilename)}</strong></td>
        <td>${escapeHtml(a.freelancerName || 'Freelancer')}</td>
        <td>${escapeHtml(a.companyName || 'Drafting Client')}</td>
        <td>
          <span class="tag hi">${a.highCount} High</span>
          <span class="tag md">${a.mediumCount} Med</span>
          <span class="tag lo">${a.lowCount} Low</span>
        </td>
        <td><small>${a.policyVersion}</small></td>
        <td><small>${a.createdAt.substring(0, 10)}</small></td>
        <td>
          <button class="btn btn-line btn-sm" onclick="viewAnalysisDetail(${a.id})">View Findings &rarr;</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

function searchAnalyses() {
  const val = document.getElementById('adm-search-input').value;
  loadAdminAnalyses(val);
}

async function viewAnalysisDetail(id) {
  try {
    const d = await API.get(`api/analyses/detail?id=${id}`);
    document.getElementById('adm-modal-title').textContent = `Analysis #${d.id} — ${d.originalFilename}`;
    document.getElementById('adm-modal-sub').textContent = `Freelancer: ${d.freelancerName} | Company: ${d.companyName || 'Private'} | Date: ${d.createdAt}`;

    const container = document.getElementById('adm-modal-findings');
    container.innerHTML = (d.findings || []).map(f => `
      <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--r-sm); padding:14px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong>${escapeHtml(f.title)}</strong>
          <span class="tag ${f.severity === 'HIGH' ? 'hi' : f.severity === 'MEDIUM' ? 'md' : 'lo'}">${f.severity}</span>
        </div>
        <p style="font-size:13px; color:var(--text-muted); font-style:italic; margin-bottom:6px;">"${escapeHtml(f.exactQuote || '')}"</p>
        <p style="font-size:13px;">${escapeHtml(f.simpleExplanation)}</p>
      </div>
    `).join('');

    document.getElementById('adm-modal').classList.add('open');
  } catch (err) {
    showToast(err.message, true);
  }
}
function closeAdminModal() { document.getElementById('adm-modal').classList.remove('open'); }

// 4. DOMAIN TEMPLATES
async function loadAdminDomains() {
  const list = document.getElementById('domain-list');
  try {
    const domains = await API.get('api/admin/domains');
    list.innerHTML = domains.map(d => `
      <li style="padding:10px 14px; background:#F8FAFB; border:1px solid var(--border); border-radius:var(--r-sm); display:flex; justify-content:space-between; align-items:center;">
        <strong>${escapeHtml(d)}</strong>
        <span class="tag lo">Active</span>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = `<li style="color:var(--red);">Error: ${err.message}</li>`;
  }
}

async function addDomain() {
  const input = document.getElementById('new-domain-input');
  const name = input.value.trim();
  if (!name) return;

  try {
    await API.post('api/admin/domains', { name });
    input.value = '';
    showToast('Domain template added!');
    loadAdminDomains();
  } catch (err) {
    showToast(err.message, true);
  }
}

// 5. AUDIT LOGS
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('audit-tbody');
  try {
    const logs = await API.get('api/admin/audit-logs');
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">No audit logs recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>#${l.id}</td>
        <td><small>${l.createdAt}</small></td>
        <td><code>${escapeHtml(l.action)}</code></td>
        <td style="max-width:280px; font-size:13px;">${escapeHtml(l.details || '')}</td>
        <td><small>${escapeHtml(l.actorEmail || 'System')} (${l.actorRole || 'SYS'})</small></td>
        <td><small style="color:var(--text-muted);">${escapeHtml(l.ipAddress || '127.0.0.1')}</small></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
