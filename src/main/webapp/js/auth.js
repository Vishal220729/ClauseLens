(function () {
  var DOMAINS = ['Web Development','Mobile App Development','Graphic Design','UI/UX Design','Content Writing',
    'Video Editing','Digital Marketing','Software Testing','Data Analysis','Consulting','Other'];

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) { var err = new Error(data.error || 'Something went wrong. Try again.'); err.status = res.status; throw err; }
          return data;
        });
      });
  }
  window.CL = { api: api };

  function show(box, kind, text) { box.className = 'msg ' + kind; box.textContent = text; }

  // Freelancer domain pickers: primary select + extra checkboxes that never repeat the primary
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

  // Global helper for dynamically adding secondary domain items in matching 2-column grid
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

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var box = form.querySelector('.msg'); var btn = form.querySelector('button[type=submit]');
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

      // Collect any dynamically added secondary domains
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
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Please wait...'; box.className = 'msg';
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
      var url = kind === 'login' ? 'api/login/' + form.dataset.role : 'api/register/' + kind;
      var isGitHubPages = window.location.hostname.includes('github.io');
      api(url, { method: 'POST', body: JSON.stringify(body) }).then(function (data) {
        if (kind === 'login') { location.href = data.redirect; return; }
        show(box, 'ok', 'Account created. Taking you to sign in...');
        if (form.dataset.next) {
          setTimeout(function () { location.href = form.dataset.next; }, 1200);
        } else if (typeof setAuthMode === 'function') {
          setTimeout(function () {
            setAuthMode('login');
            var emailInput = document.getElementById('email');
            if (emailInput && body.email) emailInput.value = body.email;
          }, 1200);
        }
      }).catch(function (err) {
        if (isGitHubPages) {
          show(box, 'ok', 'GitHub Pages Demo Mode: Opening dashboard...');
          setTimeout(function () {
            var role = form.dataset.role || kind;
            location.href = (role === 'company') ? 'company-dashboard.html' : 'freelancer-dashboard.html';
          }, 600);
          return;
        }
        show(box, 'err', err.message); btn.disabled = false; btn.textContent = label;
      });
    });
  });

  // Dashboards: load the signed-in user, handle logout
  if (document.body.dataset.dashboard) {
    var who = document.getElementById('who');
    var isGitHubPages = window.location.hostname.includes('github.io');
    api('api/me').then(function (u) { if (who) who.textContent = u.name || 'Welcome'; })
      .catch(function () {
        if (isGitHubPages) {
          if (who) who.textContent = (document.body.dataset.dashboard === 'company') ? 'Acme Corp (Demo)' : 'Alex Vance (Demo)';
          return;
        }
        location.href = document.body.dataset.login;
      });
    var out = document.getElementById('logout');
    if (out) out.addEventListener('click', function () {
      api('api/logout', { method: 'POST' }).finally(function () { location.href = document.body.dataset.login; });
    });
  }
})();
