// ClauseLens Analytics & Reports Controller (Admin Only)
(function() {
  let volumeChart, riskDistChart, earningsChart, clausesChart;
  let activeLogs = [];

  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('api/me', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Not logged in');
      const me = await res.json();
      if (me.role !== 'ADMIN') {
        window.location.href = 'admin-login.html';
        return;
      }
    } catch (err) {
      window.location.href = 'admin-login.html';
      return;
    }

    initCharts();
    loadLiveAnalytics();
  });

  async function loadLiveAnalytics() {
    try {
      const statsRes = await fetch('api/admin/stats', { credentials: 'same-origin' });
      if (statsRes.ok) {
        const s = await statsRes.json();
        const total = s.totalAnalyses ?? 0;
        if (document.getElementById('kpi-total')) document.getElementById('kpi-total').textContent = total;
        if (document.getElementById('kpi-safety')) {
          const high = s.highSeverityCount ?? 0;
          const safetyPct = total > 0 ? Math.max(20, Math.round(100 - (high * 20 / total))) : 100;
          document.getElementById('kpi-safety').textContent = safetyPct + '%';
        }
      }

      const analysesRes = await fetch('api/admin/analyses', { credentials: 'same-origin' });
      if (analysesRes.ok) {
        const list = await analysesRes.json();
        if (Array.isArray(list) && list.length > 0) {
          activeLogs = list.map(a => ({
            time: a.createdAt ? a.createdAt.substring(0, 16) : 'Just now',
            title: a.originalFilename || 'Agreement Document',
            role: 'Freelancer: ' + (a.freelancerName || 'User'),
            score: Math.max(10, 100 - ((a.highCount || 0) * 20 + (a.mediumCount || 0) * 10)),
            flags: a.totalFindings || ((a.highCount || 0) + (a.mediumCount || 0) + (a.lowCount || 0)),
            status: (a.highCount > 0) ? 'Critical Flag' : 'Approved'
          }));
        } else {
          activeLogs = [];
        }
      }
    } catch (e) {
      console.warn('Live analytics load warning:', e);
    }
    renderLogs();
  }

  function initCharts() {
    // Primary Purple Color Palette
    const purple = '#6847E8';
    const darkPurple = '#4B2BC3';
    const lavender = '#B6A6FF';
    const lightLavender = '#EDE8FF';
    const success = '#20B982';
    const warning = '#F4B544';
    const danger = '#EF6464';

    // 1. Monthly Volume Chart
    const ctxVol = document.getElementById('volumeChart');
    if (ctxVol && window.Chart) {
      volumeChart = new Chart(ctxVol, {
        type: 'line',
        data: {
          labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
          datasets: [{
            label: 'Contracts Analyzed',
            data: [28, 42, 56, 74, 98, 124],
            borderColor: purple,
            backgroundColor: 'rgba(104, 71, 232, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: purple,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#F2EEFC' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Risk Distribution Donut
    const ctxRisk = document.getElementById('riskDistChart');
    if (ctxRisk && window.Chart) {
      riskDistChart = new Chart(ctxRisk, {
        type: 'doughnut',
        data: {
          labels: ['Low Risk (Safe)', 'Medium Risk (Caution)', 'High Risk (Severe)', 'Critical Traps'],
          datasets: [{
            data: [54, 26, 14, 6],
            backgroundColor: [success, warning, '#F97316', danger],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 12 } } }
          },
          cutout: '68%'
        }
      });
    }

    // 3. Earnings Trends Bar
    const ctxEarn = document.getElementById('earningsChart');
    if (ctxEarn && window.Chart) {
      earningsChart = new Chart(ctxEarn, {
        type: 'bar',
        data: {
          labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
          datasets: [{
            label: 'Milestone Payouts ($)',
            data: [14200, 21800, 28900, 36400, 48200, 62500],
            backgroundColor: purple,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#F2EEFC' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 4. Top Flagged Clauses
    const ctxClauses = document.getElementById('clausesChart');
    if (ctxClauses && window.Chart) {
      clausesChart = new Chart(ctxClauses, {
        type: 'bar',
        data: {
          labels: ['Net-60/90 Days', 'Unlimited Revisions', 'Premature IP Transfer', 'Uncapped Indemnity', 'Non-Compete Clauses'],
          datasets: [{
            label: 'Instances Flagged',
            data: [84, 68, 52, 44, 31],
            backgroundColor: [danger, '#F97316', warning, purple, lavender],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#F2EEFC' } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  }

  window.updateCharts = function(range) {
    if (!volumeChart) return;
    // Simulate updating data based on filter
    if (range === '30') {
      volumeChart.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      volumeChart.data.datasets[0].data = [24, 31, 38, 45];
    } else {
      volumeChart.data.labels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      volumeChart.data.datasets[0].data = [28, 42, 56, 74, 98, 124];
    }
    volumeChart.update();
  };

  function renderLogs() {
    const tbody = document.getElementById('scans-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!activeLogs || activeLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No contract scans recorded yet. Live scans will appear here automatically.</td></tr>';
      return;
    }

    activeLogs.forEach(log => {
      const tr = document.createElement('tr');
      const scoreTag = log.score > 80 ? 'low' : (log.score > 60 ? 'medium' : 'high');
      const statusTag = log.status === 'Approved' ? 'low' : (log.status === 'Critical Flag' ? 'high' : 'medium');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:12.5px; color:var(--text-muted);">${log.time}</td>
        <td><strong>${escapeHtml(log.title)}</strong></td>
        <td><span class="tag purple">${escapeHtml(log.role)}</span></td>
        <td><span class="tag ${scoreTag}">${log.score} / 100</span></td>
        <td>${log.flags} flagged</td>
        <td><span class="tag ${statusTag}">${log.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.exportAnalyticsCSV = function() {
    let csv = "Timestamp,Contract Title,User Role,Risk Score,Flagged Clauses,Status\n";
    (activeLogs || []).forEach(log => {
      csv += `"${log.time}","${log.title}","${log.role}",${log.score},${log.flags},"${log.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "ClauseLens_Analytics_Export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

})();
