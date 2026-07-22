/**
 * Shared layout logic: loads sidebar, sets active nav link, fetches current user.
 * Include this script in every authenticated page AFTER api.js.
 */

let currentUser = null;

async function initLayout() {
  // Fetch current user
  try {
    const data = await API.get('/api/auth/me');
    currentUser = data.user;
  } catch {
    window.location.href = '/login';
    return;
  }

  // Render sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = buildSidebar(currentUser);

  // Set active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (window.location.pathname.startsWith(link.dataset.path)) {
      link.classList.add('active');
    }
  });

  // Populate user info in header
  const userNameEl = document.getElementById('userName');
  const userRoleEl = document.getElementById('userRole');
  if (userNameEl) userNameEl.textContent = currentUser.name;
  if (userRoleEl) userRoleEl.textContent = currentUser.role;

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = '/login';
  });
}

function buildSidebar(user) {
  const links = [
    { path: '/dashboard',  label: 'Dashboard',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['ADMIN','MANAGER','CASHIER'] },
    { path: '/pos',        label: 'Point of Sale',   icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', roles: ['ADMIN','MANAGER','CASHIER'] },
    { path: '/inventory',  label: 'Inventory',       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', roles: ['ADMIN','MANAGER','CASHIER'] },
    { path: '/transfers',  label: 'Stock Transfers', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', roles: ['ADMIN','MANAGER'] },
    { path: '/purchasing', label: 'Purchasing',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['ADMIN','MANAGER'] },
    { path: '/reports',    label: 'Reports',         icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['ADMIN','MANAGER'] },
    { path: '/users',      label: 'Users',           icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['ADMIN'] },
  ];

  const visibleLinks = links.filter(l => l.roles.includes(user.role));
  const items = visibleLinks.map(l => `
    <a href="${l.path}" data-path="${l.path}"
       class="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-200 hover:bg-white/10 transition-colors text-sm">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${l.icon}"/>
      </svg>
      <span>${l.label}</span>
    </a>
  `).join('');

  return `
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div class="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div class="overflow-hidden">
          <p class="text-white font-semibold text-sm leading-tight truncate">Sales & Inventory</p>
          <p class="text-slate-400 text-xs truncate">Management System</p>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">${items}</nav>
      <div class="p-3 border-t border-white/10">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <div class="overflow-hidden flex-1 min-w-0">
            <p id="userName" class="text-white text-xs font-medium truncate">${user.name}</p>
            <p id="userRole" class="text-slate-400 text-xs">${user.role}</p>
          </div>
          <button id="logoutBtn" title="Logout"
            class="text-slate-400 hover:text-white transition-colors ml-auto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}
