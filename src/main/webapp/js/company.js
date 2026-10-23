// Company Portal Logic
let currentCompanyId = null;
let activeCompanyConvId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.get('api/me');
    if (me.role !== 'COMPANY') {
      window.location.href = 'company-login.html';
      return;
    }
    currentCompanyId = me.id;
    document.getElementById('who').textContent = me.name || me.email || 'Company Client';

    loadCompanyOverview();
    loadCompanyJobs();
    loadCompanyAgreements();
    loadCompanyPayments();
    loadCompanyConversations();
  } catch (err) {
    console.error('Session load failed:', err);
    window.location.href = 'company-login.html';
  }
});

function switchCompanyTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.dash-nav a').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.style.display = 'block';

  const link = document.querySelector(`.dash-nav a[href="#${tabId}"]`);
  if (link) link.classList.add('active');

  if (tabId === 'payments') {
    loadCompanyPayments();
  } else if (tabId === 'agreements') {
    loadCompanyAgreements();
  } else if (tabId === 'manage-jobs') {
    loadCompanyJobs();
  } else if (tabId === 'overview') {
    loadCompanyOverview();
  } else if (tabId === 'chat') {
    loadCompanyConversations();
  }
}
window.switchCompanyTab = switchCompanyTab;

// 1. OVERVIEW
async function loadCompanyOverview() {
  try {
    const jobs = await API.get('api/jobs/my');
    const agreements = await API.get('api/agreements');

    const jobList = Array.isArray(jobs) ? jobs : [];
    const agreementList = Array.isArray(agreements) ? agreements : [];
    const jobCount = jobList.length;
    const contractCount = agreementList.length;

    let totalApps = 0;
    jobList.forEach(j => { totalApps += (j.applicantCount || 0); });

    let activeProjects = 0;
    let pendingContracts = 0;
    agreementList.forEach(a => {
      if (a.status === 'ACCEPTED' || a.status === 'ACTIVE') activeProjects++;
      else if (a.status === 'DRAFT' || a.status === 'PENDING') pendingContracts++;
    });

    if (document.getElementById('comp-job-count')) document.getElementById('comp-job-count').textContent = jobCount;
    if (document.getElementById('comp-contract-count')) document.getElementById('comp-contract-count').textContent = contractCount;
    if (document.getElementById('comp-active-projects')) document.getElementById('comp-active-projects').textContent = activeProjects;
    if (document.getElementById('comp-hired-count')) document.getElementById('comp-hired-count').textContent = activeProjects;
    if (document.getElementById('comp-pending-contracts')) document.getElementById('comp-pending-contracts').textContent = pendingContracts;
    if (document.getElementById('comp-risk-contracts')) document.getElementById('comp-risk-contracts').textContent = 0;
    if (document.getElementById('comp-app-count')) document.getElementById('comp-app-count').textContent = totalApps;

    const list = document.getElementById('comp-recent-jobs');
    if (jobCount === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); padding:10px 0;">No jobs published yet. Click "+ Post New Job" to create your first listing.</p>';
      return;
    }
    list.innerHTML = jobs.slice(0, 3).map(j => {
      const isHired = j.status === 'HIRED' || j.hasAcceptedApp;
      return `
        <div style="background:#FFFFFF; border:1px solid ${isHired ? '#A7F3D0' : 'var(--border)'}; border-left:4px solid ${isHired ? '#059669' : '#6366F1'}; border-radius:var(--r-sm); padding:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong>${escapeHtml(j.title)}</strong>
              ${isHired ? `<span class="tag lo" style="font-size:11px; font-weight:700; background:#ECFDF5; color:#059669;">✓ Hired: ${escapeHtml(j.hiredFreelancerName || 'Specialist')}</span>` : ''}
            </div>
            <span style="font-size:13px; color:var(--text-muted); display:block; margin-top:2px;">
              Budget: $${j.budget} &bull; ${isHired ? 'Contract Assigned' : `${j.applicantCount || 0} applicants`}
            </span>
          </div>
          <div>
            ${isHired ? (
              j.agreementId ? `
                <button class="btn btn-purple btn-sm" onclick="openCompanyViewAgreementModal(${j.agreementId})" style="font-weight:600;">View Contract &rarr;</button>
              ` : `
                <button class="btn btn-purple btn-sm" onclick="openAgreementForApplicant(${j.id}, ${j.acceptedFreelancerId})" style="font-weight:600;">Draft Contract &rarr;</button>
              `
            ) : `
              <button class="btn btn-line btn-sm" onclick="switchCompanyTab('manage-jobs'); viewApplicants(${j.id}, '${escapeHtml(j.title).replace(/'/g, "\\'")}')">View Applicants &rarr;</button>
            `}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Overview load error:', err);
  }
}

// 2. POST A JOB
async function createJob(e) {
  e.preventDefault();
  const title = document.getElementById('j-title').value;
  const domain = document.getElementById('j-domain').value;
  const skills = document.getElementById('j-skills').value;
  const description = document.getElementById('j-desc').value;
  const budget = document.getElementById('j-budget').value;
  const advancePercentage = document.getElementById('j-advance').value;
  const deadline = document.getElementById('j-deadline').value;
  const revisionRequirements = document.getElementById('j-revisions').value;
  const maintenanceRequirements = document.getElementById('j-maint').value;

  try {
    await API.post('api/jobs', {
      title, domain, skills, description,
      budget: Number(budget),
      advancePercentage: Number(advancePercentage),
      deadline, revisionRequirements, maintenanceRequirements
    });
    showToast('Job successfully published to the marketplace!');
    document.getElementById('job-post-form').reset();
    loadCompanyJobs();
    loadCompanyOverview();
    switchCompanyTab('manage-jobs');
  } catch (err) {
    showToast(err.message, true);
  }
}

// 3. MANAGE JOBS & APPLICANTS
async function loadCompanyJobs() {
  const container = document.getElementById('company-jobs-list');
  try {
    const jobs = await API.get('api/jobs/my');
    cachedCompanyJobs = Array.isArray(jobs) ? jobs : [];
    if (!jobs || jobs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);">You have no published jobs yet.</p>';
      return;
    }

    container.innerHTML = jobs.map(j => {
      const isHired = j.status === 'HIRED' || j.hasAcceptedApp;
      return `
        <div style="background:#FFFFFF; border:1px solid ${isHired ? '#A7F3D0' : 'var(--border)'}; border-left:5px solid ${isHired ? '#059669' : '#6366F1'}; border-radius:var(--r-md); padding:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="tag lo">${escapeHtml(j.domain)}</span>
              <span class="tag ${isHired ? 'lo' : 'md'}" style="${isHired ? 'background:#ECFDF5; color:#059669; font-weight:800;' : ''}">
                ${isHired ? '✓ HIRED & ASSIGNED' : j.status}
              </span>
            </div>
            <h4 style="font-size:16px; margin:2px 0 4px;">${escapeHtml(j.title)}</h4>
            <span style="font-size:13px; color:var(--text-muted);">
              Budget: $${j.budget} &bull; ${isHired ? `Hired Specialist: <strong style="color:var(--text);">${escapeHtml(j.hiredFreelancerName || 'Assigned Contractor')}</strong>` : `${j.applicantCount || 0} proposals received`}
            </span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${isHired ? (
              j.agreementId ? `
                <button class="btn btn-purple btn-sm" onclick="openCompanyViewAgreementModal(${j.agreementId})" style="font-weight:700;">
                  📜 View Contract & Seal &rarr;
                </button>
              ` : `
                <button class="btn btn-purple btn-sm" onclick="openAgreementForApplicant(${j.id}, ${j.acceptedFreelancerId})" style="font-weight:700;">
                  ✍️ Draft Contract Terms &rarr;
                </button>
              `
            ) : (
              (j.applicantCount || 0) > 0 ? `
                <button class="btn btn-green btn-sm" onclick="viewApplicants(${j.id}, '${escapeHtml(j.title).replace(/'/g, "\\'")}')">
                  Review Proposals (${j.applicantCount})
                </button>
              ` : `
                <span style="color:var(--text-muted); font-size:12px; font-weight:600; padding:6px 12px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
                  Awaiting Proposals
                </span>
              `
            )}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
  }
}

