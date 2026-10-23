// ClauseLens Notification Center System
(function() {
  let cachedNotifications = [];

  const CATEGORY_ICONS = {
    APPLICATION: {
      tag: 'Application',
      cls: 'category-application',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
    AGREEMENT: {
      tag: 'Agreement',
      cls: 'category-agreement',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    },
    TASK: {
      tag: 'Task',
      cls: 'category-task',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    },
    PAYMENT: {
      tag: 'Payment',
      cls: 'category-payment',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
    },
    MESSAGE: {
      tag: 'Chat',
      cls: 'category-message',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    },
    CHAT: {
      tag: 'Chat',
      cls: 'category-message',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    },
    DEFAULT: {
      tag: 'Alert',
      cls: 'category-default',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    }
  };

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    let d;
    if (typeof dateStr === 'string') {
      // replace space with T for ISO format if needed e.g. "2026-10-23 22:35:21"
      const normalized = dateStr.replace(' ', 'T');
      d = new Date(normalized);
      if (isNaN(d.getTime())) {
        d = new Date(dateStr);
      }
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return dateStr;

    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  window.loadNotifications = async function() {
    const badge = document.getElementById('notif-count');
    const pill = document.getElementById('notif-unread-pill');
    const list = document.getElementById('notif-list');

    try {
      const res = await API.get('api/notifications');
      const unreadCount = res.unreadCount || 0;
      const items = res.items || [];
      cachedNotifications = items;

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (pill) {
        if (unreadCount > 0) {
          pill.textContent = `${unreadCount} new`;
          pill.style.display = 'inline-block';
        } else {
          pill.style.display = 'none';
        }
      }

      if (list) {
        if (!items || items.length === 0) {
          list.innerHTML = `
            <div class="notif-empty">
              <div class="notif-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div class="notif-empty-title">All caught up!</div>
              <div class="notif-empty-desc">No new notifications. New alerts for proposals, agreements, and messages will appear here.</div>
            </div>
          `;
        } else {
          list.innerHTML = items.map((item, index) => {
            const catKey = (item.category || '').toUpperCase();
            const cat = CATEGORY_ICONS[catKey] || CATEGORY_ICONS.DEFAULT;
            const isUnread = !item.isRead;
            const timeAgo = formatTimeAgo(item.createdAt);

            return `
              <div class="notif-item ${isUnread ? 'unread' : ''}" 
                   onclick="handleNotificationClick(${item.id}, '${escapeHtml(item.referenceUrl || '')}', ${isUnread}, ${index}, '${escapeHtml(catKey)}')"
                   title="Click to view details">
                <div class="notif-icon-box ${cat.cls}">
                  ${cat.svg}
                </div>
                <div class="notif-content">
                  <div class="notif-meta">
                    <span class="notif-tag" style="color:var(--primary);">${escapeHtml(cat.tag)}</span>
                    <span class="notif-time">${timeAgo}</span>
                  </div>
                  <div class="notif-item-title">${escapeHtml(item.title || 'Notification')}</div>
                  <div class="notif-item-msg">${escapeHtml(item.message || '')}</div>
                </div>
                ${isUnread ? '<div class="notif-dot"></div>' : ''}
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  window.toggleNotifications = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dropdown = document.getElementById('notif-dropdown');
    const bellBtn = document.getElementById('notif-bell-btn');
    if (!dropdown) return;

    const isShowing = dropdown.classList.contains('show');
    if (isShowing) {
      dropdown.classList.remove('show');
      if (bellBtn) bellBtn.classList.remove('active');
    } else {
      dropdown.classList.add('show');
      if (bellBtn) bellBtn.classList.add('active');
      window.loadNotifications();
    }
  };

  window.markAllNotificationsRead = async function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await API.post('api/notifications/read', {});
      const badge = document.getElementById('notif-count');
      const pill = document.getElementById('notif-unread-pill');
      if (badge) badge.style.display = 'none';
      if (pill) pill.style.display = 'none';

      // Mark local items visually
      document.querySelectorAll('.notif-item.unread').forEach(el => {
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-dot');
        if (dot) dot.remove();
      });

      if (typeof showToast === 'function') {
        showToast('All notifications marked as read');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Failed to mark notifications read: ' + err.message, true);
      }
    }
  };

  window.handleNotificationClick = async function(id, refUrl, isUnread, index, category) {
    // 1. Mark as read on server
    if (isUnread) {
      API.post('api/notifications/read', { id }).catch(() => {});
      const badge = document.getElementById('notif-count');
      if (badge && badge.style.display !== 'none') {
        let count = parseInt(badge.textContent, 10);
        if (!isNaN(count) && count > 1) {
          badge.textContent = count - 1;
        } else {
          badge.style.display = 'none';
        }
      }
      const pill = document.getElementById('notif-unread-pill');
      if (pill && pill.style.display !== 'none') {
        let count = parseInt(pill.textContent, 10);
        if (!isNaN(count) && count > 1) {
          pill.textContent = `${count - 1} new`;
        } else {
          pill.style.display = 'none';
        }
      }
      // Visual update
      const items = document.querySelectorAll('.notif-item');
      if (items[index]) {
        items[index].classList.remove('unread');
        const dot = items[index].querySelector('.notif-dot');
        if (dot) dot.remove();
      }
    }

    // 2. Close dropdown
    const dropdown = document.getElementById('notif-dropdown');
    const bellBtn = document.getElementById('notif-bell-btn');
    if (dropdown) dropdown.classList.remove('show');
    if (bellBtn) bellBtn.classList.remove('active');

    // 3. Smart routing based on category and dashboard
    const isFreelancer = window.location.pathname.includes('freelancer');
    const isCompany = window.location.pathname.includes('company');
    const cat = (category || '').toUpperCase();
    const lowerRef = (refUrl || '').toLowerCase();

    // If on Freelancer Dashboard: switch tab directly on page (NEVER navigate to external URL or root /)
    if (isFreelancer && typeof window.switchTab === 'function') {
      if (cat === 'APPLICATION' || lowerRef.includes('application')) {
        window.switchTab('my-applications');
        if (typeof showToast === 'function') showToast('Viewing My Applications');
        return;
      }
      if (cat === 'AGREEMENT' || lowerRef.includes('agreement') || lowerRef.includes('contract') || lowerRef.includes('analyzer')) {
        window.switchTab('analyzer');
        if (typeof showToast === 'function') showToast('Opening Contract in AI Analyzer');
        return;
      }
      if (cat === 'MESSAGE' || cat === 'CHAT' || lowerRef.includes('chat') || lowerRef.includes('message')) {
        window.switchTab('chat');
        if (typeof showToast === 'function') showToast('Opening Project Chatbox');
        return;
      }
      if (cat === 'PAYMENT' || lowerRef.includes('payment') || lowerRef.includes('earnings')) {
        window.switchTab('payments');
        if (typeof showToast === 'function') showToast('Viewing Earnings & Payments');
        return;
      }
      if (cat === 'TASK' || lowerRef.includes('task')) {
        window.switchTab('tasks');
        if (typeof showToast === 'function') showToast('Viewing Tasks & Check-ins');
        return;
      }
      if (lowerRef.includes('job') || lowerRef.includes('browse')) {
        window.switchTab('browse-jobs');
        return;
      }
      if (lowerRef.includes('policy')) {
        window.switchTab('policy-builder');
        return;
      }
      if (lowerRef.includes('profile')) {
        window.switchTab('profile');
        return;
      }
      if (typeof showToast === 'function') showToast('Notification details opened');
      return;
    }

    // If on Company Dashboard: switch tab directly on page
    if (isCompany && typeof window.switchCompanyTab === 'function') {
      if (cat === 'AGREEMENT' || lowerRef.includes('agreement') || lowerRef.includes('contract')) {
        window.switchCompanyTab('agreements');
        if (typeof showToast === 'function') showToast('Viewing Contract Agreements');
        return;
      }
      if (cat === 'MESSAGE' || cat === 'CHAT' || lowerRef.includes('message') || lowerRef.includes('chat')) {
        window.switchCompanyTab('chat');
        if (typeof showToast === 'function') showToast('Opening Project Messages');
        return;
      }
      if (cat === 'APPLICATION' || lowerRef.includes('application') || lowerRef.includes('job') || lowerRef.includes('proposal')) {
        window.switchCompanyTab('manage-jobs');
        if (typeof showToast === 'function') showToast('Viewing Jobs & Proposals');
        return;
      }
      if (cat === 'PAYMENT' || lowerRef.includes('payment')) {
        window.switchCompanyTab('payments');
        if (typeof showToast === 'function') showToast('Viewing Payment Milestones');
        return;
      }
      if (cat === 'TASK' || lowerRef.includes('task')) {
        window.switchCompanyTab('payments');
        if (typeof showToast === 'function') showToast('Viewing Task Milestones & Releases');
        return;
      }
      if (typeof showToast === 'function') showToast('Notification details opened');
      return;
    }

    // If on another page, navigate safely with servlet context path
    if (refUrl) {
      if (refUrl.startsWith('http://') || refUrl.startsWith('https://')) {
        window.location.href = refUrl;
        return;
      }
      const parts = window.location.pathname.split('/').filter(Boolean);
      const ctx = (parts.length > 0 && parts[0] === 'clauselens') ? '/clauselens' : '';
      let clean = refUrl.replace(/^\/+/, '');
      if (clean.startsWith('clauselens/')) {
        window.location.href = '/' + clean;
      } else {
        window.location.href = ctx + '/' + clean;
      }
    }
  };

  // Close when clicking outside
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('notif-wrapper');
    const dropdown = document.getElementById('notif-dropdown');
    const bellBtn = document.getElementById('notif-bell-btn');
    if (dropdown && dropdown.classList.contains('show')) {
      if (wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove('show');
        if (bellBtn) bellBtn.classList.remove('active');
      }
    }
  });

  // Auto init
  document.addEventListener('DOMContentLoaded', function() {
    window.loadNotifications();
    setInterval(window.loadNotifications, 30000);
  });
})();
