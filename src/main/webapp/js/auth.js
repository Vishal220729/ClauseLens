(function () {
  var DOMAINS = ['Web Development','Mobile App Development','Graphic Design','UI/UX Design','Content Writing',
    'Video Editing','Digital Marketing','Software Testing','Data Analysis','Consulting','Other'];

  var isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';

  // Universal Mock Dispatcher for GitHub Pages / Static Hosting
  function getActiveMockUser() {
    try {
      var raw = sessionStorage.getItem('cl_session');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    var isComp = document.body && document.body.dataset && document.body.dataset.dashboard === 'company';
    var isAdm = document.body && document.body.dataset && document.body.dataset.dashboard === 'admin';
    if (isComp) {
      return { id: 101, role: 'COMPANY', name: 'Apex Media Corp (Demo)', email: 'sarah@techcorp.com' };
    } else if (isAdm) {
      return { id: 999, role: 'ADMIN', name: 'Administrator', email: 'admin@clauselens.com' };
    } else {
      return { id: 201, role: 'FREELANCER', name: 'Alex Vance (Demo)', email: 'alex@freelancer.com', rewardPoints: 350, walletBalance: 1450.00 };
    }
  }

  function handleMockRequest(url, opts) {
    var method = (opts && opts.method) ? opts.method.toUpperCase() : 'GET';
    var body = {};
    try { if (opts && opts.body) body = (typeof opts.body === 'string') ? JSON.parse(opts.body) : opts.body; } catch(e) {}
    var path = (url || '').replace(/^\//, '').replace(/^api\//, '');

    // 1. Session check: api/me
    if (path === 'me') {
      return Promise.resolve(getActiveMockUser());
    }

    // 2. Logout
    if (path === 'logout') {
      try { sessionStorage.removeItem('cl_session'); } catch(e) {}
      return Promise.resolve({ ok: true, message: 'Logged out' });
    }

    // 3. Register: api/register/freelancer or api/register/company
    if (path.indexOf('register/') === 0) {
      var regRole = path.split('/')[1].toUpperCase();
      var displayName = body.fullName || body.companyName || (body.email ? body.email.split('@')[0] : 'User');
      var registeredUser = {
        id: Date.now(),
        role: regRole,
        name: displayName,
        email: body.email || 'user@demo.com',
        rewardPoints: 250,
        walletBalance: 0.00,
        skills: body.skills || 'General Services',
        domain: body.primaryDomain || body.industry || 'Technology'
      };
      try {
        var users = JSON.parse(localStorage.getItem('cl_users') || '[]');
        // Update or append
        var existingIdx = users.findIndex(function(u) { return u.email === registeredUser.email; });
        if (existingIdx >= 0) users[existingIdx] = Object.assign({}, users[existingIdx], registeredUser, { password: body.password });
        else users.push(Object.assign({}, registeredUser, { password: body.password }));
        localStorage.setItem('cl_users', JSON.stringify(users));
        // Save session
        sessionStorage.setItem('cl_session', JSON.stringify(registeredUser));
      } catch(e) {}
      var redirectPage = (regRole === 'COMPANY') ? 'company-dashboard.html' : 'freelancer-dashboard.html';
      return Promise.resolve({ ok: true, message: 'Account created successfully', redirect: redirectPage });
    }

    // 4. Login: api/login/freelancer, api/login/company, api/login/admin
    if (path.indexOf('login/') === 0) {
      var loginRole = path.split('/')[1].toUpperCase();
      var foundUser = null;
      try {
        var savedUsers = JSON.parse(localStorage.getItem('cl_users') || '[]');
        foundUser = savedUsers.find(function(u) { 
          return u.email && body.email && u.email.toLowerCase() === body.email.toLowerCase(); 
        });
      } catch(e) {}

      if (!foundUser) {
        // Create an instant session for any login input on Demo host
        var defaultName = body.email ? body.email.split('@')[0] : (loginRole === 'COMPANY' ? 'Sarah Jenkins' : loginRole === 'ADMIN' ? 'Admin Master' : 'Alex Vance');
        foundUser = {
          id: Date.now(),
          role: loginRole,
          name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
          email: body.email || (loginRole === 'COMPANY' ? 'sarah@techcorp.com' : loginRole === 'ADMIN' ? 'admin@clauselens.com' : 'alex@freelancer.com'),
          rewardPoints: 350,
          walletBalance: 1250.00
        };
      }
      try {
        sessionStorage.setItem('cl_session', JSON.stringify(foundUser));
      } catch(e) {}

      var redir = (foundUser.role === 'COMPANY') ? 'company-dashboard.html' : (foundUser.role === 'ADMIN' ? 'admin-dashboard.html' : 'freelancer-dashboard.html');
      return Promise.resolve({ ok: true, message: 'Login successful', redirect: redir });
    }

    // 5. Jobs list
    if (path.indexOf('jobs/list') === 0 || path === 'jobs/my' || path === 'jobs/browse' || path === 'jobs') {
      var storedJobs = [];
      try { storedJobs = JSON.parse(localStorage.getItem('cl_mock_jobs') || '[]'); } catch(e) {}
      if (storedJobs.length === 0) {
        storedJobs = [
          { id: 101, title: 'Full Stack Web App Development', companyName: 'Apex Cloud Solutions', budget: 1800, currency: 'USD', advancePercentage: 30, deadline: '2026-11-20', status: 'PUBLISHED', domain: 'Web Development', skills: 'React, Node.js, REST API', description: 'Build responsive contract portal components with security hardening.' },
          { id: 102, title: 'Mobile UI/UX Design & Prototype', companyName: 'FinNova Technologies', budget: 1200, currency: 'USD', advancePercentage: 30, deadline: '2026-11-15', status: 'PUBLISHED', domain: 'UI/UX Design', skills: 'Figma, Design Systems, Mobile UI', description: 'Create dark mode design tokens and interactive Figma components.' },
          { id: 103, title: 'Enterprise Legal Contract Automation', companyName: 'Lexis Legal Advisory', budget: 2500, currency: 'USD', advancePercentage: 40, deadline: '2026-12-05', status: 'PUBLISHED', domain: 'Software Testing', skills: 'Java, Spring Boot, Security', description: 'End-to-end integration for automated contract PDF risk parsing.' }
        ];
        try { localStorage.setItem('cl_mock_jobs', JSON.stringify(storedJobs)); } catch(e) {}
      }
      return Promise.resolve(storedJobs);
    }

    // 6. Job Create
    if (path === 'jobs/create' || path === 'jobs/post') {
      var newJob = Object.assign({ id: Date.now(), status: 'PUBLISHED', companyName: (getActiveMockUser().name || 'Your Company') }, body);
      try {
        var currentJobs = JSON.parse(localStorage.getItem('cl_mock_jobs') || '[]');
        currentJobs.unshift(newJob);
        localStorage.setItem('cl_mock_jobs', JSON.stringify(currentJobs));
      } catch(e) {}
      return Promise.resolve({ ok: true, message: 'Job posted successfully', job: newJob });
    }

    // 7. Applications
    if (path.indexOf('applications') === 0) {
      if (path.indexOf('apply') !== -1) {
        return Promise.resolve({ ok: true, message: 'Proposal submitted successfully!' });
      }
      return Promise.resolve([
        { id: 1, jobTitle: 'Full Stack Web App Development', companyName: 'Apex Cloud Solutions', estimatedPrice: 1800.00, estimatedDays: 14, status: 'ACCEPTED' },
        { id: 2, jobTitle: 'Mobile UI/UX Design & Prototype', companyName: 'FinNova Technologies', estimatedPrice: 1200.00, estimatedDays: 10, status: 'SUBMITTED' }
      ]);
    }

    // 8. Agreements
    if (path.indexOf('agreements') === 0) {
      if (path.indexOf('accept') !== -1 || path.indexOf('approve') !== -1) {
        return Promise.resolve({ ok: true, message: 'Agreement sealed and digitally signed', status: 'ACCEPTED', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
      }
      return Promise.resolve([
        {
          id: 1,
          title: 'Master Services Agreement & Digital SLA',
          companyName: 'Apex Cloud Solutions',
          freelancerName: getActiveMockUser().name || 'Alex Vance',
          currentVersion: 1,
          status: 'PENDING_ANALYSIS',
          totalAmount: 1800.00,
          advancePercentage: 30,
          scope: 'Full stack development of contract risk platform components.',
          deliverables: '1. Frontend wireframes & UI\n2. Backend REST APIs\n3. Acceptance test suite',
          paymentDueDays: 15,
          revisionLimit: 3
        }
      ]);
    }

    // 9. Payments
    if (path.indexOf('payments') === 0) {
      if (path.indexOf('release') !== -1) {
        return Promise.resolve({ ok: true, message: 'Payment released to freelancer wallet' });
      }
      if (path.indexOf('withdraw') !== -1) {
        return Promise.resolve({ ok: true, message: 'Withdrawal initiated successfully', ref: 'WDR-' + Date.now() });
      }
      return Promise.resolve([
        { id: 1, title: '30% Upfront Advance Escrow', amount: 540.00, currency: 'USD', status: 'RECEIVED', dueDate: '2026-10-25' },
        { id: 2, title: '50% Milestone Progress Sign-off', amount: 900.00, currency: 'USD', status: 'PENDING', dueDate: '2026-11-08' }
      ]);
    }

    // 10. Tasks
    if (path.indexOf('tasks') === 0) {
      return Promise.resolve([
        { id: 1, title: 'Design System & Component Library', progressPercent: 100, status: 'COMPLETED', priority: 'HIGH' },
        { id: 2, title: 'REST API Integration & Authentication', progressPercent: 50, status: 'IN_PROGRESS', priority: 'HIGH' },
        { id: 3, title: 'End-to-End Contract Scanning Test', progressPercent: 0, status: 'TODO', priority: 'MEDIUM' }
      ]);
    }

    // 11. Policies
    if (path.indexOf('policies') === 0) {
      return Promise.resolve([
        { id: 1, policyName: 'Standard Freelancer Protection Policy', isActive: true, ruleCount: 5 }
      ]);
    }

    // 12. Notifications
    if (path.indexOf('notifications') === 0) {
      return Promise.resolve([
        { id: 1, title: 'Welcome to ClauseLens!', message: 'Your account is active. Explore contract scanning and protected agreements.', category: 'AGREEMENT', isRead: false, createdAt: 'Just now' },
        { id: 2, title: 'Milestone Deposit Secured', message: 'Apex Cloud Solutions locked 30% advance deposit ($540.00) in escrow.', category: 'PAYMENT', isRead: false, createdAt: '2h ago' }
      ]);
    }

    // 13. Admin stats & collections
    if (path.indexOf('admin/stats') === 0) {
      return Promise.resolve({ totalCompanies: 18, totalFreelancers: 64, totalAgreements: 42, totalEscrowVolume: 56800 });
    }
    if (path.indexOf('admin/users') === 0) {
      return Promise.resolve([
        { id: 1, role: 'COMPANY', email: 'sarah@techcorp.com', name: 'Apex Media Corp', status: 'ACTIVE' },
        { id: 2, role: 'FREELANCER', email: 'alex@freelancer.com', name: 'Alex Vance', status: 'ACTIVE' }
      ]);
    }

    // 14. Instant Email Send
    if (path.indexOf('emails') === 0) {
      return Promise.resolve({ ok: true, message: 'Notification email queued and dispatched successfully' });
    }

    // 15. AI Analysis scan
    if (path.indexOf('analysis') === 0) {
      return Promise.resolve({
        id: 1,
        totalFindings: 2,
        highSeverityCount: 1,
        mediumSeverityCount: 1,
        lowSeverityCount: 0,
        status: 'COMPLETED',
        findings: [
          {
            title: 'Uncapped Liability & Indemnification Risk',
            severity: 'HIGH',
            category: 'POTENTIAL_RISK',
            exactQuote: 'Contractor shall defend, indemnify, and hold harmless Client from any and all damages, claims, or losses without monetary limitation.',
            simpleExplanation: 'This clause forces you to pay unlimited legal damages if client faces any dispute.',
            suggestedNegotiation: 'Limit liability strictly to total fees paid under this agreement (cap at 100% of agreement value).'
          },
          {
            title: 'Delayed Net-60 Payment Terms',
            severity: 'MEDIUM',
            category: 'POLICY_CONFLICT',
            exactQuote: 'Client will issue payment sixty (60) days following receipt and final verification of monthly deliverables.',
            simpleExplanation: 'You will have to wait two full months to receive payment for completed work.',
            suggestedNegotiation: 'Propose standard Net-15 payment terms with 2% per month late payment interest.'
          }
        ]
      });
    }

    // Default mock response
    return Promise.resolve({ ok: true });
  }

  // Export to window so api.js can use it
  window.CL_MOCK_DISPATCH = handleMockRequest;

  function api(path, opts) {
    if (isStaticHost) {
      return handleMockRequest(path, opts);
    }
    return fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) { var err = new Error(data.error || 'Something went wrong. Try again.'); err.status = res.status; throw err; }
          return data;
        });
      })
      .catch(function (err) {
        // If local backend fails with network/404, fallback to mock dispatcher
        return handleMockRequest(path, opts);
      });
  }
  window.CL = { api: api };

  function show(box, kind, text) { 
    if (!box) return;
    box.className = 'msg ' + kind; 
    box.textContent = text; 
    box.style.display = 'block';
  }

  // Freelancer domain pickers
  var primary = document.getElementById('primaryDomain');
  var extras = document.getElementById('extraDomains');
  if (primary && extras) {
    DOMAINS.forEach(function (d) { primary.add(new Option(d, d)); });
    primary.insertBefore(new Option('Choose one', ''), primary.firstChild); primary.value = '';
    DOMAINS.forEach(function (d) {
      var l = document.createElement('label');
      var c = document.createElement('input'); c.type = 'checkbox'; c.value = d;
      l.appendChild(c); l.appendChild(document.createTextNode(d)); extras.appendChild(l);
    });
    primary.addEventListener('change', function () {
      extras.querySelectorAll('label').forEach(function (l) {
        var c = l.querySelector('input'); var same = c.value === primary.value;
        if (same) c.checked = false; c.disabled = same; l.classList.toggle('off', same);
      });
    });
  }

  // Dynamic secondary domain adder
  window.addSecondaryDomainRow = function (btn) {
    var form = btn.closest('form');
    var container = form ? form.querySelector('.secondary-domains-list') : null;
    if (!container) return;

    var primarySelect = form.querySelector('[name="primaryDomain"]');
    var primaryVal = primarySelect ? primarySelect.value : '';
    var count = container.querySelectorAll('.secondary-domain-item').length + 1;

    var item = document.createElement('div');
    item.className = 'secondary-domain-item';
    item.style.cssText = 'margin: 0;';

    var headerHtml = 
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">' +
        '<label style="display: block; font-size: 13.5px; font-weight: 600; color: var(--text); font-family: \'Plus Jakarta Sans\', sans-serif; margin: 0;">Secondary Domain #' + count + '</label>' +
        '<button type="button" onclick="this.closest(\'.secondary-domain-item\').remove()" title="Remove domain" style="background: none; border: none; color: #EF4444; font-size: 12px; font-weight: 600; font-family: \'Plus Jakarta Sans\', sans-serif; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 3px;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          'Remove' +
        '</button>' +
      '</div>';

    var selectHtml = 
      '<select name="additionalDomains" class="form-input-clean" style="width: 100%; height: 42px; padding: 9px 10px; border-radius: 10px; border: 1.5px solid var(--border); font-size: 14px; font-family: \'Plus Jakarta Sans\', sans-serif; background: #FFFFFF; box-sizing: border-box; color: var(--text);">' +
        '<option value="" disabled selected>Select domain...</option>' +
        DOMAINS.map(function (d) {
          return '<option value="' + d + '"' + (d === primaryVal ? ' disabled style="color:#aaa;"' : '') + '>' + d + '</option>';
        }).join('') +
      '</select>';

    item.innerHTML = headerHtml + selectHtml;
    container.appendChild(item);
  };

  // Form Submission Handler
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var box = form.querySelector('.msg'); 
    var btn = form.querySelector('button[type=submit]');
    
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.dataset.form;
      var body = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (!el.name || el.disabled) return;
        var hiddenParent = el.closest('#freelancer-fields, #company-fields');
        if (hiddenParent && (hiddenParent.style.display === 'none' || getComputedStyle(hiddenParent).display === 'none')) return;
        var v = el.value;
        body[el.name] = (el.type === 'password') ? v : (typeof v === 'string' ? v.trim() : v);
      });

      var extraSelects = form.querySelectorAll('select[name="additionalDomains"]');
      var additional = [];
      extraSelects.forEach(function (sel) {
        if (sel.disabled) return;
        var val = (sel.value || '').trim();
        if (val && additional.indexOf(val) === -1) additional.push(val);
      });
      if (extras) {
        extras.querySelectorAll('input:checked').forEach(function (c) {
          if (!c.disabled && c.value && additional.indexOf(c.value) === -1) additional.push(c.value);
        });
      }
      if (additional.length > 0) {
        body.additionalDomains = additional;
      }
      
      var label = btn ? btn.textContent : 'Submit';
      if (btn) { btn.disabled = true; btn.textContent = 'Please wait...'; }
      if (box) { box.className = 'msg'; }

      if (kind === 'freelancer') {
        if (!body.country) body.country = 'United States';
        if (!body.primaryDomain) body.primaryDomain = 'Web Development';
        if (!body.experienceLevel) body.experienceLevel = 'Intermediate';
        if (!body.skills) body.skills = 'General Freelance Services';
      } else if (kind === 'company') {
        if (!body.contactPerson) body.contactPerson = body.companyName || 'Company Admin';
        if (!body.industry) body.industry = 'Technology';
        if (!body.country) body.country = 'United States';
      }

      var targetRole = form.dataset.role || 'freelancer';
      var url = (kind === 'login') ? ('api/login/' + targetRole) : ('api/register/' + kind);

      api(url, { method: 'POST', body: JSON.stringify(body) })
        .then(function (data) {
          if (kind === 'login') {
            if (box) show(box, 'ok', 'Signing into workspace...');
            setTimeout(function () {
              location.href = data.redirect || (targetRole === 'company' ? 'company-dashboard.html' : targetRole === 'admin' ? 'admin-dashboard.html' : 'freelancer-dashboard.html');
            }, 300);
            return;
          }

          // Registration success
          if (form.dataset.next) {
            if (box) show(box, 'ok', 'Account created! Redirecting...');
            setTimeout(function () { location.href = form.dataset.next; }, 600);
          } else if (typeof setAuthMode === 'function') {
            if (box) show(box, 'ok', 'Account created successfully! Taking you to sign in...');
            setTimeout(function () {
              setAuthMode('login');
              var emailInput = document.getElementById('email');
              if (emailInput && body.email) emailInput.value = body.email;
              if (btn) { btn.disabled = false; btn.textContent = label; }
            }, 800);
          } else {
            // Direct redirect to dashboard
            if (box) show(box, 'ok', 'Account created! Opening your dashboard...');
            setTimeout(function () {
              location.href = data.redirect || (kind === 'company' ? 'company-dashboard.html' : 'freelancer-dashboard.html');
            }, 600);
          }
        })
        .catch(function (err) {
          if (box) show(box, 'err', err.message || 'An error occurred.');
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  });

  // Dashboards: load active signed-in user and handle logout
  if (document.body.dataset.dashboard) {
    var who = document.getElementById('who');
    api('api/me')
      .then(function (u) { 
        if (who) who.textContent = u.name || u.email || 'Welcome'; 
      })
      .catch(function () {
        if (!isStaticHost) {
          location.href = document.body.dataset.login || 'login.html';
        }
      });

    var out = document.getElementById('logout');
    if (out) {
      out.addEventListener('click', function () {
        api('api/logout', { method: 'POST' }).finally(function () { 
          location.href = document.body.dataset.login || 'index.html'; 
        });
      });
    }
  }
})();
