// Freelancer Portal Logic
let currentFreelancerId = null;
let activeConvId = null;
let lastAnalysisResult = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.get('api/me');
    if (me.role !== 'FREELANCER') {
      window.location.href = 'freelancer-login.html';
      return;
    }
    currentFreelancerId = me.id;
    document.getElementById('who').textContent = me.name || me.email || 'Freelancer';
    const pts = (me && me.rewardPoints !== undefined) ? me.rewardPoints : 0;
    if (document.getElementById('user-points')) document.getElementById('user-points').textContent = pts;
    if (document.getElementById('card-points')) document.getElementById('card-points').textContent = pts;
    
    // Initial data load
    loadOverview();
    loadBrowseJobs();
    loadMyApplications();
    loadFreelancerAgreements();
    loadPolicies();
    loadTasks();
    loadPayments();
    loadWallet();
    loadConversations();
    checkNotifications();

    // Check URL hash on load
    const initialTab = (window.location.hash || '').replace('#', '');
    if (initialTab && document.getElementById(`tab-${initialTab}`)) {
      switchTab(initialTab);
    }
    window.addEventListener('hashchange', () => {
      const h = (window.location.hash || '').replace('#', '');
      if (h && document.getElementById(`tab-${h}`)) {
        switchTab(h);
      }
    });

    // Close modals on overlay backdrop click or Escape key
    document.addEventListener('click', (e) => {
      if (e.target.classList && (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal'))) {
        e.target.classList.remove('open');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open, .modal.open').forEach(m => m.classList.remove('open'));
      }
    });
  } catch (err) {
    console.error('Session load failed:', err);
    window.location.href = 'freelancer-login.html';
  }
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.dash-nav a').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.style.display = 'block';

  const link = document.querySelector(`.dash-nav a[href="#${tabId}"]`);
  if (link) link.classList.add('active');

  if (tabId === 'agreements') {
    loadFreelancerAgreements();
  } else if (tabId === 'payments') {
    loadPayments();
    loadWallet();
  }
}
window.switchTab = switchTab;

// 1. OVERVIEW
async function loadOverview() {
  try {
    const apps = await API.get('api/applications');
    const analyses = await API.get('api/analyses');
    
    const appList = Array.isArray(apps) ? apps : [];
    const analysisList = Array.isArray(analyses) ? analyses : [];

    if (document.getElementById('card-apps')) document.getElementById('card-apps').textContent = appList.length;
    if (document.getElementById('card-reports')) document.getElementById('card-reports').textContent = analysisList.length;

    // Refresh agreements overview and wallet as well
    loadFreelancerAgreements();
    loadWallet();
  } catch (e) {
    console.warn('Overview stats error:', e);
  }
}

// -------------------------------------------------------------
// CLIENT AGREEMENTS & OFFICIAL CORPORATE SEAL VIEWER SUITE
// -------------------------------------------------------------
window.currentViewingAgreement = null;

function generateDeterministicHash(id, seed) {
  const str = `CL-${id}-${seed || 'CLAUSELENS'}-VERIFIED-SECURE-2026`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `SHA256:${hex.toUpperCase()}99A4F2C${(id * 73).toString(16).toUpperCase()}`;
}

