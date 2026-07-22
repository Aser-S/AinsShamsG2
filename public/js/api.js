/**
 * Centralised Fetch API wrapper.
 * All requests are same-origin with credentials (session cookies).
 */

const API = {
  async request(method, url, data) {
    const opts = {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.body = JSON.stringify(data);

    const res = await fetch(url, opts);

    // Session expired
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json.error || (json.errors && json.errors.map(e => e.msg).join(', ')) || 'Request failed';
      throw new Error(msg);
    }
    return json;
  },

  get:    (url)        => API.request('GET',    url),
  post:   (url, data)  => API.request('POST',   url, data),
  put:    (url, data)  => API.request('PUT',    url, data),
  patch:  (url, data)  => API.request('PATCH',  url, data),
  delete: (url)        => API.request('DELETE', url),
};

/** Show a temporary toast notification */
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-xs';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = toast.className.replace(/bg-\w+-\d+/g, '');
  toast.classList.add(type === 'error' ? 'bg-red-600' : type === 'warn' ? 'bg-yellow-500' : 'bg-green-600');
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/** Format currency */
function fmt(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2);
}

/** Format datetime */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