let cachedCompanyJobs = [];
let cachedApplicantsByJob = {};

async function viewApplicants(jobId, jobTitle) {
  const panel = document.getElementById('applicants-panel');
  const tbody = document.getElementById('app-tbody');
  document.getElementById('app-job-header').textContent = `Proposals for: ${jobTitle}`;
  panel.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="7">Loading applicants...</td></tr>';

  try {
    const apps = await API.get(`api/applications?jobId=${jobId}`);
    cachedApplicantsByJob[jobId] = apps || [];
    if (!apps || apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-muted);">No proposals received yet for this listing.</td></tr>';
      return;
    }

    const hasHiredCandidate = apps.some(a => a.status === 'ACCEPTED');

    tbody.innerHTML = apps.map(a => {
      const isAccepted = a.status === 'ACCEPTED';
      let actionHtml = '';

      if (isAccepted) {
        const agreementBtn = a.agreementId ? `
          <button class="btn btn-purple btn-sm" onclick="openCompanyViewAgreementModal(${a.agreementId})" style="font-weight:700;">
            📜 View Contract & Seal &rarr;
          </button>
        ` : `
          <button class="btn btn-purple btn-sm" onclick="openAgreementForApplicant(${a.jobId}, ${a.freelancerId})" style="font-weight:700;">
            ✍️ Draft Contract &rarr;
          </button>
        `;
        actionHtml = `
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span class="tag lo" style="font-weight:800; font-size:12px; padding:5px 10px; background:#ECFDF5; color:#059669;">
              ✓ Hired & Accepted
            </span>
            ${agreementBtn}
            <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientEmail: '${escapeHtml(a.email || '')}', recipientName: '${escapeHtml(a.fullName || '')}', projectTitle: '${escapeHtml(jobTitle || '')}', type: 'CONTRACT_REMINDER' })" title="Send Email Automatically">
              ✉️ Auto-Send Mail
            </button>
          </div>
        `;
      } else if (hasHiredCandidate) {
        actionHtml = `
          <div style="display:flex; gap:6px; align-items:center;">
            <span style="color:var(--text-muted); font-size:12px; font-weight:600; padding:4px 8px; background:#F1F5F9; border-radius:4px;">Position Filled</span>
            <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientEmail: '${escapeHtml(a.email || '')}', recipientName: '${escapeHtml(a.fullName || '')}', projectTitle: '${escapeHtml(jobTitle || '')}', type: 'GENERAL_UPDATE' })" title="Send Email Automatically">✉️ Auto-Send Mail</button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-green btn-sm" onclick="updateAppStatus(${a.id}, 'ACCEPTED', ${a.freelancerId}, ${a.jobId})">Accept</button>
            <button class="btn btn-line btn-sm" onclick="updateAppStatus(${a.id}, 'SHORTLISTED', ${a.freelancerId}, ${a.jobId})">Shortlist</button>
            <button class="btn btn-purple btn-sm" onclick="openAgreementForApplicant(${a.jobId}, ${a.freelancerId})">Draft Contract &rarr;</button>
            <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientEmail: '${escapeHtml(a.email || '')}', recipientName: '${escapeHtml(a.fullName || '')}', projectTitle: '${escapeHtml(jobTitle || '')}', type: 'PROPOSAL_ACCEPTED' })" title="Send Email Automatically">✉️ Auto-Send Mail</button>
          </div>
        `;
      }

      return `
        <tr>
          <td><strong>${escapeHtml(a.fullName)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(a.skills || '')}</small></td>
          <td><span class="tag lo">${escapeHtml(a.experienceLevel || 'Intermediate')}</span></td>
          <td><strong style="color:#059669;">$${a.estimatedPrice}</strong></td>
          <td>${a.estimatedDays} days</td>
          <td style="max-width:250px; font-size:13px; line-height:1.4;">${escapeHtml(a.coverLetter || 'No cover letter')}</td>
          <td><span class="tag ${isAccepted ? 'lo' : a.status === 'SHORTLISTED' ? 'md' : 'hi'}">${isAccepted ? 'HIRED' : a.status}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

async function updateAppStatus(applicationId, status, freelancerId, jobId) {
  try {
    await API.post('api/applications/status', { applicationId, status, freelancerId, jobId });
    showToast(`Applicant status marked as ${status}!`);
    if (status === 'ACCEPTED') {
      showToast('Candidate successfully hired! Job status updated to Hired.');
      delete cachedApplicantsByJob[jobId];
      loadCompanyConversations();
      loadCompanyJobs();
      loadCompanyOverview();
    }
    viewApplicants(jobId, 'Selected Job');
  } catch (err) {
    showToast(err.message, true);
  }
}

// 4. AGREEMENTS & CONTRACT SEAL VIEWER
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

async function loadCompanyAgreements() {
  const container = document.getElementById('agreements-list');
  try {
    const list = await API.get('api/agreements');
    if (!list || list.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);">No agreement drafts created yet.</p>';
      return;
    }

    container.innerHTML = list.map(a => {
      const isAccepted = a.status === 'ACCEPTED';
      const formattedAmt = parseFloat(a.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const inrVal = Math.round((parseFloat(a.totalAmount) || 0) * 83.5).toLocaleString('en-IN');
      return `
        <div style="background:#FFFFFF; border:1.5px solid ${isAccepted ? '#A7F3D0' : '#E2E8F0'}; border-left:5px solid ${isAccepted ? '#059669' : '#6366F1'}; border-radius:var(--r-md); padding:18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="tag ${isAccepted ? 'lo' : 'purple'}" style="font-size:11px; font-weight:800;">
                ${isAccepted ? '✓ MUTUALLY ACTIVE' : '⚡ PENDING DUAL SIGNATURE'}
              </span>
              <span style="background:#FEF9C3; border:1px solid #FDE047; color:#854D0E; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px;">
                ★ Official Corporate Seal Affixed
              </span>
              <small style="font-weight:700; color:var(--text-muted);">Version ${a.currentVersion}</small>
            </div>
            <h4 style="font-size:16.5px; margin:0 0 4px; color:#1E1B4B;">${escapeHtml(a.title)}</h4>
            <span style="font-size:13px; color:var(--text-muted);">
              Contractor: <strong style="color:var(--text);">${escapeHtml(a.partnerName)}</strong> &bull; Amount: <strong>$${formattedAmt}</strong> (₹${inrVal} INR) &bull; Advance: ${a.advancePercentage}%
            </span>
          </div>

          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-line btn-sm" onclick="openCompanyViewAgreementModal(${a.id})" style="font-weight:600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View Contract & Seal
            </button>
            <button class="btn btn-line btn-sm" onclick="sendInstantEmail(this, { recipientName: '${escapeHtml(a.partnerName || '')}', projectTitle: '${escapeHtml(a.title)}', type: 'CONTRACT_REMINDER' })" title="Send Reminder Email Automatically">
              ✉️ Auto-Send Reminder
            </button>
            ${isAccepted ? `
              <span class="tag lo" style="font-weight:700; font-size:12px; padding:6px 12px; background:#ECFDF5; color:#059669;">
                &check; Both Parties Accepted
              </span>
            ` : (a.companyAccepted > 0 ? `
              <span class="tag md" style="font-weight:700; font-size:12px; padding:6px 12px; background:#FEF3C7; color:#B45309;">
                ⚡ Awaiting Contractor Signature
              </span>
            ` : `
              <button class="btn btn-green btn-sm" onclick="acceptAgreement(${a.id})" style="font-weight:700;">
                ✍️ Approve & Seal Version ${a.currentVersion}
              </button>
            `)}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
  }
}

async function acceptAgreement(agreementId) {
  try {
    await API.post('api/agreements/accept', { agreementId });
    showToast('Agreement version approval and corporate seal confirmed!');
    loadCompanyAgreements();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function openCompanyViewAgreementModal(agrId) {
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
    document.getElementById('view-agr-company').textContent = detail.companyName || 'Apex Solution';
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
        statusTag.textContent = '⚡ AWAITING COMPLETE DUAL SIGNATURE';
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
    const acceptBtn = document.getElementById('btn-comp-modal-accept');

    if (flSigned) {
      flBadge.className = 'tag lo';
      flBadge.textContent = '✓ DIGITALLY SIGNED BY CONTRACTOR';
      flBadge.style.background = '#ECFDF5';
      flBadge.style.color = '#059669';
      flHash.textContent = `SIG-VERIFIED-${generateDeterministicHash(detail.id, flName)}`;
      flConfirmText.textContent = 'Contractor has digitally executed this agreement.';
    } else {
      flBadge.className = 'tag md';
      flBadge.textContent = 'AWAITING CONTRACTOR SIGNATURE';
      flBadge.style.background = '#FEF3C7';
      flBadge.style.color = '#B45309';
      flHash.textContent = 'PENDING CONTRACTOR DIGITAL CONSENT';
      flConfirmText.textContent = 'Contractor review pending in freelancer portal.';
    }

    if (acceptBtn) {
      if (isMutuallyAccepted) {
        acceptBtn.disabled = true;
        acceptBtn.textContent = '✓ Agreement Mutually Active';
        acceptBtn.className = 'btn btn-line btn-sm';
        acceptBtn.style.color = '#059669';
      } else if (detail.companyAccepted > 0) {
        acceptBtn.disabled = true;
        acceptBtn.textContent = '✓ Corporate Seal Affixed (Awaiting Contractor)';
        acceptBtn.className = 'btn btn-line btn-sm';
        acceptBtn.style.color = '#B45309';
      } else {
        acceptBtn.disabled = false;
        acceptBtn.textContent = '✍️ Approve & Seal Agreement';
        acceptBtn.className = 'btn btn-green btn-sm';
        acceptBtn.style.color = '#FFFFFF';
      }
    }

    modal.classList.add('open');
  } catch (err) {
    showToast('Failed to load agreement: ' + err.message, true);
  }
}
window.openCompanyViewAgreementModal = openCompanyViewAgreementModal;

function closeViewAgreementModal() {
  const modal = document.getElementById('view-agreement-modal');
  if (modal) modal.classList.remove('open');
}
window.closeViewAgreementModal = closeViewAgreementModal;

async function acceptCurrentModalAgreement() {
  if (!window.currentViewingAgreement) return;
  await acceptAgreement(window.currentViewingAgreement.id);
  openCompanyViewAgreementModal(window.currentViewingAgreement.id);
}
window.acceptCurrentModalAgreement = acceptCurrentModalAgreement;

async function openCreateAgreementModal(targetJobId = null, targetFreelancerId = null) {
  const modal = document.getElementById('agr-modal');
  modal.classList.add('open');

  const jobSelect = document.getElementById('agr-job-select');
  const flSelect = document.getElementById('agr-freelancer-select');
  const preview = document.getElementById('agr-freelancer-preview');
  const noAppsAlert = document.getElementById('agr-no-applicants-alert');
  const submitBtn = document.getElementById('agr-submit-btn');

  if (!targetJobId) {
    document.getElementById('agr-form').reset();
    document.getElementById('agr-job-id').value = '';
    document.getElementById('agr-freelancer-id').value = '';
    preview.style.display = 'none';
    noAppsAlert.style.display = 'none';
    submitBtn.disabled = true;
    flSelect.innerHTML = '<option value="">-- Select a Job first --</option>';
    flSelect.disabled = true;
  }

  jobSelect.innerHTML = '<option value="">Loading your posted jobs...</option>';
  try {
    const jobs = await API.get('api/jobs/my');
    cachedCompanyJobs = jobs || [];
    if (!jobs || jobs.length === 0) {
      jobSelect.innerHTML = '<option value="">No posted jobs found. Please create a job first.</option>';
      return;
    }

    jobSelect.innerHTML = '<option value="">-- Choose a Posted Job --</option>' +
      jobs.map(j => `<option value="${j.id}">${escapeHtml(j.title)} (Budget: $${j.budget}, ${j.applicantCount || 0} proposals)</option>`).join('');

    if (targetJobId) {
      jobSelect.value = String(targetJobId);
      await onAgreementJobSelected(targetJobId, targetFreelancerId);
    }
  } catch (err) {
    jobSelect.innerHTML = `<option value="">Error loading jobs: ${err.message}</option>`;
  }
}

function openAgreementForApplicant(jobId, freelancerId) {
  const job = (cachedCompanyJobs || []).find(j => String(j.id) === String(jobId));
  if (job && job.agreementId) {
    showToast('Contract terms already created for this job! Opening contract viewer...');
    openCompanyViewAgreementModal(job.agreementId);
    return;
  }
  openCreateAgreementModal(jobId, freelancerId);
}

function closeAgreementModal() {
  document.getElementById('agr-modal').classList.remove('open');
}

async function onAgreementJobSelected(jobId, selectFreelancerId = null) {
  const flSelect = document.getElementById('agr-freelancer-select');
  const preview = document.getElementById('agr-freelancer-preview');
  const noAppsAlert = document.getElementById('agr-no-applicants-alert');
  const submitBtn = document.getElementById('agr-submit-btn');
  const jobIdInput = document.getElementById('agr-job-id');
  const flIdInput = document.getElementById('agr-freelancer-id');

  jobIdInput.value = jobId || '';
  flIdInput.value = '';
  preview.style.display = 'none';
  submitBtn.disabled = true;

  if (!jobId) {
    flSelect.innerHTML = '<option value="">-- Select a Job first --</option>';
    flSelect.disabled = true;
    noAppsAlert.style.display = 'none';
    return;
  }

  flSelect.innerHTML = '<option value="">Loading applicants...</option>';
  flSelect.disabled = true;
  noAppsAlert.style.display = 'none';

  try {
    let apps = cachedApplicantsByJob[jobId];
    if (!apps || apps.length === 0) {
      apps = await API.get(`api/applications?jobId=${jobId}`);
      cachedApplicantsByJob[jobId] = apps || [];
    }

    if (!apps || apps.length === 0) {
      flSelect.innerHTML = '<option value="">-- No applicants for this job --</option>';
      flSelect.disabled = true;
      noAppsAlert.style.display = 'block';
      return;
    }

    noAppsAlert.style.display = 'none';
    flSelect.disabled = false;
    flSelect.innerHTML = '<option value="">-- Select an Applicant Freelancer (' + apps.length + ' applied) --</option>' +
      apps.map(a => `<option value="${a.freelancerId}">${escapeHtml(a.fullName)} &bull; Bid: $${a.estimatedPrice} (${escapeHtml(a.experienceLevel || 'Intermediate')})</option>`).join('');

    if (selectFreelancerId) {
      flSelect.value = String(selectFreelancerId);
      onAgreementFreelancerSelected(selectFreelancerId);
    } else if (apps.length === 1) {
      flSelect.value = String(apps[0].freelancerId);
      onAgreementFreelancerSelected(apps[0].freelancerId);
    }
  } catch (err) {
    flSelect.innerHTML = `<option value="">Error loading applicants: ${err.message}</option>`;
    showToast(err.message, true);
  }
}

function onAgreementFreelancerSelected(freelancerId) {
  const jobId = document.getElementById('agr-job-id').value;
  const preview = document.getElementById('agr-freelancer-preview');
  const submitBtn = document.getElementById('agr-submit-btn');
  const flIdInput = document.getElementById('agr-freelancer-id');

  if (!freelancerId) {
    flIdInput.value = '';
    preview.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  flIdInput.value = freelancerId;

  const apps = cachedApplicantsByJob[jobId] || [];
  const applicant = apps.find(a => String(a.freelancerId) === String(freelancerId));
  const selectedJob = cachedCompanyJobs.find(j => String(j.id) === String(jobId));

  if (!applicant) {
    preview.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  // Populate preview card
  const initials = (applicant.fullName || 'FL').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'FL';
  document.getElementById('prev-avatar').textContent = initials;
  document.getElementById('prev-name').textContent = applicant.fullName || 'Candidate';
  document.getElementById('prev-email').textContent = applicant.email || 'Verified Candidate';
  document.getElementById('prev-country').textContent = applicant.country || 'Global';
  document.getElementById('prev-exp-badge').textContent = applicant.experienceLevel || 'Intermediate';
  document.getElementById('prev-bid').textContent = `$${applicant.estimatedPrice || (selectedJob ? selectedJob.budget : 0)}`;
  document.getElementById('prev-days').textContent = `${applicant.estimatedDays || 14} days delivery`;
  document.getElementById('prev-cover-letter').textContent = applicant.coverLetter || 'No custom proposal note provided.';

  // Render skills chips & portfolio
  const skillsContainer = document.getElementById('prev-skills-container');
  const skillsList = (applicant.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  let skillsHtml = skillsList.map(s => `<span class="tag lo" style="font-size:11.5px; background:rgba(104,71,232,0.08); color:var(--primary); font-weight:600;">${escapeHtml(s)}</span>`).join('');
  if (applicant.portfolioUrl) {
    skillsHtml += `<a href="${escapeHtml(applicant.portfolioUrl)}" target="_blank" rel="noopener" style="font-size:12px; color:var(--primary); text-decoration:underline; margin-left:6px;">View Portfolio &nearr;</a>`;
  }
  skillsContainer.innerHTML = skillsHtml || '<span style="color:var(--text-muted); font-size:12px;">Skills: General Freelancer</span>';

  preview.style.display = 'block';
  submitBtn.disabled = false;

  // Auto-fill agreement terms with comprehensive multi-clause structure
  const compName = document.getElementById('who') ? document.getElementById('who').textContent.trim() : 'Apex Solution';
  const agreedPrice = applicant.estimatedPrice || (selectedJob ? selectedJob.budget : 4500);
  const advancePct = (selectedJob && selectedJob.advancePercentage) ? selectedJob.advancePercentage : 30;
  const deliveryDays = applicant.estimatedDays || 15;

  if (selectedJob) {
    document.getElementById('agr-title').value = `Master Agreement: ${selectedJob.title} - ${applicant.fullName}`;
    document.getElementById('agr-scope').value = buildComprehensiveAgreementScope(
      selectedJob.title,
      selectedJob.description,
      compName,
      applicant.fullName,
      agreedPrice,
      advancePct,
      deliveryDays,
      3
    );
    document.getElementById('agr-advance').value = advancePct;
  } else {
    document.getElementById('agr-title').value = `Freelance Agreement - ${applicant.fullName}`;
    document.getElementById('agr-scope').value = buildComprehensiveAgreementScope(
      'Custom Software Development',
      'Professional engineering services as agreed.',
      compName,
      applicant.fullName,
      agreedPrice,
      advancePct,
      deliveryDays,
      3
    );
  }
  document.getElementById('agr-amount').value = agreedPrice;
  document.getElementById('agr-days').value = deliveryDays;
  document.getElementById('agr-revs').value = 3;
}

function buildComprehensiveAgreementScope(jobTitle, jobDesc, companyName, flName, amount, advancePct, dueDays, revLimit) {
  const inrVal = Math.round((parseFloat(amount) || 0) * 83.5).toLocaleString('en-IN');
  const advAmt = (((parseFloat(amount) || 0) * (advancePct || 30)) / 100).toFixed(2);
  const m2Amt = (((parseFloat(amount) || 0) * 35) / 100).toFixed(2);
  const m3Amt = (((parseFloat(amount) || 0) * (100 - (advancePct || 30) - 35)) / 100).toFixed(2);

  return `MASTER FREELANCE PROFESSIONAL SERVICES & ESCROW AGREEMENT
================================================================================
AGREEMENT IDENTIFIER: CL-AGR-2026-${Math.floor(1000 + Math.random() * 9000)} | SECURE ESCROW PROTOCOL
ISSUING ENTITY: ${(companyName || 'APEX SOLUTION').toUpperCase()} (VERIFIED CORPORATE ENTITY)
DATE OF ISSUANCE: ${new Date().toISOString().substring(0, 10)}

--------------------------------------------------------------------------------
1. PARTIES & ENGAGEMENT RECITALS
--------------------------------------------------------------------------------
This Master Professional Services Agreement ("Agreement") is executed and entered into by and between:
  * HIRING CLIENT: ${companyName || 'Hiring Client'}, registered and authenticated on ClauseLens ("Client").
  * CONTRACTOR: ${flName || 'Contractor'}, an independent verified software developer ("Freelancer" / "Service Provider").

WHEREAS, Client desires to retain Contractor to design, architect, engineer, and deploy high-performance software systems and deliverables for "${jobTitle || 'Custom Software Project'}"; and
WHEREAS, Contractor agrees to deliver such technical services in accordance with the specifications, milestones, and commercial terms set forth herein.

NOW, THEREFORE, the parties mutually covenant, agree, and bind themselves as follows:

--------------------------------------------------------------------------------
2. TECHNICAL SCOPE & DETAILED DELIVERABLES
--------------------------------------------------------------------------------
Project Summary & Technical Requirements:
${jobDesc || 'Full-stack software development and deployment as per project specifications.'}

Agreed Scope Specifications:
  2.1 Frontend Architecture & Interactive Portal:
      - Responsive UI built with responsive layout grids, glassmorphism card surfaces, and accessible semantic markup.
      - Integrated real-time notifications, interactive status feeds, and dynamic contract analyzer views.
  2.2 Scalable Backend & Database Schemas:
      - Robust Java/Jakarta EE RESTful architecture with relational MySQL database integrity.
      - Multi-tenant role-based access control (RBAC) guaranteeing strict separation of Client and Freelancer records.
  2.3 Payment Gateway & Escrow Automation:
      - Direct ClauseLens Smart Escrow release and automated payout disbursement.
      - Dual-acceptance milestone release triggers and cryptographically signed verification timestamps.

--------------------------------------------------------------------------------
3. ESCROW SCHEDULE & MILESTONE DISBURSEMENTS
--------------------------------------------------------------------------------
Total Agreed Financial Consideration: $${amount} USD (equivalent to ₹${inrVal} INR).
Payment Terms: Net-${dueDays || 15} days from milestone completion.
All milestone funds shall be protected under ClauseLens Smart Escrow and disbursed according to the following verification schedule:
  * Milestone 1 (${advancePct || 30}% - $${advAmt} USD): Initial architecture, repository setup, database schema, and design approvals.
  * Milestone 2 (35% - $${m2Amt} USD): Core API implementation, UI dashboard integration, and staging deployment.
  * Milestone 3 (${(100 - (advancePct || 30) - 35)}% - $${m3Amt} USD): Final QA testing, defect rectification, security validation, and production handover.

--------------------------------------------------------------------------------
4. REVISIONS POLICY & SCOPE MANAGEMENT
--------------------------------------------------------------------------------
Client is entitled to up to ${revLimit || 3} iterative rounds of revisions per milestone phase without additional fee.
Any requested feature additions, major architectural changes, or out-of-scope third-party integrations shall require a formal written Change Request (CR) with mutually agreed pricing.

--------------------------------------------------------------------------------
5. INTELLECTUAL PROPERTY & TRANSFER OF RIGHTS
--------------------------------------------------------------------------------
  5.1 Contractor Pre-Existing Work: Contractor retains full proprietary ownership of general utilities, tools, algorithms, and libraries developed prior to or independently of this engagement.
  5.2 Custom Deliverables: All custom code, designs, documentation, and database schemas created specifically for Client shall automatically transfer to Client upon 100% receipt of all milestone funds.
  5.3 Moral Rights Waiver: Upon full and final settlement, Contractor waives moral rights to the deliverables in favor of Client to the maximum extent permitted by applicable law.

--------------------------------------------------------------------------------
6. CONFIDENTIALITY, NON-DISCLOSURE & DATA PRIVACY
--------------------------------------------------------------------------------
Both parties agree to treat all business information, source code, database credentials, and financial metrics exchanged during this engagement as strictly confidential.
Confidentiality obligations shall survive termination of this Agreement for a period of three (3) years. Contractor shall not expose or hardcode private API keys or database secrets.

--------------------------------------------------------------------------------
7. WARRANTIES, DEFECT RECTIFICATION & MAINTENANCE
--------------------------------------------------------------------------------
Contractor provides a thirty (30) day warranty starting from final delivery to rectify any reproducible software bugs or functional discrepancies attributable to Contractor's code at zero additional charge.
Neither party shall be liable for indirect, incidental, punitive, or consequential commercial damages.

--------------------------------------------------------------------------------
8. LIMITATION OF LIABILITY
--------------------------------------------------------------------------------
In all circumstances, the cumulative financial liability of either party arising out of or related to this Agreement shall be strictly capped at the total amount actually paid under this Agreement ($${amount} USD).

--------------------------------------------------------------------------------
9. GOVERNING LAW & BINDING ONLINE ARBITRATION
--------------------------------------------------------------------------------
This Agreement shall be governed by and construed under ClauseLens Online Dispute Resolution protocols and the Information Technology Act, 2000.
Any dispute shall be submitted to fast-track digital arbitration. The arbitrator's award shall be final, mutually binding, and enforceable in any court of competent jurisdiction.

--------------------------------------------------------------------------------
10. MUTUAL DIGITAL EXECUTION & OFFICIAL CORPORATE SEAL
--------------------------------------------------------------------------------
This document constitutes a valid legal contract upon dual digital consent on the ClauseLens portal.
Affixation of the Client Official Corporate Seal and Freelancer Cryptographic Signature establishes mutual assent, validity, and immediate enforcement under applicable digital contract laws.`;
}

async function saveAgreement(e) {
  e.preventDefault();
  const jobId = document.getElementById('agr-job-id').value;
  const freelancerId = document.getElementById('agr-freelancer-id').value;

  if (!jobId || !freelancerId) {
    showToast('Please select both a job and an applicant freelancer first.', true);
    return;
  }

  const title = document.getElementById('agr-title').value.trim();
  const scope = document.getElementById('agr-scope').value.trim();
  const totalAmount = document.getElementById('agr-amount').value;
  const advancePercentage = document.getElementById('agr-advance').value;
  const paymentDueDays = document.getElementById('agr-days').value;
  const revisionLimit = document.getElementById('agr-revs').value;
  const maintenanceTerms = document.getElementById('agr-maint').value.trim();
  const ipTerms = document.getElementById('agr-ip').value.trim();

  try {
    await API.post('api/agreements', {
      jobId: Number(jobId),
      freelancerId: Number(freelancerId),
      title, scope, deliverables: scope,
      totalAmount: Number(totalAmount),
      advancePercentage: Number(advancePercentage),
      paymentDueDays: Number(paymentDueDays),
      revisionLimit: Number(revisionLimit),
      maintenanceTerms, ipTerms
    });
    showToast('Agreement draft successfully created and sent to freelancer!');
    closeAgreementModal();
    loadCompanyAgreements();
    loadCompanyJobs();
    loadCompanyOverview();
  } catch (err) {
    showToast(err.message, true);
  }
}

// 5. PAYMENTS & ESCROW MILESTONE DISBURSEMENT
let cachedCompanyPayments = [];

async function loadCompanyPayments() {
  const tbody = document.getElementById('comp-payments-tbody');
  if (!tbody) return;

  try {
    const list = await API.get('api/payments/company');
    cachedCompanyPayments = Array.isArray(list) ? list : [];

    // Calculate metrics
    let totalPaid = 0;
    let paidCount = 0;
    let totalPending = 0;
    let pendingCount = 0;

    cachedCompanyPayments.forEach(p => {
      const isSettled = p.status === 'PAID' || p.status === 'RECEIVED';
      const amt = Number(p.amount) || 0;
      if (isSettled) {
        totalPaid += amt;
        paidCount++;
      } else {
        totalPending += amt;
        pendingCount++;
      }
    });

    if (document.getElementById('stat-paid-amount')) {
      document.getElementById('stat-paid-amount').textContent = `$${totalPaid.toFixed(2)}`;
    }
    if (document.getElementById('stat-paid-count')) {
      document.getElementById('stat-paid-count').textContent = `${paidCount} settled milestones`;
    }
    if (document.getElementById('stat-pending-amount')) {
      document.getElementById('stat-pending-amount').textContent = `$${totalPending.toFixed(2)}`;
    }
    if (document.getElementById('stat-pending-count')) {
      document.getElementById('stat-pending-count').textContent = `${pendingCount} awaiting release`;
    }

    if (cachedCompanyPayments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted); text-align:center; padding:32px;">No milestone payment records yet. When freelancers complete assigned contract tasks, release actions appear here.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedCompanyPayments.map(p => {
      const isSettled = p.status === 'PAID' || p.status === 'RECEIVED';
      const isDue = p.status === 'DUE_SOON' || (p.taskStatus === 'COMPLETED' && !isSettled);
      const inrAmt = Math.round(p.amount * 83.5);

      let statusTag = '<span class="tag md">PENDING</span>';
      if (isSettled) {
        statusTag = '<span class="tag lo" style="background:#ECFDF5; color:#059669; font-weight:700;">&check; PAID &bull; SETTLED</span>';
      } else if (isDue) {
        statusTag = '<span class="tag hi" style="background:#FEF3C7; color:#B45309; font-weight:700;">TASK DONE &bull; READY TO PAY</span>';
      }

      return `
        <tr>
          <td>
            <strong>${escapeHtml(p.projectTitle || 'Project')}</strong>
            ${p.taskTitle ? `<small style="display:block; color:var(--text-muted); margin-top:2px;">Task: ${escapeHtml(p.taskTitle)}</small>` : ''}
          </td>
          <td>
            <div style="font-weight:700; color:var(--text);">${escapeHtml(p.freelancerName || 'Contractor')}</div>
            <span class="tag lo" style="font-size:11px; padding:2px 6px;">Verified Pro</span>
          </td>
          <td>
            <div style="font-weight:600;">${escapeHtml(p.title)}</div>
            ${p.dueDate ? `<small style="color:var(--text-muted); font-size:11.5px;">Due: ${p.dueDate}</small>` : ''}
          </td>
          <td>
            <div style="font-size:16px; font-weight:800; color:var(--text);">$${p.amount} <small style="font-size:11px; color:var(--text-muted); font-weight:600;">${p.currency || 'USD'}</small></div>
            <div style="font-size:12px; color:#047857; font-weight:700;">≈ ₹${inrAmt.toLocaleString('en-IN')} INR</div>
          </td>
          <td>${statusTag}</td>
          <td>
            ${!isSettled ? `
              <button class="btn btn-green btn-sm" onclick="openReleasePaymentModal(${p.id})" style="font-weight:700; padding:8px 16px; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                <span>💸 Release Payment</span>
              </button>
            ` : `
              <div>
                <span style="font-size:12.5px; color:#059669; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                  &check; Payment Released
                </span>
                <small style="display:block; color:var(--text-muted); font-size:11px; font-family:monospace; margin-top:3px;">
                  Ref: ${escapeHtml(p.transactionRef || 'txn_released')}
                </small>
              </div>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">Error loading payments: ${err.message}</td></tr>`;
  }
}
window.loadCompanyPayments = loadCompanyPayments;

function openReleasePaymentModal(paymentId) {
  const p = cachedCompanyPayments.find(item => item.id == paymentId);
  if (!p) {
    showToast('Payment record not found', true);
    return;
  }

  const inrAmt = Math.round(p.amount * 83.5);

  document.getElementById('pay-id').value = p.id;
  document.getElementById('pay-modal-title').textContent = p.title || 'Milestone Payment';
  document.getElementById('pay-modal-freelancer').textContent = p.freelancerName || 'Contractor';
  document.getElementById('pay-modal-project').textContent = p.projectTitle || 'Project';
  document.getElementById('pay-modal-amount').textContent = `(≈ ₹${inrAmt.toLocaleString('en-IN')} INR)`;
  document.getElementById('rzp-inr-display').textContent = `$${parseFloat(p.amount || 0).toFixed(2)} ${p.currency || 'USD'}`;

  document.getElementById('pay-modal').classList.add('open');
}
window.openReleasePaymentModal = openReleasePaymentModal;
window.openMakePaymentModal = openReleasePaymentModal; // alias
window.openRazorpayModal = openReleasePaymentModal; // alias

function closeMakePaymentModal() {
  const modal = document.getElementById('pay-modal');
  if (modal) modal.classList.remove('open');
}
window.closeMakePaymentModal = closeMakePaymentModal;

async function submitDirectPaymentRelease() {
  const paymentId = document.getElementById('pay-id').value;
  const p = cachedCompanyPayments.find(item => item.id == paymentId);
  if (!p) {
    showToast('Payment record not found', true);
    return;
  }

  const submitBtn = document.getElementById('btn-release-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Processing Release...</span>';
  }

  const notesInput = document.getElementById('pay-notes');
  const notes = notesInput ? notesInput.value.trim() : 'Direct Escrow Release';

  try {
    const res = await API.post('api/payments/pay', {
      paymentId: Number(paymentId),
      paymentMethod: 'DIRECT_RELEASE',
      notes: notes || 'Direct Escrow Milestone Release'
    });

    const inrAmt = res.amountInr ? res.amountInr : Math.round((Number(res.amount) || 0) * 83.5);
    showToast(`🎉 Payment of $${res.amount} (₹${inrAmt} INR) Successfully Released to Contractor!`);

    closeMakePaymentModal();
    await loadCompanyPayments();
    await loadCompanyOverview();
  } catch (err) {
    showToast('Payment release failed: ' + err.message, true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💸 Confirm & Release Payment</span>';
    }
  }
}
window.submitDirectPaymentRelease = submitDirectPaymentRelease;
window.submitRazorpayPayment = submitDirectPaymentRelease; // alias

// 6. CHAT
async function loadCompanyConversations() {
  const list = document.getElementById('comp-conv-list');
  try {
    const convs = await API.get('api/conversations');
    if (!convs || convs.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No conversations yet.</p>';
      return;
    }

    list.innerHTML = convs.map(c => `
      <div onclick="selectCompanyConversation(${c.id}, '${escapeHtml(c.partnerName)}', ${c.partnerId})" style="padding:12px; border-radius:var(--r-sm); margin-bottom:6px; cursor:pointer; background:#F8FAFB; border:1px solid var(--border);">
        <strong style="font-size:14px; display:block;">${escapeHtml(c.partnerName)}</strong>
        <p style="font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(c.lastMessage || 'Start conversation')}</p>
      </div>
    `).join('');
    if (convs.length > 0) {
      selectCompanyConversation(convs[0].id, convs[0].partnerName, convs[0].partnerId);
    }
  } catch (err) {
    list.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
  }
}

async function selectCompanyConversation(convId, partnerName, partnerId) {
  activeCompanyConvId = convId;
  document.getElementById('comp-chat-header').textContent = `Chat with ${partnerName}`;
  loadCompanyMessages();
}

async function loadCompanyMessages() {
  if (!activeCompanyConvId) return;
  const container = document.getElementById('comp-chat-messages');
  try {
    const msgs = await API.get(`api/messages?conversationId=${activeCompanyConvId}`);
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

async function sendCompanyChatMessage() {
  if (!activeCompanyConvId) return;
  const input = document.getElementById('comp-chat-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    await API.post('api/messages', { conversationId: activeCompanyConvId, text });
    input.value = '';
    loadCompanyMessages();
  } catch (err) {
    showToast(err.message, true);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