async function loadFreelancerAgreements() {
  const container = document.getElementById('freelancer-agreements-container');
  try {
    const list = await API.get('api/agreements');
    const agrList = Array.isArray(list) ? list : [];

    // Calculate metrics
    const activeAgreements = agrList.filter(a => a.status === 'ACCEPTED');
    const pendingReview = agrList.filter(a => a.status !== 'ACCEPTED');
    const totalProtectedValue = agrList.reduce((sum, a) => sum + (parseFloat(a.totalAmount) || 0), 0);

    // Update Overview & Tab stats
    if (document.getElementById('card-agrs')) {
      document.getElementById('card-agrs').textContent = agrList.length;
    }
    if (document.getElementById('agr-stat-active')) {
      document.getElementById('agr-stat-active').textContent = activeAgreements.length;
    }
    if (document.getElementById('agr-stat-pending')) {
      document.getElementById('agr-stat-pending').textContent = pendingReview.length;
    }
    if (document.getElementById('agr-stat-value')) {
      document.getElementById('agr-stat-value').textContent = `$${totalProtectedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Unread alert badge in sidebar nav
    const badge = document.getElementById('freelancer-agr-badge');
    if (badge) {
      if (pendingReview.length > 0) {
        badge.textContent = pendingReview.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Dynamic Overview Alert Banner
    const overviewAlert = document.getElementById('overview-agr-alert');
    if (overviewAlert) {
      if (pendingReview.length > 0) {
        const firstPending = pendingReview[0];
        overviewAlert.style.display = 'block';
        const titleEl = document.getElementById('overview-agr-title');
        if (titleEl) {
          titleEl.textContent = `${firstPending.title} from ${firstPending.partnerName}`;
        }
        const btnReview = document.getElementById('btn-review-agr-banner');
        if (btnReview) {
          btnReview.onclick = () => openViewAgreementModal(firstPending.id);
        }
      } else {
        overviewAlert.style.display = 'none';
      }
    }

    if (!container) return;

    if (agrList.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:36px 20px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📄</div>
          <h4 style="margin:0 0 6px; color:var(--text);">No Client Agreements Yet</h4>
          <p style="margin:0; font-size:13.5px;">When hiring clients prepare and draft formal contracts for your proposals, they will appear here with official corporate seals and milestone protection.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = agrList.map(a => {
      const isAccepted = a.status === 'ACCEPTED';
      const inrVal = Math.round((parseFloat(a.totalAmount) || 0) * 83.5).toLocaleString('en-IN');
      const formattedAmt = parseFloat(a.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      
      return `
        <div class="card" style="margin-bottom:0; padding:20px; border:1.5px solid ${isAccepted ? '#A7F3D0' : '#E0E7FF'}; border-left:5px solid ${isAccepted ? '#059669' : '#6366F1'}; transition:transform 0.2s, box-shadow 0.2s;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span class="tag ${isAccepted ? 'lo' : 'purple'}" style="font-size:11px; font-weight:800; letter-spacing:0.3px;">
                  ${isAccepted ? '✓ MUTUALLY SIGNED & ACTIVE' : '⚡ AWAITING YOUR SIGNATURE'}
                </span>
                <span style="background:#FEF9C3; border:1px solid #FDE047; color:#854D0E; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                  ★ Corporate Sealed by ${escapeHtml(a.partnerName)}
                </span>
                <small style="color:var(--text-muted); font-weight:600; font-size:12px;">Version ${a.currentVersion}</small>
              </div>
              <h3 style="font-size:17px; margin:0 0 4px; color:#1E1B4B;">${escapeHtml(a.title)}</h3>
              <p style="margin:0; font-size:13px; color:var(--text-muted);">
                Issuing Client: <strong style="color:var(--text);">${escapeHtml(a.partnerName)}</strong> &bull; Created: ${a.createdAt ? a.createdAt.substring(0, 10) : 'Recent'}
              </p>
            </div>

            <!-- Key Financials Chip -->
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:var(--r-sm); padding:10px 16px; text-align:right;">
              <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700; display:block;">Total Contract Value</span>
              <strong style="font-size:18px; color:#0F172A;">$${formattedAmt}</strong>
              <small style="display:block; color:#475569; font-size:11px; font-weight:600;">(₹${inrVal} INR)</small>
            </div>
          </div>

          <!-- Escrow Terms Ribbon -->
          <div style="background:#F1F5F9; border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; flex-wrap:wrap; gap:16px; font-size:12.5px; color:#334155;">
            <div><span>Advance Escrow:</span> <strong style="color:#0F172A;">${a.advancePercentage}%</strong></div>
            <div><span>Payment Due:</span> <strong style="color:#0F172A;">${a.paymentDueDays || 15} Days</strong></div>
            <div><span>Revision Allowance:</span> <strong style="color:#0F172A;">${a.revisionLimit || 3} Iterations</strong></div>
            <div><span>Dispute Tribunal:</span> <strong style="color:#059669;">ClauseLens Smart Escrow</strong></div>
          </div>

          <!-- Actions Footer -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px dashed #E2E8F0; padding-top:12px;">
            <div style="display:flex; gap:8px;">
              <button class="btn btn-purple btn-sm" onclick="scanAgreementWithAi(${a.id})" title="Extract clauses and scan in AI Contract Analyzer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6M8 11h6"/></svg>
                AI Risk Audit
              </button>
              <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientName: '${escapeHtml(a.companyName || a.partnerName || '')}', projectTitle: '${escapeHtml(a.title)}', type: 'CONTRACT_REMINDER' })" title="Send Client Email Automatically">
                ✉️ Auto-Send Mail
              </button>
            </div>

            <div style="display:flex; gap:8px; align-items:center;">
              <button class="btn btn-line btn-sm" onclick="openViewAgreementModal(${a.id})" style="font-weight:600;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                View Contract & Corporate Seal
              </button>
              ${!isAccepted ? `
                <button class="btn btn-green btn-sm" onclick="freelancerAcceptAgreement(${a.id})" style="font-weight:700;">
                  ✍️ Accept & Sign (+200 Pts)
                </button>
              ` : `
                <span class="tag lo" style="font-weight:700; font-size:12px; padding:6px 12px;">
                  &check; Mutually Signed
                </span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load agreements:', err);
    if (container) {
      container.innerHTML = `<p style="color:var(--red);">Error loading agreements: ${escapeHtml(err.message)}</p>`;
    }
  }
}
window.loadFreelancerAgreements = loadFreelancerAgreements;

async function openViewAgreementModal(agrId) {
  const modal = document.getElementById('view-agreement-modal');
  if (!modal) return;

  try {
    const detail = await API.get(`api/agreements/detail?id=${agrId}`);
    if (!detail) {
      showToast('Agreement details could not be found.', true);
      return;
    }

    window.currentViewingAgreement = detail;

    // Header info
    document.getElementById('view-agr-modal-title').textContent = detail.title || 'Master Service Agreement';
    document.getElementById('view-agr-company').textContent = detail.companyName || 'Hiring Client';
    document.getElementById('view-agr-freelancer').textContent = detail.freelancerName || 'Freelancer';
    document.getElementById('view-agr-date').textContent = `Date: ${detail.createdAt ? detail.createdAt.substring(0, 10) : '2026-10-24'}`;

    const isMutuallyAccepted = detail.status === 'ACCEPTED' || (detail.freelancerAccepted > 0 && detail.companyAccepted > 0);
    const flSigned = detail.freelancerAccepted > 0 || isMutuallyAccepted;

    const statusTag = document.getElementById('view-agr-status-tag');
    if (statusTag) {
      if (isMutuallyAccepted) {
        statusTag.textContent = '✓ MUTUALLY BINDING & ACTIVE';
        statusTag.style.background = '#ECFDF5';
        statusTag.style.color = '#059669';
      } else {
        statusTag.textContent = '⚡ AWAITING FREELANCER DIGITAL SIGNATURE';
        statusTag.style.background = '#FEF3C7';
        statusTag.style.color = '#B45309';
      }
    }

    // Ribbon terms
    const formattedAmt = parseFloat(detail.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const inrVal = Math.round((parseFloat(detail.totalAmount) || 0) * 83.5).toLocaleString('en-IN');
    document.getElementById('view-agr-amount').textContent = `$${formattedAmt}`;
    document.getElementById('view-agr-inr').textContent = `(₹${inrVal} INR)`;
    document.getElementById('view-agr-advance').textContent = `${detail.advancePercentage || 30}%`;
    document.getElementById('view-agr-days').textContent = `${detail.paymentDueDays || 15} Days`;
    document.getElementById('view-agr-revs').textContent = `${detail.revisionLimit || 3} Rounds`;

    // Contract text paper
    const bodyText = detail.scope || detail.deliverables || 'Full project specifications as agreed between Client and Contractor.';
    document.getElementById('view-agr-body-text').textContent = bodyText;

    // Official Corporate Seal
    const compName = detail.companyName || 'APEX SOLUTION';
    document.getElementById('seal-company-name').textContent = compName.toUpperCase();
    document.getElementById('seal-company-hash').textContent = generateDeterministicHash(detail.id, compName);

    // Freelancer Signature Card
    const flName = detail.freelancerName || 'VISHAL R R';
    document.getElementById('seal-fl-signature').textContent = flName;
    const flBadge = document.getElementById('seal-fl-status-badge');
    const flHash = document.getElementById('seal-fl-hash');
    const flConfirmText = document.getElementById('seal-fl-confirm-text');
    const acceptBtn = document.getElementById('btn-modal-accept-agr');

    if (flSigned) {
      flBadge.className = 'tag lo';
      flBadge.textContent = '✓ DIGITALLY SIGNED & MUTUALLY BINDING';
      flBadge.style.background = '#ECFDF5';
      flBadge.style.color = '#059669';
      flHash.textContent = `SIG-VERIFIED-${generateDeterministicHash(detail.id, flName)}`;
      flConfirmText.textContent = 'Signed and sealed with dual cryptographic consent.';
      if (acceptBtn) {
        acceptBtn.disabled = true;
        acceptBtn.textContent = '✓ Contract Mutually Signed';
        acceptBtn.className = 'btn btn-line btn-sm';
        acceptBtn.style.color = '#059669';
      }
    } else {
      flBadge.className = 'tag md';
      flBadge.textContent = 'AWAITING SIGNATURE';
      flBadge.style.background = '#FEF3C7';
      flBadge.style.color = '#B45309';
      flHash.textContent = 'PENDING CONTRACTOR DIGITAL CONSENT';
      flConfirmText.textContent = 'Signature applies upon clicking "Accept & Sign Agreement".';
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.textContent = '✍️ Accept & Sign Agreement (+200 Pts)';
        acceptBtn.className = 'btn btn-green btn-sm';
        acceptBtn.style.color = '#FFFFFF';
      }
    }

    modal.classList.add('open');
  } catch (err) {
    showToast('Failed to load agreement: ' + err.message, true);
  }
}
window.openViewAgreementModal = openViewAgreementModal;

function closeViewAgreementModal() {
  const modal = document.getElementById('view-agreement-modal');
  if (modal) modal.classList.remove('open');
}
window.closeViewAgreementModal = closeViewAgreementModal;

function scanCurrentModalAgreementWithAi() {
  if (!window.currentViewingAgreement) return;
  const text = window.currentViewingAgreement.scope || window.currentViewingAgreement.deliverables || '';
  closeViewAgreementModal();
  loadTextIntoAnalyzerAndScan(text, window.currentViewingAgreement.title);
}
window.scanCurrentModalAgreementWithAi = scanCurrentModalAgreementWithAi;

async function scanAgreementWithAi(agrId) {
  try {
    const detail = await API.get(`api/agreements/detail?id=${agrId}`);
    if (!detail) {
      showToast('Could not load agreement', true);
      return;
    }
    const text = detail.scope || detail.deliverables || '';
    loadTextIntoAnalyzerAndScan(text, detail.title);
  } catch (err) {
    showToast(err.message, true);
  }
}
window.scanAgreementWithAi = scanAgreementWithAi;

function loadTextIntoAnalyzerAndScan(contractText, title) {
  switchTab('analyzer');
  const area = document.getElementById('contract-content');
  if (area) {
    area.value = contractText;
    const countEl = document.getElementById('char-count');
    if (countEl) countEl.textContent = contractText.length.toLocaleString() + ' characters';
  }
  const uploadLabel = document.getElementById('upload-label');
  if (uploadLabel && title) {
    uploadLabel.textContent = `Imported: ${title}`;
  }
  showToast('Contract loaded into AI Analyzer! Starting risk audit...');
  if (typeof window.startAnalysis === 'function') {
    window.startAnalysis();
  }
}

async function acceptCurrentModalAgreement() {
  if (!window.currentViewingAgreement) return;
  await freelancerAcceptAgreement(window.currentViewingAgreement.id);
  // Refresh modal with accepted state
  openViewAgreementModal(window.currentViewingAgreement.id);
}
window.acceptCurrentModalAgreement = acceptCurrentModalAgreement;

async function freelancerAcceptAgreement(agreementId) {
  try {
    await API.post('api/agreements/accept', { agreementId });
    showToast('Agreement digitally signed and mutually binding! (+200 reward points credited)');
    loadFreelancerAgreements();
    loadOverview();
    loadTasks();
    loadPayments();
  } catch (err) {
    showToast(err.message, true);
  }
}
window.freelancerAcceptAgreement = freelancerAcceptAgreement;

// 2. BROWSE JOBS
async function loadBrowseJobs() {
  const container = document.getElementById('jobs-container');
  const domain = document.getElementById('job-domain-filter').value;
  try {
    const jobs = await API.get(`api/jobs?domain=${encodeURIComponent(domain)}`);
    if (!jobs || jobs.length === 0) {
      container.innerHTML = '<div class="card"><p style="color:var(--text-muted);">No open jobs found in this category.</p></div>';
      return;
    }

    container.innerHTML = jobs.map(j => `
      <div class="card" style="margin-bottom:0; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
        <div style="flex:1; min-width:280px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span class="tag lo">${escapeHtml(j.domain)}</span>
            <small style="color:var(--text-muted);">&bull; Posted by ${escapeHtml(j.companyName || 'Verified Client')}</small>
          </div>
          <h3 style="font-size:18px; margin-bottom:8px;">${escapeHtml(j.title)}</h3>
          <p style="font-size:14px; color:#4B5550; margin-bottom:12px;">${escapeHtml(j.description)}</p>
          <div style="font-size:13px; color:var(--text-muted); display:flex; gap:16px; flex-wrap:wrap;">
            <span><strong>Skills:</strong> ${escapeHtml(j.skills)}</span>
            <span><strong>Advance:</strong> ${j.advancePercentage}% Upfront</span>
            <span><strong>Deadline:</strong> ${j.deadline || 'Flexible'}</span>
          </div>
        </div>
        <div style="text-align:right; min-width:140px;">
          <strong style="font-size:22px; color:var(--dark); display:block; margin-bottom:8px;">$${j.budget}</strong>
          <button class="btn btn-green btn-sm" onclick="openProposalModal(${j.id}, '${escapeHtml(j.title).replace(/'/g, "\\'")}', ${j.budget})">Submit Proposal</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);">Failed to load jobs: ${err.message}</p>`;
  }
}

function openProposalModal(jobId, jobTitle, budget) {
  document.getElementById('prop-job-id').value = jobId;
  document.getElementById('prop-job-title').textContent = `Submitting for: ${jobTitle} (Client Budget: $${budget})`;
  document.getElementById('prop-price').value = budget;
  document.getElementById('proposal-modal').classList.add('open');
}
function closeProposalModal() {
  document.getElementById('proposal-modal').classList.remove('open');
}

async function submitProposal(e) {
  e.preventDefault();
  const jobId = document.getElementById('prop-job-id').value;
  const coverLetter = document.getElementById('prop-cover').value;
  const price = document.getElementById('prop-price').value;
  const days = document.getElementById('prop-days').value;

  try {
    await API.post('api/applications', {
      jobId: Number(jobId),
      coverLetter,
      estimatedPrice: Number(price),
      estimatedDays: Number(days)
    });
    showToast('Proposal submitted successfully!');
    closeProposalModal();
    loadMyApplications();
    switchTab('my-applications');
  } catch (err) {
    showToast(err.message, true);
  }
}

// 3. MY APPLICATIONS
async function loadMyApplications() {
  const tbody = document.getElementById('apps-tbody');
  try {
    const apps = await API.get('api/applications');
    if (!apps || apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-muted);">You have not submitted any proposals yet.</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(a => {
      let badgeClass = 'lo';
      if (a.status === 'SHORTLISTED') badgeClass = 'md';
      if (a.status === 'ACCEPTED') badgeClass = 'hi';
      return `
        <tr>
          <td><strong>${escapeHtml(a.jobTitle)}</strong></td>
          <td>${escapeHtml(a.companyName)}</td>
          <td><strong>$${a.estimatedPrice}</strong></td>
          <td>${a.estimatedDays} days</td>
          <td><span class="tag ${badgeClass}">${a.status}</span></td>
          <td><small>${a.createdAt.substring(0, 10)}</small></td>
          <td>
            ${a.status === 'ACCEPTED' ? '<button class="btn btn-green btn-sm" onclick="switchTab(\'chat\')">Chat with Client</button>' : '<span style="color:var(--text-muted); font-size:12px;">Under Review</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

// 4. AI RISK ANALYZER
function loadSampleContract() {
  document.getElementById('contract-text').value = 
`FREELANCE SERVICES AGREEMENT
This agreement is made between Acme Corp ("Client") and Independent Contractor ("Freelancer").

1. SCOPE AND DELIVERABLES:
Contractor will design and develop the web application according to specifications.

2. COMPENSATION AND PAYMENT:
Total project compensation is $4,500. All deliverables shall be delivered first. Payment will be made within 90 days after final delivery and acceptance. No advance payment or upfront deposit is included.

3. REVISIONS AND APPROVALS:
Contractor agrees to provide unlimited revisions and rework until Client is completely satisfied with all deliverables.

4. INTELLECTUAL PROPERTY & CODE:
All work, designs, software code, and deliverables shall be deemed a "work made for hire" and owned immediately by Client upon creation, regardless of whether invoices have been settled.

5. LIABILITY & INDEMNIFICATION:
Contractor agrees to indemnify and hold harmless Client against all claims, unlimited consequential damages, and losses arising from the delivered software.

6. DISPUTE RESOLUTION:
Any controversy shall be resolved exclusively in the local court of Client's international jurisdiction.`;
  showToast('Loaded sample contract with common high-risk clauses.');
}

async function runAnalysis() {
  const text = document.getElementById('contract-text').value.trim();
  if (!text) {
    showToast('Please paste contract agreement terms to analyze.', true);
    return;
  }

  const btn = document.getElementById('btn-run-analysis');
  btn.disabled = true;
  btn.textContent = 'Analyzing Risks...';

  try {
    const res = await API.post('api/analyses/analyze', {
      contractText: text,
      filename: 'contract-draft.txt'
    });
    lastAnalysisResult = res;

    // Display results
    document.getElementById('analysis-result-box').style.display = 'block';
    document.getElementById('res-title').textContent = `Found ${res.totalFindings} Potential Contract Risks`;
    document.getElementById('res-summary').textContent = `Analyzed against your Freelancer Protection Policies. Verified quotations extracted from text.`;

    document.getElementById('badge-hi').textContent = `${res.highCount} High`;
    document.getElementById('badge-md').textContent = `${res.mediumCount} Medium`;
    document.getElementById('badge-lo').textContent = `${res.lowCount} Low`;

    const list = document.getElementById('findings-list');
    list.innerHTML = res.findings.map(f => `
      <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--r-md); padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <span class="tag ${f.severity === 'HIGH' ? 'hi' : f.severity === 'MEDIUM' ? 'md' : 'lo'}" style="margin-right:8px;">${f.severity} Severity</span>
            <strong style="font-size:16px;">${escapeHtml(f.title)}</strong>
          </div>
          <small style="color:var(--text-muted); font-weight:600;">${escapeHtml(f.clauseReference || 'Agreement Clause')}</small>
        </div>

        <div style="background:#FBFDFC; border-left:3px solid var(--primary); padding:10px 14px; margin:10px 0; font-size:13px; font-style:italic;">
          "${escapeHtml(f.exactQuote || '')}"
          ${f.isVerified ? '<small style="display:block; font-style:normal; color:var(--primary); font-weight:700; margin-top:4px;">&check; Exact quotation verified in contract text</small>' : ''}
        </div>

        <p style="font-size:13.5px; color:#36413C; margin-bottom:6px;"><strong>Plain English Breakdown:</strong> ${escapeHtml(f.simpleExplanation)}</p>
        <p style="font-size:13px; color:#78350F; background:#FEF3C7; padding:6px 10px; border-radius:6px; margin-bottom:8px;"><strong>Potential Impact:</strong> ${escapeHtml(f.potentialImpact)}</p>
        <p style="font-size:13px; color:#065F46; background:#D1FAE5; padding:6px 10px; border-radius:6px;"><strong>Suggested Counter-Proposal:</strong> ${escapeHtml(f.suggestedNegotiation)}</p>
      </div>
    `).join('');

    document.getElementById('email-draft-text').value = res.emailDraft || '';
    showToast('Risk analysis complete!');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyze Agreement Risks';
  }
}

function copyEmailDraft() {
  const el = document.getElementById('email-draft-text');
  el.select();
  navigator.clipboard.writeText(el.value);
  showToast('Negotiation email copied to clipboard!');
}

// 5. POLICY BUILDER
async function loadPolicies() {
  const tbody = document.getElementById('policy-tbody');
  try {
    const rules = await API.get('api/policies');
    if (!rules || rules.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No custom rules configured yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rules.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.category)}</strong></td>
        <td>${escapeHtml(r.ruleName)}</td>
        <td><code>${escapeHtml(r.operator)} ${escapeHtml(r.expectedValue)} ${escapeHtml(r.unit || '')}</code></td>
        <td><span class="tag ${r.severity === 'HIGH' ? 'hi' : r.severity === 'MEDIUM' ? 'md' : 'lo'}">${r.severity}</span></td>
        <td>
          <button class="btn btn-sm ${r.isEnabled ? 'btn-green' : 'btn-line'}" onclick="toggleRule(${r.id}, ${!r.isEnabled})">
            ${r.isEnabled ? '&check; Enabled' : 'Disabled'}
          </button>
        </td>
        <td>
          <button class="btn btn-line btn-sm" onclick="deleteRule(${r.id})" style="color:var(--red);">&times; Remove</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

async function toggleRule(ruleId, isEnabled) {
  try {
    await API.post('api/policies/toggle', { ruleId, isEnabled });
    loadPolicies();
    showToast('Policy updated');
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteRule(ruleId) {
  if (!confirm('Are you sure you want to remove this policy rule?')) return;
  try {
    await API.post('api/policies/delete', { ruleId });
    loadPolicies();
    showToast('Rule removed');
  } catch (err) {
    showToast(err.message, true);
  }
}

function openAddRuleModal() { document.getElementById('rule-modal').classList.add('open'); }
function closeRuleModal() { document.getElementById('rule-modal').classList.remove('open'); }

async function saveRule(e) {
  e.preventDefault();
  const category = document.getElementById('rule-category').value;
  const ruleName = document.getElementById('rule-name').value;
  const expectedValue = document.getElementById('rule-val').value;
  const severity = document.getElementById('rule-sev').value;

  try {
    await API.post('api/policies/rule', { category, ruleName, expectedValue, severity, operator: '<=' });
    showToast('Policy rule saved!');
    closeRuleModal();
    loadPolicies();
  } catch (err) {
    showToast(err.message, true);
  }
}

// 6. TASKS & AI/CUSTOM TIMELINE ENGINE
let currentProjectId = null;
let currentTimelineData = null;
let activeHalfwayTaskId = null;

async function loadTasks() {
  const container = document.getElementById('tasks-container');
  const projSelect = document.getElementById('timeline-project-select');
  try {
    const projects = await API.get('api/tasks/projects').catch(() => []);
    if (!projects || projects.length === 0) {
      if (projSelect) projSelect.innerHTML = '<option value="">No Active Projects</option>';
      if (document.getElementById('card-proj-title')) document.getElementById('card-proj-title').textContent = 'No Active Projects Assigned';
      if (document.getElementById('card-proj-subtitle')) document.getElementById('card-proj-subtitle').textContent = 'Accepted client contracts will automatically appear here.';
      if (document.getElementById('card-days-left')) document.getElementById('card-days-left').textContent = 'No Deadline';
      if (document.getElementById('timeline-stepper')) document.getElementById('timeline-stepper').innerHTML = '<p style="color:var(--text-muted); font-size:13px; padding:12px;">No milestones scheduled.</p>';
      if (container) container.innerHTML = '<p style="color:var(--text-muted); padding:16px;">No active project tasks currently scheduled. Once a client accepts an agreement, milestone tasks appear here.</p>';
      if (document.getElementById('halfway-banner')) document.getElementById('halfway-banner').style.display = 'none';
      return;
    }

    if (projSelect) {
      projSelect.innerHTML = projects.map(p => `
        <option value="${p.id}" ${currentProjectId && currentProjectId == p.id ? 'selected' : ''}>
          ${escapeHtml(p.title)} ($${p.budget || 0})
        </option>
      `).join('');
    }

    if (!currentProjectId || !projects.some(p => p.id == currentProjectId)) {
      currentProjectId = projects[0].id;
      if (projSelect) projSelect.value = currentProjectId;
    }

    await loadTimeline(currentProjectId);
  } catch (err) {
    console.error('loadTasks error:', err);
    if (container) container.innerHTML = `<p style="color:var(--red);">Failed to load timeline: ${err.message}</p>`;
  }
}
window.loadTasks = loadTasks;

async function onProjectSelectChanged(projId) {
  if (!projId) return;
  currentProjectId = Number(projId);
  await loadTimeline(currentProjectId);
}
window.onProjectSelectChanged = onProjectSelectChanged;

async function loadTimeline(projectId) {
  if (!projectId) return;
  const container = document.getElementById('tasks-container');
  const stepper = document.getElementById('timeline-stepper');
  const halfwayBanner = document.getElementById('halfway-banner');

  try {
    const data = await API.get(`api/tasks/timeline?projectId=${projectId}`);
    currentTimelineData = data;

    if (!data || !data.project) {
      if (container) container.innerHTML = '<p style="color:var(--text-muted);">Project timeline not available.</p>';
      return;
    }

    const proj = data.project;
    if (document.getElementById('card-proj-title')) document.getElementById('card-proj-title').textContent = proj.title || 'Untitled Project';
    if (document.getElementById('card-proj-subtitle')) {
      document.getElementById('card-proj-subtitle').innerHTML = `Client: <strong>${escapeHtml(proj.companyName || 'Verified Hiring Partner')}</strong> &bull; Total Value: <strong>$${proj.budget || 0} ${proj.currency || 'USD'}</strong>`;
    }
    if (document.getElementById('card-proj-status')) {
      document.getElementById('card-proj-status').textContent = proj.status || 'ACTIVE';
    }

    // Metric strip
    if (document.getElementById('time-start-date')) document.getElementById('time-start-date').textContent = data.startDate || '--';
    if (document.getElementById('time-halfway-date')) document.getElementById('time-halfway-date').textContent = data.halfwayDate || '--';
    if (document.getElementById('time-deadline-date')) document.getElementById('time-deadline-date').textContent = data.deadline || '--';
    if (document.getElementById('time-completed-stat')) document.getElementById('time-completed-stat').textContent = `${data.completedTasks || 0} / ${data.totalTasks || 0}`;

    // Progress bar
    const progress = Math.min(100, Math.max(0, data.overallProgressPercent || 0));
    if (document.getElementById('time-progress-num')) document.getElementById('time-progress-num').textContent = `${progress}%`;
    if (document.getElementById('time-progress-bar')) document.getElementById('time-progress-bar').style.width = `${progress}%`;

    // Countdown pill
    const daysLeftPill = document.getElementById('card-days-left');
    if (daysLeftPill) {
      const days = data.daysRemaining;
      if (progress >= 100) {
        daysLeftPill.className = 'countdown-pill safe';
        daysLeftPill.textContent = '✅ Project Completed';
      } else if (days > 3) {
        daysLeftPill.className = 'countdown-pill safe';
        daysLeftPill.textContent = `⏱️ ${days} Days Remaining`;
      } else if (days >= 0) {
        daysLeftPill.className = 'countdown-pill warn';
        daysLeftPill.textContent = days === 0 ? '⚠️ Due Today!' : `⚠️ Due in ${days} Day${days > 1 ? 's' : ''}`;
      } else {
        daysLeftPill.className = 'countdown-pill overdue';
        daysLeftPill.textContent = `🚨 ${Math.abs(days)} Days Overdue`;
      }
    }

    if (document.getElementById('card-timeline-type')) {
      document.getElementById('card-timeline-type').textContent = data.hasTimeline ? 'Mode: Scheduled Timeline' : 'Mode: Pending Schedule';
    }

    // Render Milestone Stepper
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    if (document.getElementById('task-count-badge')) {
      document.getElementById('task-count-badge').textContent = tasks.length;
    }

    if (stepper) {
      if (tasks.length === 0) {
        stepper.innerHTML = `
          <div style="grid-column:1/-1; background:#F9FAFB; border:1px dashed var(--border); border-radius:var(--r-md); padding:20px; text-align:center;">
            <p style="margin:0 0 8px; color:var(--text-muted); font-size:14px;">No milestones created yet for this project.</p>
            <button class="btn btn-purple btn-sm" onclick="triggerAiGenerateTimeline()">✨ Generate AI Milestone Timeline</button>
          </div>
        `;
      } else {
        const activeTask = data.activeHalfwayTask || tasks.find(t => t.status !== 'COMPLETED');

        stepper.innerHTML = tasks.map((t, idx) => {
          const isDone = t.status === 'COMPLETED';
          const isHalf = t.status === 'HALF_DONE';
          const isActive = activeTask && t.id === activeTask.id;
          let stepClass = 'stepper-step';
          if (isDone) stepClass += ' completed';
          else if (isActive) stepClass += ' active' + (isHalf ? ' halfway-flag' : '');

          return `
            <div class="${stepClass}" onclick="scrollToTask(${t.id})" title="Click to view details of Phase ${idx + 1}">
              <div>
                <div class="stepper-header">
                  <span class="stepper-phase">Phase ${idx + 1}</span>
                  <span class="tag ${isDone ? 'lo' : isHalf ? 'md' : isActive ? 'purple' : 'hi'}" style="font-size:11px; padding:2px 7px;">
                    ${isDone ? '✓ DONE (+150 Pts)' : isHalf ? '50% HALFWAY' : isActive ? '▶ ACTIVE' : 'UPCOMING'}
                  </span>
                </div>
                <div class="stepper-title">${escapeHtml(t.title)}</div>
              </div>
              <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <span class="stepper-date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${t.dueDate ? t.dueDate : 'TBD'}
                </span>
                ${isActive && !isDone ? `
                  <button class="stepper-quick-btn" onclick="event.stopPropagation(); openCompletePhaseModal(${t.id})" title="Deliver and complete this phase">
                    Finish (+150 Pts)
                  </button>
                ` : `
                  <strong style="font-size:12px; color:var(--primary);">${t.progressPercent || 0}%</strong>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Dynamic Milestone Checkpoint Banner
    const activeTask = data.activeHalfwayTask || tasks.find(t => t.status !== 'COMPLETED');
    if (activeTask && halfwayBanner) {
      activeHalfwayTaskId = activeTask.id;
      halfwayBanner.style.display = 'block';

      const taskTitleEl = document.getElementById('halfway-task-title');
      const taskDescEl = document.getElementById('halfway-task-desc');
      const btnYes = document.getElementById('btn-halfway-yes');
      const btnComplete = document.getElementById('btn-complete-phase');
      const btnNo = document.getElementById('btn-halfway-no');

      if (activeTask.status === 'HALF_DONE') {
        if (taskTitleEl) taskTitleEl.innerHTML = `Halfway Checkpoint Achieved: <em>"${escapeHtml(activeTask.title)}"</em>`;
        if (taskDescEl) taskDescEl.textContent = '50% progress is confirmed (+100 pts earned). Ready to deliver final work for this phase and unlock +150 points?';
        if (btnYes) {
          btnYes.textContent = '✓ 50% Verified (+100 Pts Earned)';
          btnYes.disabled = true;
          btnYes.style.opacity = '0.8';
        }
        if (btnComplete) {
          btnComplete.style.display = 'inline-block';
          btnComplete.textContent = '🚀 Finish Phase (+150 Pts)';
          btnComplete.onclick = () => openCompletePhaseModal(activeTask.id, activeTask.title);
        }
        if (btnNo) {
          btnNo.textContent = 'Extend Deadline / More Time →';
          btnNo.onclick = () => openExtensionModal(activeTask.id, activeTask.title);
        }
      } else {
        if (taskTitleEl) taskTitleEl.innerHTML = `"Have you completed half of the work?"`;
        if (taskDescEl) taskDescEl.textContent = `Currently on "${escapeHtml(activeTask.title)}". Confirm 50% milestone for +100 reward points, or finish this phase for +150 points.`;
        if (btnYes) {
          btnYes.textContent = 'Yes, 50% Complete (+100 Pts)';
          btnYes.disabled = false;
          btnYes.style.opacity = '1';
          btnYes.onclick = () => respondHalfway(true);
        }
        if (btnComplete) {
          btnComplete.style.display = 'inline-block';
          btnComplete.textContent = '🚀 Finish Phase (+150 Pts)';
          btnComplete.onclick = () => openCompletePhaseModal(activeTask.id, activeTask.title);
        }
        if (btnNo) {
          btnNo.textContent = 'Not Yet / Need Extension →';
          btnNo.onclick = () => openExtensionModal(activeTask.id, activeTask.title);
        }
      }
    } else if (halfwayBanner) {
      if (tasks.length > 0 && tasks.every(t => t.status === 'COMPLETED')) {
        halfwayBanner.style.display = 'block';
        halfwayBanner.style.background = 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)';
        const taskTitleEl = document.getElementById('halfway-task-title');
        const taskDescEl = document.getElementById('halfway-task-desc');
        if (taskTitleEl) taskTitleEl.textContent = '🎉 All Project Milestones Completed!';
        if (taskDescEl) taskDescEl.textContent = 'Outstanding work! All phases have been delivered. You can review your milestone payments in the Payment Tracker.';
        const btnYes = document.getElementById('btn-halfway-yes');
        const btnComplete = document.getElementById('btn-complete-phase');
        const btnNo = document.getElementById('btn-halfway-no');
        if (btnYes) {
          btnYes.textContent = 'View Payments';
          btnYes.disabled = false;
          btnYes.onclick = () => switchTab('payments');
        }
        if (btnComplete) btnComplete.style.display = 'none';
        if (btnNo) btnNo.style.display = 'none';
      } else {
        halfwayBanner.style.display = 'none';
      }
    }

    // Render Tasks Container
    if (container) {
      if (tasks.length === 0) {
        container.innerHTML = `
          <div style="background:#FFFFFF; border:1px dashed var(--border); border-radius:var(--r-md); padding:24px; text-align:center;">
            <p style="color:var(--text-muted); margin-bottom:12px;">No milestone tasks recorded for this project yet.</p>
            <div style="display:flex; justify-content:center; gap:10px;">
              <button class="btn btn-purple btn-sm" onclick="triggerAiGenerateTimeline()">✨ Generate AI Timeline</button>
              <button class="btn btn-line btn-sm" onclick="openCustomTimelineModal()">📅 Set Custom Timeline</button>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = tasks.map((t, idx) => {
          const isDone = t.status === 'COMPLETED';
          const isHalf = t.status === 'HALF_DONE';
          return `
            <div id="task-card-${t.id}" style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--r-md); padding:18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; box-shadow:var(--shadow-sm); transition:all 0.3s ease;">
              <div style="flex:1; min-width:280px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                  <span class="tag ${isDone ? 'lo' : isHalf ? 'md' : 'hi'}">${t.status}</span>
                  <span class="tag lo" style="font-size:11.5px;">Priority: ${escapeHtml(t.priority || 'MEDIUM')}</span>
                  <strong style="font-size:15.5px;">${escapeHtml(t.title)}</strong>
                </div>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">${escapeHtml(t.description || 'Deliverables checklist item.')}</p>
                <div style="font-size:12px; color:var(--text-muted); display:flex; gap:14px; flex-wrap:wrap;">
                  <span><strong>Due Date:</strong> ${t.dueDate || 'Flexible'}</span>
                  ${t.completedAt ? `<span style="color:#059669; font-weight:600;">&check; Finished at: ${t.completedAt.substring(0, 16)}</span>` : ''}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <div style="text-align:right; min-width:60px; margin-right:4px;">
                  <div style="font-weight:800; font-size:16px; color:var(--primary);">${t.progressPercent}%</div>
                  <small style="color:var(--text-muted); font-size:11px;">Progress</small>
                </div>
                ${!isDone ? `
                  ${!isHalf ? `
                    <button class="btn btn-line btn-sm" onclick="respondHalfwaySpecific(${t.id})" title="Confirm 50% milestone completion">
                      Halfway (50% / +100 Pts)
                    </button>
                  ` : ''}
                  <button class="btn btn-line btn-sm" onclick="openExtensionModal(${t.id})" title="Need more time? Extend due date">
                    + Extend
                  </button>
                  <button class="btn btn-green btn-sm" onclick="openCompletePhaseModal(${t.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Mark Done (+150 Pts)
                  </button>
                ` : `
                  <span style="background:#ECFDF5; color:#059669; font-weight:700; font-size:13px; padding:6px 12px; border-radius:var(--r-pill); display:inline-flex; align-items:center; gap:5px;">
                    &check; Finished &bull; Ready for Payment
                  </span>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('loadTimeline error:', err);
    if (container) container.innerHTML = `<p style="color:var(--red);">Error loading timeline: ${err.message}</p>`;
  }
}
window.loadTimeline = loadTimeline;

// AI Automatic Timeline Generation
async function triggerAiGenerateTimeline() {
  if (!currentProjectId) {
    showToast('Please select an active project first.', true);
    return;
  }
  const btn = document.getElementById('btn-ai-gen-timeline');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '✨ AI Analyzing Scope...';
  }

  try {
    const res = await API.post('api/tasks/ai-timeline', {
      projectId: currentProjectId,
      scope: '',
      customDays: null
    });
    showToast('✨ AI successfully analyzed project scope and established automatic 4-phase milestone timeline!');
    await loadTimeline(currentProjectId);
  } catch (err) {
    showToast('AI Timeline generation error: ' + err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }
}
window.triggerAiGenerateTimeline = triggerAiGenerateTimeline;

// Custom Timeline Modal Handlers
function openCustomTimelineModal() {
  if (!currentTimelineData) {
    showToast('Project timeline data is still loading.', true);
    return;
  }
  const startDate = currentTimelineData.startDate || new Date().toISOString().substring(0, 10);
  const deadline = currentTimelineData.deadline || new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10);

  document.getElementById('cust-start-date').value = startDate;
  document.getElementById('cust-deadline-date').value = deadline;

  const container = document.getElementById('cust-milestones-container');
  container.innerHTML = '';

  const tasks = Array.isArray(currentTimelineData.tasks) ? currentTimelineData.tasks : [];
  if (tasks.length > 0) {
    tasks.forEach(t => addCustomMilestoneRow(t));
  } else {
    // Add 2 default initial rows if none exist
    addCustomMilestoneRow({ title: 'Phase 1: Initial Deliverables', dueDate: startDate, priority: 'HIGH' });
    addCustomMilestoneRow({ title: 'Phase 2: Final Acceptance', dueDate: deadline, priority: 'HIGH' });
  }

  document.getElementById('custom-timeline-modal').classList.add('open');
}
window.openCustomTimelineModal = openCustomTimelineModal;

function closeCustomTimelineModal() {
  document.getElementById('custom-timeline-modal').classList.remove('open');
}
window.closeCustomTimelineModal = closeCustomTimelineModal;

function addCustomMilestoneRow(task = null) {
  const container = document.getElementById('cust-milestones-container');
  const div = document.createElement('div');
  div.className = 'custom-milestone-row';
  div.dataset.taskId = task && task.id ? task.id : '0';

  const titleVal = task && task.title ? escapeHtml(task.title) : '';
  const dueVal = task && task.dueDate ? task.dueDate : '';
  const prioVal = task && task.priority ? task.priority : 'MEDIUM';

  div.innerHTML = `
    <div>
      <input type="text" class="form-ctrl form-ctrl-sm row-title" placeholder="Milestone / Task Title" value="${titleVal}" required>
    </div>
    <div>
      <input type="date" class="form-ctrl form-ctrl-sm row-due" value="${dueVal}">
    </div>
    <div>
      <select class="form-ctrl form-ctrl-sm row-prio">
        <option value="HIGH" ${prioVal === 'HIGH' ? 'selected' : ''}>High</option>
        <option value="MEDIUM" ${prioVal === 'MEDIUM' ? 'selected' : ''}>Medium</option>
        <option value="LOW" ${prioVal === 'LOW' ? 'selected' : ''}>Low</option>
      </select>
    </div>
    <div>
      <button type="button" class="btn btn-sm" style="color:var(--red); padding:6px 10px;" onclick="this.closest('.custom-milestone-row').remove()" title="Remove milestone">&times;</button>
    </div>
  `;
  container.appendChild(div);
}
window.addCustomMilestoneRow = addCustomMilestoneRow;

async function saveCustomTimeline(e) {
  e.preventDefault();
  if (!currentProjectId) return;

  const startDate = document.getElementById('cust-start-date').value;
  const deadline = document.getElementById('cust-deadline-date').value;

  const rows = document.querySelectorAll('#cust-milestones-container .custom-milestone-row');
  const milestones = [];
  rows.forEach(r => {
    const id = Number(r.dataset.taskId || 0);
    const title = r.querySelector('.row-title').value.trim();
    const dueDate = r.querySelector('.row-due').value;
    const priority = r.querySelector('.row-prio').value;
    if (title) {
      milestones.push({ id, title, dueDate: dueDate || null, priority });
    }
  });

  const btn = document.getElementById('btn-save-cust-timeline');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving Custom Schedule...';
  }

  try {
    await API.post('api/tasks/custom-timeline', {
      projectId: currentProjectId,
      startDate,
      deadline,
      milestones
    });
    showToast('Custom timeline & milestone dates saved successfully!');
    closeCustomTimelineModal();
    await loadTimeline(currentProjectId);
  } catch (err) {
    showToast('Failed to save custom timeline: ' + err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Custom Timeline';
    }
  }
}
window.saveCustomTimeline = saveCustomTimeline;

// Extension Request Modal Handlers
function openExtensionModal(taskId = null, taskTitle = null) {
  const tasks = (currentTimelineData && Array.isArray(currentTimelineData.tasks)) ? currentTimelineData.tasks : [];
  const targetId = taskId || activeHalfwayTaskId || (tasks.find(t => t.status !== 'COMPLETED')?.id) || (tasks[0]?.id);
  if (!targetId) {
    showToast('No active milestone selected to extend.', true);
    return;
  }
  document.getElementById('ext-task-id').value = targetId;
  const foundTask = tasks.find(t => t.id == targetId);
  const title = taskTitle || (foundTask ? foundTask.title : 'Current Milestone Phase');
  const titleDisplay = document.getElementById('ext-task-title-display');
  if (titleDisplay) {
    titleDisplay.textContent = title;
  }
  document.getElementById('ext-reason').value = '';
  const modal = document.getElementById('extension-modal');
  if (modal) modal.classList.add('open');
}
window.openExtensionModal = openExtensionModal;

function closeExtensionModal() {
  const modal = document.getElementById('extension-modal');
  if (modal) modal.classList.remove('open');
}
window.closeExtensionModal = closeExtensionModal;

async function submitExtensionRequest(e) {
  e.preventDefault();
  const taskId = Number(document.getElementById('ext-task-id').value);
  const extensionDays = Number(document.getElementById('ext-days-select').value);
  const reason = document.getElementById('ext-reason').value.trim();

  const btn = document.getElementById('btn-submit-extension');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting Request...';
  }

  try {
    await API.post('api/tasks/extend', {
      taskId,
      extensionDays,
      reason
    });
    showToast(`Timeline extended by +${extensionDays} days and client notified!`);
    closeExtensionModal();
    await loadTimeline(currentProjectId);
  } catch (err) {
    showToast('Extension request failed: ' + err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm & Notify Client';
    }
  }
}
window.submitExtensionRequest = submitExtensionRequest;

async function respondHalfway(completedHalf) {
  const tasks = (currentTimelineData && Array.isArray(currentTimelineData.tasks)) ? currentTimelineData.tasks : [];
  const targetId = activeHalfwayTaskId || (tasks.find(t => t.status !== 'COMPLETED')?.id) || (tasks[0]?.id) || 1;
  try {
    await API.post('api/tasks/halfway', { taskId: targetId, completedHalf, notes: 'Freelancer confirmed progress checkpoint.' });
    if (completedHalf) {
      showToast('Awesome! 50% milestone confirmed and +100 reward points awarded!');
      updatePointsDisplay(100);
    } else {
      showToast('Progress recorded. Keep going or request an extension if needed.');
    }
    await loadTimeline(currentProjectId);
  } catch (err) {
    showToast(err.message, true);
  }
}
window.respondHalfway = respondHalfway;

async function completeTask(taskId, notes = '') {
  try {
    await API.post('api/tasks/complete', { taskId, notes });
    showToast('Phase marked 100% complete! +150 reward points awarded. Payment notification sent to client!');
    updatePointsDisplay(150);
    await loadTimeline(currentProjectId);
    loadPayments();
  } catch (err) {
    showToast(err.message, true);
  }
}
window.completeTask = completeTask;

function scrollToTask(taskId) {
  const el = document.getElementById('task-card-' + taskId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('task-highlight-pulse');
    void el.offsetWidth;
    el.classList.add('task-highlight-pulse');
  }
}
window.scrollToTask = scrollToTask;

function openCompletePhaseModal(taskId = null, taskTitle = null) {
  const tasks = (currentTimelineData && Array.isArray(currentTimelineData.tasks)) ? currentTimelineData.tasks : [];
  const targetId = taskId || activeHalfwayTaskId || (tasks.find(t => t.status !== 'COMPLETED')?.id) || (tasks[0]?.id);
  if (!targetId) {
    showToast('No active phase selected.', true);
    return;
  }
  document.getElementById('complete-phase-task-id').value = targetId;
  const foundTask = tasks.find(t => t.id == targetId);
  const title = taskTitle || (foundTask ? foundTask.title : 'Milestone Phase');
  const titleDisplay = document.getElementById('complete-phase-title-display');
  if (titleDisplay) {
    titleDisplay.textContent = title;
  }
  document.getElementById('complete-phase-notes').value = '';
  const modal = document.getElementById('phase-complete-modal');
  if (modal) modal.classList.add('open');
}
window.openCompletePhaseModal = openCompletePhaseModal;

function closeCompletePhaseModal() {
  const modal = document.getElementById('phase-complete-modal');
  if (modal) modal.classList.remove('open');
}
window.closeCompletePhaseModal = closeCompletePhaseModal;

async function submitPhaseCompletion(e) {
  e.preventDefault();
  const taskId = Number(document.getElementById('complete-phase-task-id').value);
  const notes = document.getElementById('complete-phase-notes').value.trim();

  const btn = document.getElementById('btn-submit-phase-complete');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting Deliverable...';
  }

  try {
    await API.post('api/tasks/complete', { taskId, notes });
    showToast('🎉 Phase marked completed! +150 reward points credited to your balance.');
    updatePointsDisplay(150);
    closeCompletePhaseModal();
    await loadTimeline(currentProjectId);
    loadPayments();
  } catch (err) {
    showToast('Phase completion failed: ' + err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm & Mark Phase Done (+150 Pts)';
    }
  }
}
window.submitPhaseCompletion = submitPhaseCompletion;

async function respondHalfwaySpecific(taskId, taskTitle = '') {
  const tasks = (currentTimelineData && Array.isArray(currentTimelineData.tasks)) ? currentTimelineData.tasks : [];
  const foundTask = tasks.find(t => t.id == taskId);
  const title = taskTitle || (foundTask ? foundTask.title : 'milestone');
  try {
    await API.post('api/tasks/halfway', { taskId, completedHalf: true, notes: `50% milestone confirmed for ${title}.` });
    showToast(`Awesome! 50% milestone confirmed for "${title}" and +100 reward points awarded!`);
    updatePointsDisplay(100);
    await loadTimeline(currentProjectId);
  } catch (err) {
    showToast(err.message, true);
  }
}
window.respondHalfwaySpecific = respondHalfwaySpecific;

function updatePointsDisplay(added) {
  const el1 = document.getElementById('user-points');
  const el2 = document.getElementById('card-points');
  if (el1) {
    const current = Number(el1.textContent) || 0;
    el1.textContent = current + added;
  }
  if (el2) {
    const current = Number(el2.textContent) || 0;
    el2.textContent = current + added;
  }
}

// 7. PAYMENTS
async function loadPayments() {
  const container = document.getElementById('payments-container');
  try {
    const list = await API.get('api/payments').catch(() => []);
    if (!list || list.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); padding:16px;">No milestone payments recorded yet. Completed task disbursements will appear here.</p>';
      return;
    }

    container.innerHTML = list.map(p => {
      const isSettled = p.status === 'PAID' || p.status === 'RECEIVED';
      return `
        <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--r-md); padding:18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="tag ${isSettled ? 'lo' : p.status === 'DUE_SOON' ? 'hi' : 'md'}">${p.status === 'DUE_SOON' ? 'PAYMENT DUE' : p.status}</span>
              <strong style="font-size:16px;">${escapeHtml(p.title)}</strong>
              ${p.projectTitle ? `<small style="color:var(--text-muted);">(${escapeHtml(p.projectTitle)})</small>` : ''}
            </div>
            <div style="font-size:13px; color:var(--text-muted);">
              Client: <strong>${escapeHtml(p.companyName || 'Corporate Client')}</strong>
              ${p.taskTitle ? ` &bull; Task: <em>${escapeHtml(p.taskTitle)}</em>` : ''}
            </div>
            ${p.paidAt ? `
              <div style="margin-top:4px; font-size:12px; color:#059669; font-weight:600;">
                &check; Paid on ${p.paidAt.substring(0, 16)} via In-App ${escapeHtml(p.paymentMethod || 'Escrow')} (Ref: ${escapeHtml(p.transactionRef || 'CL-SETTLED')})
              </div>
            ` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:800; color:var(--text);">$${p.amount} <small style="font-size:12px; color:var(--text-muted); font-weight:600;">${p.currency || 'USD'}</small></div>
            <div style="margin-top:6px;">
              ${isSettled ? `
                <span style="color:#059669; font-weight:700; font-size:13px; display:inline-flex; align-items:center; gap:4px;">
                  &check; Funds Deposited
                </span>
              ` : `
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                  <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientName: '${escapeHtml(p.companyName || 'Client')}', projectTitle: '${escapeHtml(p.projectTitle || p.title || '')}', type: 'PAYMENT_INQUIRY' })" title="Send Payment Reminder Automatically">✉️ Auto-Send Reminder</button>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
  }
}

async function confirmPayment(received) {
  try {
    await API.post('api/payments/confirm', { paymentId: 1, received });
    if (received) {
      showToast('Payment confirmed received! +100 reward points awarded!');
      updatePointsDisplay(100);
    } else {
      showToast('Payment marked pending. Follow-up reminder draft generated.');
    }
    loadPayments();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function draftReminder(paymentId) {
  const message = prompt('Review and approve payment reminder to client:', 'Hi, politely following up regarding our milestone invoice. Please confirm payment status.');
  if (!message) return;
  try {
    await API.post('api/payments/reminder', { paymentId, messageDraft: message });
    showToast('Payment reminder approved and sent to client!');
  } catch (err) {
    showToast(err.message, true);
  }
}

// -------------------------------------------------------------
// WALLET & WITHDRAWAL MANAGEMENT
// -------------------------------------------------------------
window.currentWalletBalance = 0;

async function loadWallet() {
  try {
    const data = await API.get('api/wallet').catch(() => null);
    if (!data) return;

    const balance = parseFloat(data.walletBalance) || 0;
    const balanceInr = parseFloat(data.walletBalanceInr) || 0;
    const earned = parseFloat(data.totalEarned) || 0;
    const earnedInr = parseFloat(data.totalEarnedInr) || 0;
    const withdrawn = parseFloat(data.totalWithdrawn) || 0;
    const withdrawnInr = parseFloat(data.totalWithdrawnInr) || 0;
    window.currentWalletBalance = balance;

    // Overview Card
    if (document.getElementById('card-wallet')) {
      document.getElementById('card-wallet').textContent = `$${balance.toFixed(2)}`;
    }
    if (document.getElementById('card-wallet-inr')) {
      document.getElementById('card-wallet-inr').textContent = `≈ ₹${balanceInr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR`;
    }

    // Wallet Bento Hub in Tab Payments
    if (document.getElementById('wallet-balance-usd')) {
      document.getElementById('wallet-balance-usd').textContent = `$${balance.toFixed(2)}`;
    }
    if (document.getElementById('wallet-balance-inr')) {
      document.getElementById('wallet-balance-inr').textContent = `≈ ₹${balanceInr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR`;
    }
    if (document.getElementById('wallet-total-earned')) {
      document.getElementById('wallet-total-earned').textContent = `$${earned.toFixed(2)}`;
    }
    if (document.getElementById('wallet-total-earned-inr')) {
      document.getElementById('wallet-total-earned-inr').textContent = `≈ ₹${earnedInr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR`;
    }
    if (document.getElementById('wallet-total-withdrawn')) {
      document.getElementById('wallet-total-withdrawn').textContent = `$${withdrawn.toFixed(2)}`;
    }
    if (document.getElementById('wallet-total-withdrawn-inr')) {
      document.getElementById('wallet-total-withdrawn-inr').textContent = `≈ ₹${withdrawnInr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR`;
    }

    // Modal Available Display
    if (document.getElementById('modal-avail-balance')) {
      document.getElementById('modal-avail-balance').textContent = `$${balance.toFixed(2)}`;
    }
    if (document.getElementById('modal-avail-balance-inr')) {
      document.getElementById('modal-avail-balance-inr').textContent = `≈ ₹${balanceInr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR`;
    }

    // Render Withdrawal History
    const wContainer = document.getElementById('withdrawals-container');
    if (wContainer) {
      const list = data.withdrawals || [];
      if (list.length === 0) {
        wContainer.innerHTML = '<p style="color:var(--text-muted); font-size:13.5px; padding:12px 0;">No withdrawals requested yet. Click "Withdraw Funds" above to cash out your balance.</p>';
      } else {
        wContainer.innerHTML = `
          <div class="table-responsive">
            <table class="clean-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Amount (USD)</th>
                  <th>Payout (INR)</th>
                  <th>Method</th>
                  <th>Account / Destination</th>
                  <th>Status</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(w => `
                  <tr>
                    <td><strong style="font-family:monospace; color:#4F46E5;">${escapeHtml(w.transactionRef)}</strong></td>
                    <td><strong style="color:var(--text); font-size:14px;">$${parseFloat(w.amount).toFixed(2)}</strong></td>
                    <td><span style="color:#059669; font-weight:700;">₹${parseFloat(w.amountInr).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span></td>
                    <td><span class="tag ${w.payoutMethod === 'UPI' ? 'purple' : w.payoutMethod === 'PAYPAL' ? 'md' : 'lo'}">${escapeHtml(w.payoutMethod)}</span></td>
                    <td><span style="color:var(--text); font-family:monospace;">${escapeHtml(w.accountInfo)}</span></td>
                    <td><span class="tag lo">&check; ${escapeHtml(w.status)}</span></td>
                    <td><small style="color:var(--text-muted);">${w.createdAt ? w.createdAt.substring(0, 16) : 'Just now'}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } catch (e) {
    console.warn('Wallet load failed:', e);
  }
}
window.loadWallet = loadWallet;

function openWithdrawModal() {
  const modal = document.getElementById('withdraw-modal');
  if (!modal) return;
  loadWallet();
  const input = document.getElementById('wdr-amount');
  if (input) {
    input.value = '';
    calcInrPreview();
  }
  const upiRadio = document.querySelector('input[name="payoutMethod"][value="UPI"]');
  if (upiRadio) {
    upiRadio.checked = true;
    onPayoutMethodChange();
  }
  modal.classList.add('open');
}
window.openWithdrawModal = openWithdrawModal;

function closeWithdrawModal() {
  const modal = document.getElementById('withdraw-modal');
  if (modal) modal.classList.remove('open');
}
window.closeWithdrawModal = closeWithdrawModal;

function setWithdrawMax() {
  const input = document.getElementById('wdr-amount');
  if (input && window.currentWalletBalance > 0) {
    input.value = window.currentWalletBalance.toFixed(2);
    calcInrPreview();
  }
}
window.setWithdrawMax = setWithdrawMax;

function calcInrPreview() {
  const input = document.getElementById('wdr-amount');
  const preview = document.getElementById('wdr-inr-preview');
  if (!preview) return;
  const val = parseFloat(input ? input.value : 0) || 0;
  const inr = val * 83.00;
  preview.textContent = `Estimated Payout: ₹${inr.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})} INR (1 USD ≈ ₹83.00)`;
}
window.calcInrPreview = calcInrPreview;

function onPayoutMethodChange() {
  const selected = document.querySelector('input[name="payoutMethod"]:checked')?.value || 'UPI';
  
  const upiField = document.getElementById('payout-field-upi');
  const bankField = document.getElementById('payout-field-bank');
  const paypalField = document.getElementById('payout-field-paypal');

  if (upiField) upiField.style.display = selected === 'UPI' ? 'block' : 'none';
  if (bankField) bankField.style.display = selected === 'BANK_TRANSFER' ? 'block' : 'none';
  if (paypalField) paypalField.style.display = selected === 'PAYPAL' ? 'block' : 'none';

  // Highlight active label
  ['upi', 'bank', 'paypal'].forEach(m => {
    const el = document.getElementById(`label-method-${m}`);
    if (el) {
      if ((m === 'upi' && selected === 'UPI') ||
          (m === 'bank' && selected === 'BANK_TRANSFER') ||
          (m === 'paypal' && selected === 'PAYPAL')) {
        el.style.borderColor = 'var(--primary)';
        el.style.background = 'var(--lavender-subtle)';
      } else {
        el.style.borderColor = 'var(--border)';
        el.style.background = 'transparent';
      }
    }
  });
}
window.onPayoutMethodChange = onPayoutMethodChange;

async function submitWithdrawal(event) {
  event.preventDefault();
  const amtInput = document.getElementById('wdr-amount');
  const amount = parseFloat(amtInput ? amtInput.value : 0);
  if (!amount || amount <= 0) {
    showToast('Please enter a valid withdrawal amount.', true);
    return;
  }
  if (amount > window.currentWalletBalance) {
    showToast(`Withdrawal amount ($${amount.toFixed(2)}) exceeds available wallet balance ($${window.currentWalletBalance.toFixed(2)}).`, true);
    return;
  }

  const selectedMethod = document.querySelector('input[name="payoutMethod"]:checked')?.value || 'UPI';
  let accountInfo = '';

  if (selectedMethod === 'UPI') {
    const upi = document.getElementById('wdr-upi-id')?.value.trim();
    if (!upi) {
      showToast('Please enter your UPI ID (e.g. user@okhdfcbank)', true);
      return;
    }
    accountInfo = `UPI: ${upi}`;
  } else if (selectedMethod === 'BANK_TRANSFER') {
    const name = document.getElementById('wdr-bank-name')?.value.trim();
    const acc = document.getElementById('wdr-bank-acc')?.value.trim();
    const ifsc = document.getElementById('wdr-bank-ifsc')?.value.trim();
    const branch = document.getElementById('wdr-bank-branch')?.value.trim();
    if (!name || !acc || !ifsc) {
      showToast('Please enter beneficiary name, account number, and IFSC code.', true);
      return;
    }
    accountInfo = `A/C: ${acc} (${ifsc}) - ${name}${branch ? ` [${branch}]` : ''}`;
  } else if (selectedMethod === 'PAYPAL') {
    const email = document.getElementById('wdr-paypal-email')?.value.trim();
    if (!email) {
      showToast('Please enter your PayPal email address.', true);
      return;
    }
    accountInfo = `PayPal: ${email}`;
  }

  const btn = document.getElementById('btn-submit-withdraw');
  const originalText = btn ? btn.innerHTML : 'Confirm & Withdraw';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing Payout...';
  }

  try {
    const res = await API.post('api/wallet/withdraw', {
      amount,
      payoutMethod: selectedMethod,
      accountInfo
    });

    closeWithdrawModal();
    showToast(`🎉 Payout of $${parseFloat(res.amount).toFixed(2)} (₹${parseFloat(res.amountInr).toLocaleString('en-IN')} INR) processed successfully! Ref: ${res.transactionRef}`);
    await loadWallet();
    await loadPayments();
    await checkNotifications();
  } catch (err) {
    showToast(err.message || 'Withdrawal failed. Please try again.', true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}
window.submitWithdrawal = submitWithdrawal;

// 8. CHAT
async function loadConversations() {
  const list = document.getElementById('conv-list');
  try {
    const convs = await API.get('api/conversations');
    if (!convs || convs.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No conversations yet.</p>';
      return;
    }

    list.innerHTML = convs.map(c => `
      <div onclick="selectConversation(${c.id}, '${escapeHtml(c.partnerName)}', ${c.partnerId})" style="padding:12px; border-radius:var(--r-sm); margin-bottom:6px; cursor:pointer; background:#F8FAFB; border:1px solid var(--border);">
        <strong style="font-size:14px; display:block;">${escapeHtml(c.partnerName)}</strong>
        <p style="font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(c.lastMessage || 'Start conversation')}</p>
      </div>
    `).join('');
    if (convs.length > 0) {
      selectConversation(convs[0].id, convs[0].partnerName, convs[0].partnerId);
    }
  } catch (err) {
    list.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
  }
}

async function selectConversation(convId, partnerName, partnerId) {
  activeConvId = convId;
  document.getElementById('chat-header').textContent = `Chat with ${partnerName}`;
  loadMessages();
}

async function loadMessages() {
  if (!activeConvId) return;
  const container = document.getElementById('chat-messages');
  try {
    const msgs = await API.get(`api/messages?conversationId=${activeConvId}`);
    container.innerHTML = msgs.map(m => `
      <div style="align-self:${m.isMine ? 'flex-end' : 'flex-start'}; max-width:75%; background:${m.isMine ? '#13845F' : '#EAEFEA'}; color:${m.isMine ? '#FFFFFF' : '#151A18'}; padding:10px 14px; border-radius:14px; font-size:13.5px;">
        ${escapeHtml(m.messageText)}
        <small style="display:block; font-size:10.5px; opacity:0.8; margin-top:4px; text-align:right;">${m.createdAt.substring(11, 16)}</small>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Chat load error:', err);
  }
}

async function sendChatMessage() {
  if (!activeConvId) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    await API.post('api/messages', { conversationId: activeConvId, text });
    input.value = '';
    loadMessages();
  } catch (err) {
    showToast(err.message, true);
  }
}

// Notifications delegation
async function checkNotifications() {
  if (typeof window.loadNotifications === 'function') {
    return window.loadNotifications();
  }
}

function saveProfile() {
  const name = document.getElementById('prof-fullname').value.trim();
  const country = document.getElementById('prof-country').value.trim();
  const hourly = document.getElementById('prof-hourly').value.trim();
  const bio = document.getElementById('prof-bio').value.trim();

  if (document.getElementById('profile-name-display')) {
    document.getElementById('profile-name-display').textContent = name || 'Alex Mercer';
  }
  showToast('Freelancer profile updated successfully!');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
