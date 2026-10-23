/**
 * ClauseLens Automated Instant Email Dispatch System
 * - 1-Click Instant Automatic Dispatch (Zero Review, Zero 16-Digit PIN, No Setup)
 * - Automatic background delivery & telemetry outbox
 */

(function () {
  'use strict';

  let emailsCache = [];

  document.addEventListener('DOMContentLoaded', () => {
    injectEmailOutboxModal();
    setupEmailNavbarTrigger();
    refreshEmailBadge();
  });

  function injectEmailOutboxModal() {
    if (document.getElementById('email-center-modal')) return;

    const modalHtml = `
      <!-- AUTOMATIC EMAIL OUTBOX MODAL -->
      <div id="email-center-modal" class="email-modal-overlay" style="display:none;" onclick="handleEmailModalBackdrop(event)">
        <div class="email-modal-content" onclick="event.stopPropagation()" style="max-width:720px;">
          
          <!-- MODAL HEADER -->
          <div class="email-modal-header" style="background:#FFFFFF; border-bottom:1px solid #E2E8F0; padding:18px 24px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:42px; height:42px; border-radius:12px; background:#EEF2FF; border:1px solid #C7D2FE; display:grid; place-items:center; color:#4F46E5;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <h3 style="margin:0; font-size:18px; font-weight:800; color:#0F172A;">Automated Email Outbox</h3>
                  <span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">AUTOMATIC DISPATCH</span>
                </div>
                <p style="margin:2px 0 0; font-size:12.5px; color:#64748B;">All contract seals, milestone releases, and notifications are sent automatically in the background.</p>
              </div>
            </div>
            <button type="button" class="email-close-btn" onclick="closeEmailCenterModal()" aria-label="Close">&times;</button>
          </div>

          <!-- OUTBOX CONTENT -->
          <div class="email-tab-pane" style="padding:20px 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap;">
              <div style="position:relative; flex:1; min-width:240px;">
                <input type="text" id="email-search-input" class="form-ctrl form-ctrl-sm" placeholder="Search automatically sent emails..." oninput="filterEmailsList()" style="padding-left:32px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" style="position:absolute; left:10px; top:50%; transform:translateY(-50%);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <button type="button" class="btn btn-line btn-sm" onclick="loadEmailsList()" style="font-size:12px; padding:6px 14px;">
                🔄 Refresh Logs
              </button>
            </div>

            <div class="email-list-container" id="email-list-container">
              <div style="text-align:center; padding:32px; color:var(--text-muted); font-size:13.5px;">
                Loading automated email records...
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- HTML EMAIL PREVIEW MODAL -->
      <div id="email-preview-modal" class="email-modal-overlay" style="display:none; z-index:11000;" onclick="closeEmailPreviewModal()">
        <div class="email-preview-content" onclick="event.stopPropagation()">
          <div class="email-modal-header" style="background:#0F172A; color:#FFFFFF; border-bottom:1px solid #334155;">
            <div>
              <span id="preview-email-badge" style="background:rgba(255,255,255,0.15); color:#FFFFFF; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:700;">SENT</span>
              <h4 id="preview-email-subject" style="margin:6px 0 2px; color:#FFFFFF; font-size:16px;">Email Preview</h4>
              <div id="preview-email-meta" style="font-size:12px; color:#94A3B8;">To: recipient@example.com</div>
            </div>
            <button type="button" class="email-close-btn" onclick="closeEmailPreviewModal()" style="color:#FFFFFF;">&times;</button>
          </div>
          <div class="email-preview-body">
            <iframe id="email-preview-iframe" style="width:100%; height:480px; border:none; background:#F8FAFC; border-radius:0 0 16px 16px;"></iframe>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
  }

  function setupEmailNavbarTrigger() {
    const userCtrl = document.querySelector('.dash-user-ctrl');
    if (userCtrl && !document.getElementById('email-center-btn')) {
      const emailBtn = document.createElement('button');
      emailBtn.className = 'notif-bell';
      emailBtn.id = 'email-center-btn';
      emailBtn.type = 'button';
      emailBtn.title = 'Automated Email Dispatch Outbox';
      emailBtn.onclick = () => window.openEmailCenter();
      emailBtn.style.position = 'relative';
      emailBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span class="notif-badge" id="email-count-badge" style="background:#059669; display:none;">0</span>
      `;
      const who = document.getElementById('who');
      if (who) {
        userCtrl.insertBefore(emailBtn, who);
      } else {
        userCtrl.appendChild(emailBtn);
      }
    }
  }

  /**
   * CORE FUNCTION: 1-Click Instant Automatic Email Dispatch (No Review, No PIN!)
   * Calls /api/emails/instant-send and delivers immediately in the background.
   */
  window.sendInstantEmail = async function (btnElement, opts = {}) {
    let originalText = '';
    if (btnElement) {
      originalText = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:6px;">
          <svg class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Sending...
        </span>
      `;
    }

    try {
      const res = await fetch('api/emails/instant-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: opts.type || 'GENERAL_UPDATE',
          recipientEmail: opts.recipientEmail || '',
          recipientName: opts.recipientName || 'Partner',
          projectTitle: opts.projectTitle || 'Service Contract'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email');

      const target = opts.recipientName || opts.recipientEmail || 'Recipient';
      if (window.showToast) {
        showToast(`✉️ Email automatically sent to ${target}!`, 'success');
      } else {
        alert(`Email automatically sent to ${target}!`);
      }

      if (btnElement) {
        btnElement.innerHTML = `&check; Sent!`;
        btnElement.style.background = '#ECFDF5';
        btnElement.style.color = '#059669';
        btnElement.style.borderColor = '#10B981';
        setTimeout(() => {
          btnElement.disabled = false;
          btnElement.innerHTML = originalText;
          btnElement.style.background = '';
          btnElement.style.color = '';
          btnElement.style.borderColor = '';
        }, 3500);
      }

      refreshEmailBadge();
    } catch (err) {
      if (window.showToast) {
        showToast('Error sending email: ' + err.message, 'error');
      } else {
        alert('Error sending email: ' + err.message);
      }
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
      }
    }
  };

  // Backward compatibility alias: directly dispatches without any review modal
  window.openOfficialGmailDraft = function (opts = {}) {
    window.sendInstantEmail(null, opts);
  };
  window.openAutoDraftEmail = function (opts = {}) {
    window.sendInstantEmail(null, opts);
  };

  window.openEmailCenter = function () {
    const modal = document.getElementById('email-center-modal');
    if (modal) {
      modal.style.display = 'flex';
      loadEmailsList();
    }
  };

  window.closeEmailCenterModal = function () {
    const modal = document.getElementById('email-center-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleEmailModalBackdrop = function (e) {
    if (e.target.id === 'email-center-modal') {
      closeEmailCenterModal();
    }
  };

  // Activity Logs & Outbox
  window.loadEmailsList = async function () {
    const listContainer = document.getElementById('email-list-container');
    if (!listContainer) return;

    try {
      const res = await fetch('api/emails/recent');
      if (!res.ok) throw new Error('Failed to fetch emails');
      const list = await res.json();
      emailsCache = Array.isArray(list) ? list : [];

      updateEmailBadgeCount(emailsCache.length);
      renderEmailsList(emailsCache);
    } catch (e) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:32px; color:var(--danger); font-size:13.5px;">
          Failed to load emails: ${e.message}
        </div>
      `;
    }
  };

  function updateEmailBadgeCount(count) {
    const badge = document.getElementById('email-count-badge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  async function refreshEmailBadge() {
    try {
      const res = await fetch('api/emails/recent');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          updateEmailBadgeCount(list.length);
        }
      }
    } catch (ignored) {}
  }

  function renderEmailsList(items) {
    const listContainer = document.getElementById('email-list-container');
    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <div style="font-size:32px; margin-bottom:8px;">📬</div>
          <div style="font-weight:700; color:var(--text);">No Automatically Dispatched Emails Yet</div>
          <div style="font-size:12.5px; margin-top:4px;">When you approve proposals, seal agreements, or release payments, automated emails will be recorded here.</div>
        </div>
      `;
      return;
    }

    const html = items.map(em => {
      const typeBadge = formatTypeBadge(em.emailType);
      const timeFormatted = em.createdAt ? new Date(em.createdAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Just now';

      return `
        <div class="email-item-card" onclick="openEmailDetail(${em.id})">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              ${typeBadge}
              <span style="font-size:12px; font-weight:700; color:var(--text);">${escapeHtml(em.recipientName || 'Recipient')}</span>
              <span style="font-size:11.5px; color:var(--text-muted);">&lt;${escapeHtml(em.recipientEmail)}&gt;</span>
            </div>
            <span style="font-size:11.5px; color:var(--text-muted); font-weight:500;">${timeFormatted}</span>
          </div>
          <div style="font-size:13.5px; font-weight:700; color:var(--text); margin-bottom:4px; line-height:1.4;">
            ${escapeHtml(em.subject)}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span style="color:#059669; font-weight:800; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
              <span style="width:6px; height:6px; background:#059669; border-radius:50%;"></span>
              &check; AUTOMATICALLY DISPATCHED &bull; LOGGED
            </span>
            <button type="button" class="btn btn-line btn-sm" style="font-size:11px; padding:4px 10px; border-radius:6px;" onclick="event.stopPropagation(); openEmailDetail(${em.id})">
              👁️ View Content
            </button>
          </div>
        </div>
      `;
    }).join('');

    listContainer.innerHTML = html;
  }

  function formatTypeBadge(type) {
    let bg = '#4F46E5';
    let text = type || 'AUTOMATED';

    if (type === 'AGREEMENT_DRAFT') {
      bg = '#7E22CE';
      text = '📜 CONTRACT DRAFT';
    } else if (type === 'AGREEMENT_SIGNED') {
      bg = '#059669';
      text = '✅ MUTUAL SEAL';
    } else if (type === 'PAYMENT_RELEASED') {
      bg = '#0D9488';
      text = '💸 ESCROW RECEIPT';
    } else if (type === 'WITHDRAWAL') {
      bg = '#16A34A';
      text = '🏦 PAYOUT CONFIRMED';
    } else if (type === 'NEW_PROPOSAL') {
      bg = '#2563EB';
      text = '👤 NEW PROPOSAL';
    } else if (type === 'PROPOSAL_ACCEPTED') {
      bg = '#D97706';
      text = '🎉 HIRED ACCEPTANCE';
    } else if (type === 'PHASE_COMPLETED') {
      bg = '#4F46E5';
      text = '🚀 MILESTONE DONE';
    } else if (type === 'CUSTOM') {
      bg = '#64748B';
      text = '✉️ DIRECT DISPATCH';
    }

    return `<span style="background:${bg}15; color:${bg}; border:1px solid ${bg}30; font-size:10px; font-weight:800; padding:2px 7px; border-radius:12px; letter-spacing:0.3px;">${text}</span>`;
  }

  window.filterEmailsList = function () {
    const q = (document.getElementById('email-search-input').value || '').toLowerCase().trim();
    if (!q) {
      renderEmailsList(emailsCache);
      return;
    }
    const filtered = emailsCache.filter(em => {
      const sub = (em.subject || '').toLowerCase();
      const rec = (em.recipientEmail || '').toLowerCase();
      const nam = (em.recipientName || '').toLowerCase();
      const typ = (em.emailType || '').toLowerCase();
      return sub.includes(q) || rec.includes(q) || nam.includes(q) || typ.includes(q);
    });
    renderEmailsList(filtered);
  };

  window.openEmailDetail = async function (id) {
    try {
      const res = await fetch(`api/emails/detail?id=${id}`);
      if (!res.ok) throw new Error('Email details not found');
      const em = await res.json();

      document.getElementById('preview-email-subject').innerText = em.subject || 'Dispatched Email';
      document.getElementById('preview-email-meta').innerText = `To: ${em.recipientName || ''} <${em.recipientEmail}> • From: ${em.senderEmail || 'ClauseLens'}`;
      document.getElementById('preview-email-badge').innerText = 'SENT';

      const iframe = document.getElementById('email-preview-iframe');
      const modal = document.getElementById('email-preview-modal');
      modal.style.display = 'flex';

      const doc = iframe.contentWindow.document;
      doc.open();
      if (em.bodyHtml && em.bodyHtml.trim().length > 0) {
        doc.write(em.bodyHtml);
      } else {
        doc.write(`
          <html><body style="font-family:sans-serif; padding:24px; color:#1E293B; line-height:1.6; white-space:pre-wrap; background:#FFFFFF;">
            ${escapeHtml(em.bodyText || '')}
          </body></html>
        `);
      }
      doc.close();
    } catch (e) {
      alert('Could not open email preview: ' + e.message);
    }
  };

  window.closeEmailPreviewModal = function () {
    const modal = document.getElementById('email-preview-modal');
    if (modal) modal.style.display = 'none';
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
