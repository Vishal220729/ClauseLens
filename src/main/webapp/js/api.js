// ClauseLens unified API client with seamless Mock & Static Cloud Fallback
const API = {
  async get(url) {
    const isStatic = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
    if (isStatic && window.CL_MOCK_DISPATCH) {
      return window.CL_MOCK_DISPATCH(url, { method: 'GET' });
    }

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        if (window.CL_MOCK_DISPATCH) return window.CL_MOCK_DISPATCH(url, { method: 'GET' });
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (err) {
      if (window.CL_MOCK_DISPATCH) return window.CL_MOCK_DISPATCH(url, { method: 'GET' });
      throw err;
    }
  },

  async post(url, data = {}) {
    const isStatic = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
    if (isStatic && window.CL_MOCK_DISPATCH) {
      return window.CL_MOCK_DISPATCH(url, { method: 'POST', body: JSON.stringify(data) });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (window.CL_MOCK_DISPATCH) return window.CL_MOCK_DISPATCH(url, { method: 'POST', body: JSON.stringify(data) });
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (err) {
      if (window.CL_MOCK_DISPATCH) return window.CL_MOCK_DISPATCH(url, { method: 'POST', body: JSON.stringify(data) });
      throw err;
    }
  }
};

function showToast(message, isError = false) {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'err' : ''}`;
  toast.textContent = message;
  box.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
