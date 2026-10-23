// Policy Builder & Rules Engine Controller
(function() {
  const STORAGE_KEY = 'clauselens_freelancer_policies';

  const DEFAULT_POLICIES = [
    { id: 1, name: 'Payment Delay Window', category: 'Payment Terms', standard: 'Maximum 15 calendar days (Net-15)', severity: 'HIGH', enabled: true },
    { id: 2, name: 'Advance Deposit Minimum', category: 'Payment Terms', standard: 'Minimum 30% advance deposit', severity: 'HIGH', enabled: true },
    { id: 3, name: 'Complimentary Revisions Cap', category: 'Revision Limits', standard: 'Maximum 2 revision rounds per milestone', severity: 'CRITICAL', enabled: true },
    { id: 4, name: 'IP Ownership Transfer Trigger', category: 'Intellectual Property', standard: 'Ownership transfers strictly upon full payment', severity: 'CRITICAL', enabled: true },
    { id: 5, name: 'Mutual Liability Cap', category: 'Liability', standard: 'Liability capped at total contract fee', severity: 'HIGH', enabled: true },
    { id: 6, name: 'Termination Notice & Kill Fee', category: 'Termination', standard: '14 days written notice + pro-rata pay', severity: 'MEDIUM', enabled: true },
    { id: 7, name: 'Warranty & Bug Fix Grace Period', category: 'Project Scope', standard: '14 calendar days post-delivery', severity: 'LOW', enabled: true }
  ];

  let policies = [];

  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('api/me', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Not logged in');
      const me = await res.json();
      if (me.role !== 'FREELANCER') {
        window.location.href = 'freelancer-login.html';
        return;
      }
    } catch (e) {
      window.location.href = 'freelancer-login.html';
      return;
    }
    loadPolicies();
  });

  function loadPolicies() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        policies = JSON.parse(saved);
      } catch (e) {
        policies = [...DEFAULT_POLICIES];
      }
    } else {
      policies = [...DEFAULT_POLICIES];
      saveToStorage();
    }
    renderTable();
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('rules-tbody');
    const count = document.getElementById('rule-count');
    if (!tbody) return;

    if (count) count.textContent = policies.length;

    if (policies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No policies configured yet. Click a template above or add a custom rule.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    policies.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const sevClass = p.severity === 'CRITICAL' ? 'critical' : (p.severity === 'HIGH' ? 'hi' : (p.severity === 'MEDIUM' ? 'md' : 'lo'));
      tr.innerHTML = `
        <td>
          <label class="toggle-switch">
            <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="togglePolicy(${idx})">
            <span class="slider"></span>
          </label>
        </td>
        <td><strong>${escapeHtml(p.category)}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td><code style="background:#FAF8FF; padding:3px 8px; border-radius:4px; color:var(--primary);">${escapeHtml(p.standard)}</code></td>
        <td><span class="tag ${sevClass}">${p.severity}</span></td>
        <td style="text-align:right;">
          <button class="btn btn-line btn-sm" onclick="editPolicy(${idx})" style="padding:4px 10px; font-size:12px; margin-right:4px;">Edit</button>
          <button class="btn btn-line btn-sm" onclick="deletePolicy(${idx})" style="padding:4px 10px; font-size:12px; color:var(--danger); border-color:#FECACA;">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.handleSavePolicy = function(e) {
    e.preventDefault();
    const idField = document.getElementById('policy-id').value;
    const name = document.getElementById('policy-name').value.trim();
    const category = document.getElementById('policy-category').value;
    const standard = document.getElementById('policy-standard').value.trim();
    const severity = document.getElementById('policy-severity').value;
    const enabled = document.getElementById('policy-enabled').checked;

    if (!name || !standard) {
      alert('Please fill out all required fields.');
      return;
    }

    if (idField !== '') {
      const idx = parseInt(idField);
      policies[idx] = { ...policies[idx], name, category, standard, severity, enabled };
    } else {
      policies.push({
        id: Date.now(),
        name,
        category,
        standard,
        severity,
        enabled
      });
    }

    saveToStorage();
    resetForm();
    if (window.showToast) showToast('Policy rule saved successfully!');
  };

  window.togglePolicy = function(idx) {
    if (policies[idx]) {
      policies[idx].enabled = !policies[idx].enabled;
      saveToStorage();
    }
  };

  window.editPolicy = function(idx) {
    const p = policies[idx];
    if (!p) return;

    document.getElementById('policy-id').value = idx;
    document.getElementById('policy-name').value = p.name;
    document.getElementById('policy-category').value = p.category;
    document.getElementById('policy-standard').value = p.standard;
    document.getElementById('policy-severity').value = p.severity;
    document.getElementById('policy-enabled').checked = p.enabled;

    document.getElementById('policy-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.deletePolicy = function(idx) {
    if (confirm('Are you sure you want to delete this policy rule?')) {
      policies.splice(idx, 1);
      saveToStorage();
      if (window.showToast) showToast('Policy deleted.');
    }
  };

  window.resetForm = function() {
    document.getElementById('policy-id').value = '';
    document.getElementById('policy-name').value = '';
    document.getElementById('policy-standard').value = '';
    document.getElementById('policy-severity').value = 'HIGH';
    document.getElementById('policy-enabled').checked = true;
  };

  window.applyTemplate = function(type) {
    if (type === 'standard') {
      policies = [...DEFAULT_POLICIES];
    } else if (type === 'strict') {
      policies = [
        { id: 101, name: 'Net-7 Rapid Payment', category: 'Payment Terms', standard: 'Maximum 7 calendar days', severity: 'CRITICAL', enabled: true },
        { id: 102, name: '50% Retainer Advance', category: 'Payment Terms', standard: 'Minimum 50% upfront payment', severity: 'CRITICAL', enabled: true },
        { id: 103, name: 'Strict Single Revision', category: 'Revision Limits', standard: '1 revision round included', severity: 'HIGH', enabled: true },
        { id: 104, name: 'Mandatory Kill Fee', category: 'Termination', standard: '50% project kill fee if canceled early', severity: 'HIGH', enabled: true },
        { id: 105, name: 'IP Ownership Transfer', category: 'Intellectual Property', standard: 'IP transfers strictly upon final settlement', severity: 'CRITICAL', enabled: true }
      ];
    } else if (type === 'agency') {
      policies = [
        { id: 201, name: 'Net-30 Corporate Payment', category: 'Payment Terms', standard: 'Maximum 30 days', severity: 'HIGH', enabled: true },
        { id: 202, name: '25% Milestone Schedule', category: 'Payment Terms', standard: '4 equal 25% milestone disbursements', severity: 'MEDIUM', enabled: true },
        { id: 203, name: '3 Revision Iterations', category: 'Revision Limits', standard: '3 structured revision rounds', severity: 'MEDIUM', enabled: true },
        { id: 204, name: 'Enterprise Bug Warranty', category: 'Project Scope', standard: '30-day post launch warranty', severity: 'LOW', enabled: true }
      ];
    }
    saveToStorage();
    if (window.showToast) showToast('Applied ' + type + ' template!');
  };

  window.exportPolicyJSON = function() {
    const blob = new Blob([JSON.stringify(policies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ClauseLens_Policies.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
