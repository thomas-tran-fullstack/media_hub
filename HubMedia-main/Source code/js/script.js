// API base (frontend served on :8080)
const API_BASE = 'http://localhost:3000';
// Use a safe API host: prefer configured API_BASE, otherwise fall back to current origin.
const API_HOST = (typeof API_BASE === 'string' && API_BASE && API_BASE.length > 0) ? API_BASE.replace(/\/$/, '') : window.location.origin;

// ==================== NAVIGATION ====================
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        // Allow default navigation
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
    });
});

// ==================== STATS COUNTER ANIMATION ====================
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Format number
        if (target >= 1000000) {
            element.textContent = (current / 1000000).toFixed(1) + 'M';
        } else if (target >= 1000) {
            element.textContent = (current / 1000).toFixed(1) + 'K';
        } else if (target % 1 !== 0) {
            element.textContent = current.toFixed(1) + '%';
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Return a string in `YYYY-MM-DDTHH:MM` suitable for `datetime-local` inputs (local time)
function getLocalDatetimeLocalString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Return YYYY-MM-DD in local timezone (avoid UTC toISOString shift)
function formatLocalDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Parse server datetime string as LOCAL datetime to preserve user-selected time
function parseLocalDatetime(dtStr) {
    if (!dtStr) return null;
    // If contains timezone info (Z or +HH:MM), let Date parse it (respect offset)
    if (/[zZ]|[+\-]\d{2}:?\d{2}$/.test(dtStr)) {
        return new Date(dtStr);
    }
    // Normalize separator (T or space), remove fractional seconds
    const s = String(dtStr).split('.')[0].replace('T', ' ');
    const parts = s.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm, ss] = (timePart.split(':').map(Number)).concat([0,0,0]);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
}

// Refresh dashboard/profile stats UI elements
async function refreshStatsUI() {
    try {
        const res = await fetch(API_HOST + '/api/dashboard/stats', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.stats) return;
        // update profile page stat if present
        const statEl = document.getElementById('statTotalPosts');
        if (statEl) statEl.textContent = String(data.stats.total_posts ?? 0);
        // update generic stat cards if present
        const cards = document.querySelectorAll('.stats-overview .stat-card .stat-details h3');
        if (cards && cards.length >= 1) {
            cards[0].textContent = String(data.stats.total_posts ?? 0);
        }
        // update any element with data-stat="total-posts"
        document.querySelectorAll('[data-stat="total-posts"]').forEach(el => el.textContent = String(data.stats.total_posts ?? 0));
    } catch (e) {
        console.warn('refreshStatsUI error', e);
    }
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', () => {
    // Initialize DOM elements
    const contentTableBody = document.getElementById('contentTableBody');
    const createContentBtn = document.getElementById('createContentBtn');
    const contentModal = document.getElementById('contentModal');
    const contentForm = document.getElementById('contentForm');
    const saveContentBtn = document.getElementById('saveContentBtn');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const contentSearch = document.getElementById('contentSearch');
    const contentFilter = document.getElementById('contentFilter');
    const logoutBtn = document.getElementById('logoutBtn');
    const dateFilterDropdown = document.getElementById('dateFilterDropdown');
    const dateFilterToggle = document.getElementById('dateFilterToggle');
    const dateFilterMenu = document.getElementById('dateFilterMenu');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const publishOptions = document.querySelectorAll('input[name="publishType"]');
    const schedulePicker = document.getElementById('schedulePicker');

    // 1. Stats animation will run after we fetch real data (or fallback to sample)
    function animateAllStats() {
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(stat => {
            // prefer dataset.target, otherwise parse visible text as number
            let target = parseFloat(stat.dataset.target);
            if (!target && target !== 0) {
                // try parse from textContent stripping non-numeric
                const txt = String(stat.textContent || '').replace(/[^0-9.\-]/g, '');
                target = parseFloat(txt) || 0;
            }
            // start from 0 for animation
            stat.textContent = '0';
            animateCounter(stat, Number(target) || 0);
        });
    }

    // 2. Load Content từ API
    loadContents();
    // Fetch overview metrics (range) and overall stats (all-time), then animate
    (async () => {
        try {
            // overview for selected range (30 days default)
            await refreshStats();
            // overall stats (all-time totals) to update content total and profile counters
            await refreshStatsUI();
            // animate numbers
            animateAllStats();
        } catch (e) {
            console.warn('Initial overview refresh failed', e);
        }
    })();
    
    // 3. Setup delete confirm modal close handler
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', (e) => {
            // Only close if clicking the overlay background, not the modal content
            if (e.target.classList.contains('modal-overlay')) {
                closeDeleteConfirmModal();
            }
        });
    }

    console.log('Hub Media Dashboard loaded successfully!');

    // Listen for stream-end updates from other tabs/windows and refresh content list
    window.addEventListener('storage', (e) => {
        try {
            if (!e.key) return;
            if (e.key === 'last_stream_update') {
                console.log('[storage] Detected last_stream_update, refreshing contents and overview');
                try { loadContents(); } catch (err) { console.warn('loadContents failed after storage event', err); }
                try { refreshStats(); } catch (err) { console.warn('refreshStats failed after storage event', err); }
            }
        } catch (err) { console.warn('storage event handler error', err); }
    });

    // Integration enforcement: fetch connected platforms and prevent posting to unconnected platforms
    (async function(){
        let userIntegrations = {};
        async function fetchUserIntegrations() {
            try {
                const res = await fetch(API_BASE + '/api/integrations', { credentials: 'include' });
                if (!res.ok) { userIntegrations = {}; return; }
                const j = await res.json();
                if (j && j.success && j.integrations) {
                    // normalize keys to lowercase
                    Object.keys(j.integrations).forEach(k => { userIntegrations[k.toLowerCase()] = !!j.integrations[k]; });
                }
            } catch (e) { userIntegrations = {}; }
        }
        await fetchUserIntegrations();
        // Hide platforms that are not connected (so only connected ones are selectable)
        document.querySelectorAll('input[name="platform"]').forEach(cb => {
            const val = (cb.value || '').toString().toLowerCase();
            const wrapper = cb.closest('.platform-checkbox') || cb.closest('.platform-option');
            if (!val) return;
            if (!userIntegrations[val]) {
                if (wrapper) wrapper.style.display = 'none';
            } else {
                if (wrapper) wrapper.style.display = '';
            }
        });
        // Attach listeners to platform checkboxes across pages
        document.querySelectorAll('input[name="platform"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (cb.checked) {
                    const val = (cb.value || '').toString().toLowerCase();
                    if (!userIntegrations[val]) {
                        showNotification(window.t ? window.t('notConnected') : 'You have not linked with this platform', 'error');
                        cb.checked = false;
                    }
                }
            });
        });
    })();

    // ==================== LOGOUT ====================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                showNotification('Logging out...', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        });
    }

    // ==================== CUSTOM DROPDOWN ====================
    if (dateFilterToggle && dateFilterMenu) {
        // Toggle dropdown
        dateFilterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dateFilterDropdown.classList.toggle('active');
        });
        
        // Select item
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove active from all items
                dropdownItems.forEach(i => i.classList.remove('active'));
                
                // Add active to clicked item
                item.classList.add('active');
                
                // Update button text
                const text = item.querySelector('span').textContent;
                document.querySelector('.dropdown-text').textContent = text;
                
                // Close dropdown
                dateFilterDropdown.classList.remove('active');
                
                // Get value and refresh stats (then animate)
                const days = item.dataset.value;
                (async () => { await refreshStats(days); animateAllStats(); })();
            });
        });
    }

    // Fetch overview metrics for the selected days and update the stat cards
    async function refreshStats(days = 30) {
        try {
            const res = await fetch(API_HOST + '/api/dashboard/overview?days=' + encodeURIComponent(days), { credentials: 'include' });
            if (!res.ok) return false;
            const j = await res.json();
            if (!j.success || !j.overview) return false;

            const o = j.overview;
            // stat cards are in order: 0-New Followers,1-Engagement Rate,2-Content Published,3-Live Viewers
            const cards = document.querySelectorAll('.stats-grid .stat-card');
            if (!cards || cards.length < 4) return;

            // New Followers
            const nfEl = cards[0].querySelector('.stat-value');
            const nfChangeEl = cards[0].querySelector('.stat-change');
            if (nfEl) {
                nfEl.dataset.target = String(Number(o.new_followers || 0));
                nfEl.textContent = '0';
            }
            if (nfChangeEl) {
                const pct = Number(o.new_followers_pct || 0);
                nfChangeEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
                nfChangeEl.className = 'stat-change ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
            }

            // Engagement Rate (we use revenue comparison percent)
            const erEl = cards[1].querySelector('.stat-value');
            const erChangeEl = cards[1].querySelector('.stat-change');
            if (erEl) {
                erEl.dataset.target = String(Number(o.revenue) || 0);
                erEl.textContent = '0';
            }
            if (erChangeEl) {
                const pct = Number(o.revenue_pct || 0);
                erChangeEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
                erChangeEl.className = 'stat-change ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
            }

            // Content Published
            const cpEl = cards[2].querySelector('.stat-value');
            const cpChangeEl = cards[2].querySelector('.stat-change');
            if (cpEl) {
                cpEl.dataset.target = String(Number(o.content_published || 0));
                cpEl.textContent = '0';
            }
            if (cpChangeEl) {
                const pct = Number(o.content_published_pct || 0);
                cpChangeEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
                cpChangeEl.className = 'stat-change ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
            }

            // Live Viewers (sum of views in period) and YoY percent
            const lvEl = cards[3].querySelector('.stat-value');
            const lvChangeEl = cards[3].querySelector('.stat-change');
            if (lvEl) {
                lvEl.dataset.target = String(Number(o.live_views || 0));
                lvEl.textContent = '0';
            }
            if (lvChangeEl) {
                const pct = Number(o.live_views_pct_year || 0);
                lvChangeEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs last year`;
                lvChangeEl.className = 'stat-change ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
            }

            return true;
        } catch (e) {
            console.warn('refreshStats error', e);
            return false;
        }
    }

    // Initial load: read default selected days value from dropdown and refresh
    (async function(){
        const active = document.querySelector('.dropdown-item.active');
        const days = active ? active.dataset.value : '30';
        const ok = await refreshStats(days);
        // animate with fetched data if available, otherwise animate sample values
        animateAllStats();
    })();

    // ==================== CONTENT MANAGEMENT - EVENT LISTENERS ====================
    // Create Content Button
    if (createContentBtn) {
        createContentBtn.addEventListener('click', () => openContentModal());
    }

    // Close Modal Buttons
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeContentModal);
    });

    // Save Content Form
    if (saveContentBtn) {
        saveContentBtn.addEventListener('click', async () => {
            const id = document.getElementById('contentId').value;
            const title = document.getElementById('contentTitle').value;
            const category = document.getElementById('contentCategory').value;
            const description = document.getElementById('contentDescription').value;
            
            // Get platforms from checkboxes
            const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
                .map(cb => cb.value.charAt(0).toUpperCase() + cb.value.slice(1));
            
            // Get status from radio buttons
            const publishType = document.querySelector('input[name="publishType"]:checked').value;
            let status = 'draft';
            if (publishType === 'now') status = 'published';
            if (publishType === 'schedule') status = 'scheduled';
            // scheduled_at if scheduling
            const scheduleDateEl = document.getElementById('scheduleDate');
            let scheduled_at = (publishType === 'schedule' && scheduleDateEl && scheduleDateEl.value) ? scheduleDateEl.value : null;
            
            // Convert scheduled_at from datetime-local format (YYYY-MM-DDTHH:MM) to database format (YYYY-MM-DD HH:MM:00)
            if (scheduled_at) {
                const [date, time] = scheduled_at.split('T');
                scheduled_at = `${date} ${time}:00`;
            }

            // Validation: cannot schedule in the past
            if (publishType === 'schedule') {
                if (!scheduled_at) {
                    showNotification('Vui lòng chọn ngày/giờ cho Schedule', 'error');
                    return;
                }
                const chosen = parseLocalDatetime(scheduled_at) || new Date(scheduled_at);
                const now = new Date();
                if (chosen <= now) {
                    showNotification('Không thể chọn ngày trong quá khứ cho Schedule', 'error');
                    return;
                }
                
                // Check for duplicate schedule at the same time (only for new contents, not edits)
                if (!id) {
                    // Convert scheduled_at to the format used for comparison (YYYY-MM-DD HH:MM)
                    const scheduledDate = scheduled_at.split(' ')[0];
                    const scheduledTimeFormatted = scheduled_at.split(' ')[1]?.slice(0, 5) || '00:00';
                    
                    const isDuplicate = contentData.some(item => {
                        if (!item.scheduled_at) return false;
                        const itemDate = item.scheduled_at.split(' ')[0];
                        const itemTime = item.scheduled_at.split(' ')[1]?.slice(0, 5) || '00:00';
                        return itemDate === scheduledDate && itemTime === scheduledTimeFormatted;
                    });
                    
                    if (isDuplicate) {
                        showNotification('Bạn đã có lịch trình cho thời gian này trước đó', 'error');
                        return;
                    }
                }
            }
            
            if (!title || !category) {
                showNotification('Vui lòng điền đầy đủ thông tin', 'error');
                return;
            }

            try {
                if (id) {
                    // Cập nhật
                    const res = await fetch(API_BASE + `/api/contents/${id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description, content_type: category.toLowerCase(), status, scheduled_at, platforms })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Content cập nhật thành công', 'success');
                        await loadContents();
                        try { await refreshStatsUI(); } catch (e) { console.warn('refreshStatsUI failed', e); }
                    } else {
                        showNotification(data.message || 'Cập nhật thất bại', 'error');
                    }
                } else {
                    // Tạo mới
                    const res = await fetch(API_BASE + '/api/contents', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title, 
                            description, 
                            content_type: category.toLowerCase(), 
                            status,
                            scheduled_at,
                            platforms
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Content tạo thành công', 'success');
                        await loadContents();
                        try { await refreshStatsUI(); } catch (e) { console.warn('refreshStatsUI failed', e); }
                    } else {
                        showNotification(data.message || 'Tạo thất bại', 'error');
                    }
                }
                closeContentModal();
            } catch (err) {
                console.error('Lỗi:', err);
                showNotification('Lỗi khi lưu content', 'error');
            }
        });
    }

    // Search & Filter
    if (contentSearch) {
        contentSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = contentData.filter(item => item.title.toLowerCase().includes(term));
            renderContentTable(filtered);
        });
    }

    if (contentFilter) {
        contentFilter.addEventListener('change', (e) => {
            const status = e.target.value;
            const filtered = status === 'all' 
                ? contentData 
                : contentData.filter(item => item.status.toLowerCase() == status);
            renderContentTable(filtered);
        });
    }

    // Schedule Toggle
    publishOptions.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'schedule') {
                schedulePicker.classList.remove('hidden');
            } else {
                schedulePicker.classList.add('hidden');
            }
        });
    });

    // Content Title Length Counter
    const contentTitle = document.getElementById('contentTitle');
    const titleCount = document.getElementById('titleCount');
    if (contentTitle && titleCount) {
        contentTitle.addEventListener('input', (e) => {
            const len = e.target.value.length;
            titleCount.textContent = `${len}/100`;
        });
    }

    // Start auto-publish check every 30 seconds
    setInterval(checkAndAutoPublishScheduled, 30000);
    console.log('[AUTO-PUBLISH] Check interval started (every 30 seconds)');
});

// Helper Functions
function refreshStats(days) {
    const statValues = document.querySelectorAll('.stat-value');
    const multipliers = { '1': 0.03, '7': 0.2, '30': 1, '90': 2.5 };
    const multiplier = multipliers[days] || 1;
    
    statValues.forEach(stat => {
        const baseTarget = parseFloat(stat.dataset.target);
        const newTarget = baseTarget * multiplier;
        animateCounter(stat, newTarget, 1000);
    });
}

// ==================== CONTENT MANAGEMENT ====================
// Dữ liệu content sẽ được lấy từ API
let contentData = [];
let currentPage = 1;
const itemsPerPage = 10;
let _autoPublishRun = false; // prevent repeated auto-publish loops

// Fetch dữ liệu content từ API
async function loadContents() {
    try {
        const res = await fetch(API_BASE + '/api/contents', {
            credentials: 'include'
        });
        
        if (res.status === 401) {
            console.warn('Chưa đăng nhập, sử dụng dữ liệu mẫu');
            // Nếu chưa đăng nhập, sử dụng dữ liệu mẫu
            contentData = [
                { id: 1, title: 'Content 1', category: 'Article', status: 'Published', date: formatLocalDate(new Date()), views: 1234, description: 'Sample content', content_type: 'article', created_at: new Date().toString(), scheduled_at: null },
                { id: 2, title: 'Content 2', category: 'Video', status: 'Published', date: formatLocalDate(new Date()), views: 5678, description: 'Sample video', content_type: 'video', created_at: new Date().toString(), scheduled_at: null }
            ];
            renderContentTable();
            renderActivities();
            renderSchedule();
            return;
        }
        
        const data = await res.json();
        if (data.success && data.contents) {
            // Map dữ liệu từ DB sang định dạng hiển thị
            contentData = data.contents.map(item => ({
                id: item.content_id,
                title: item.title,
                category: item.content_type === 'article' ? 'Article' : (item.content_type === 'video' ? 'Video' : 'Livestream'),
                status: item.status === 'published' ? 'Published' : (item.status === 'draft' ? 'Draft' : 'Scheduled'),
                date: item.created_at ? formatLocalDate(new Date(item.created_at)) : '',
                views: item.view_count || 0,
                description: item.description || '',
                content_type: item.content_type,
                thumbnail_url: item.thumbnail_url || null,
                created_at: item.created_at,
                scheduled_at: (function() {
                    if (!item.scheduled_at) return null;
                    try {
                        const dt = parseLocalDatetime(item.scheduled_at) || new Date(item.scheduled_at);
                        const pad = (n) => String(n).padStart(2, '0');
                        return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
                    } catch (e) { return item.scheduled_at; }
                })()
            }));
            // If any scheduled items are past due, auto-publish them on server (one-time)
            try {
                if (!_autoPublishRun) {
                    _autoPublishRun = true;
                    const now = new Date();
                    const toPublish = contentData.filter(c => (c.scheduled_at) && ((parseLocalDatetime(c.scheduled_at) || new Date(c.scheduled_at)) <= now) && ((c.status||'').toLowerCase() === 'scheduled'));
                    if (toPublish.length > 0) {
                        // Update all past scheduled to published
                        await Promise.all(toPublish.map(item => fetch(API_BASE + `/api/contents/${item.id}`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'published', scheduled_at: null })
                        }).then(r => r.json()).catch(() => null)));
                        // reload contentData once
                        const res2 = await fetch(API_BASE + '/api/contents', { credentials: 'include' });
                        const d2 = await res2.json();
                        if (d2.success && d2.contents) {
                            contentData = d2.contents.map(item => ({
                                id: item.content_id,
                                title: item.title,
                                category: item.content_type === 'article' ? 'Article' : (item.content_type === 'video' ? 'Video' : 'Livestream'),
                                status: item.status === 'published' ? 'Published' : (item.status === 'draft' ? 'Draft' : 'Scheduled'),
                                date: item.created_at ? formatLocalDate(new Date(item.created_at)) : '',
                                views: item.view_count || 0,
                                description: item.description || '',
                                content_type: item.content_type,
                                thumbnail_url: item.thumbnail_url || null,
                                created_at: item.created_at,
                                scheduled_at: (function() {
                                    if (!item.scheduled_at) return null;
                                    try {
                                        const dt = parseLocalDatetime(item.scheduled_at) || new Date(item.scheduled_at);
                                        const pad = (n) => String(n).padStart(2, '0');
                                        return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
                                    } catch (e) { return item.scheduled_at; }
                                })()
                            }));
                            try { await refreshStatsUI(); } catch (e) { console.warn('refreshStatsUI failed after auto-publish', e); }
                        }
                    }
                }
            } catch (e) {
                console.warn('Auto-publish scheduled items failed', e);
            }
            // initialize pagination and render
            currentPage = 1;
            renderContentTable();
            renderActivities();
            renderSchedule();
        } else {
            console.warn('Không có dữ liệu content:', data.message);
        }
    } catch (err) {
        console.error('Lỗi khi tải content:', err);
        showNotification('Lỗi khi tải dữ liệu content', 'error');
    }
}

// Check and auto-publish scheduled content whose time has arrived
async function checkAndAutoPublishScheduled() {
    try {
        if (!contentData || contentData.length === 0) return;
        
        const now = new Date();
        const scheduledItems = contentData.filter(c => 
            c.scheduled_at && 
            (new Date(c.scheduled_at) <= now) && 
            (c.status === 'Scheduled')
        );
        
        if (scheduledItems.length === 0) return;
        
        console.log('[AUTO-PUBLISH] Found', scheduledItems.length, 'items to publish');
        
        // Update each scheduled item to published
        for (const item of scheduledItems) {
            try {
                const res = await fetch(API_BASE + `/api/contents/${item.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: 'published',
                        scheduled_at: null 
                    })
                });
                
                if (res.ok) {
                    const result = await res.json();
                    console.log('[AUTO-PUBLISH] Published:', item.title);
                    
                    // Update local contentData
                    const index = contentData.findIndex(c => c.id === item.id);
                    if (index !== -1) {
                        contentData[index].status = 'Published';
                        contentData[index].scheduled_at = null;
                    }
                }
            } catch (e) {
                console.error('[AUTO-PUBLISH] Error publishing', item.title, e);
            }
        }
        
        // Re-render after publishing
        if (scheduledItems.length > 0) {
            renderContentTable();
            renderActivities();
            renderSchedule();
        }
    } catch (e) {
        console.error('[AUTO-PUBLISH] Check failed:', e);
    }
}

// Render Recent Activities từ content
function renderActivities() {
    const activitiesList = document.getElementById('activitiesList');
    if (!activitiesList) return;
    
    activitiesList.innerHTML = '';
    
    // Lấy 5 content gần nhất
    const recentItems = contentData.slice(0, 5);
    
    recentItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        
        // Xác định icon dựa trên content_type
        let iconClass = 'edit';
        if (item.content_type === 'livestream') iconClass = 'livestream';
        else if (item.content_type === 'video') iconClass = 'video';
        
        const dateObj = new Date(item.created_at);
        const timeAgo = getTimeAgo(dateObj);
        
        div.innerHTML = `
            <div class="activity-icon ${iconClass}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </div>
            <div class="activity-content">
                <h4>${item.title}</h4>
                <p class="activity-time">${timeAgo}</p>
            </div>
            <span class="activity-badge ${item.status.toLowerCase()}">${item.status}</span>
        `;
        activitiesList.appendChild(div);
    });
}

// Render Publishing Schedule từ content scheduled
function renderSchedule() {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;

    scheduleList.innerHTML = '';

    // Use real scheduled content from contentData
    const scheduledItems = contentData.filter(item => item.status === 'Scheduled' && item.scheduled_at);

    scheduledItems.slice(0, 4).forEach(item => {
        const dateObj = parseLocalDatetime(item.scheduled_at) || new Date();
        const dayName = getDayName(dateObj);
        const dayNumber = dateObj.getDate();
        const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `
            <div class="schedule-date">
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
            </div>
            <div class="schedule-content">
                <h4>${item.title}</h4>
                <p class="schedule-time">${timeString}</p>
            </div>
        `;
        scheduleList.appendChild(div);
    });
}

// Helper: Tính thời gian trước đó
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' năm trước';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' tháng trước';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' ngày trước';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' giờ trước';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' phút trước';
    
    return Math.floor(seconds) + ' giây trước';
}

// Helper: Lấy tên ngày
function getDayName(date) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
}

// Render Table
function renderContentTable(data = contentData) {
    const contentTableBodyLocal = document.getElementById('contentTableBody');
    const paginationEl = document.querySelector('.pagination');
    if (!contentTableBodyLocal) return;

    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = data.slice(start, start + itemsPerPage);

    contentTableBodyLocal.innerHTML = '';
    pageItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.title}</strong></td>
            <td>${item.category}</td>
            <td><span class="status-badge ${item.status.toLowerCase()}">${item.status}</span></td>
            <td>${item.date}</td>
            <td>${item.views.toLocaleString()}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editContent(${item.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteContent(${item.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        contentTableBodyLocal.appendChild(row);
    });

    // Render pagination controls
    if (paginationEl) {
        const pageInfo = paginationEl.querySelector('.page-info');
        const controls = paginationEl.querySelector('.page-controls');
        if (pageInfo) pageInfo.textContent = `Showing ${start + 1}-${Math.min(start + itemsPerPage, totalItems)} of ${totalItems} items`;

        if (controls) {
            controls.innerHTML = '';
            const prevBtn = document.createElement('button');
            prevBtn.className = 'btn-page';
            prevBtn.textContent = '<';
            prevBtn.disabled = currentPage === 1;
            prevBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderContentTable(); });
            controls.appendChild(prevBtn);

            for (let p = 1; p <= totalPages; p++) {
                const btn = document.createElement('button');
                btn.className = 'btn-page' + (p === currentPage ? ' active' : '');
                btn.textContent = p;
                btn.addEventListener('click', () => { currentPage = p; renderContentTable(); });
                controls.appendChild(btn);
            }

            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn-page';
            nextBtn.textContent = '>';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.addEventListener('click', () => { currentPage = Math.min(totalPages, currentPage + 1); renderContentTable(); });
            controls.appendChild(nextBtn);
        }
    }
}

// Modal Functions
function openContentModal(title = 'Create New Content') {
    if (contentModal) {
        document.getElementById('modalTitle').textContent = title;
        contentModal.classList.add('active');
        
        // Set min datetime to now (only allow future date/time for scheduling)
        const scheduleDateEl = document.getElementById('scheduleDate');
        if (scheduleDateEl) {
            scheduleDateEl.min = getLocalDatetimeLocalString(new Date());
        }
        
        // Reset specific new fields
        resetAdvancedFields();
    }
}

function closeContentModal() {
    if (contentModal) {
        contentModal.classList.remove('active');
        contentForm.reset();
        document.getElementById('contentId').value = '';
        resetAdvancedFields();
    }
}

function resetAdvancedFields() {
    // Reset Media
    document.getElementById('mediaPreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('mediaUpload').value = '';
    
    // Reset Schedule
    document.getElementById('schedulePicker').classList.add('hidden');
    
    // Reset Char Count
    document.getElementById('titleCount').textContent = '0/100';
    
    // Reset Platforms
    document.querySelectorAll('input[name="platform"]').forEach(cb => cb.checked = false);
}

// Advanced Modal Logic
const uploadZone = document.getElementById('uploadZone');
const mediaUpload = document.getElementById('mediaUpload');
const mediaPreview = document.getElementById('mediaPreview');
const previewImage = document.getElementById('previewImage');
const removeMediaBtn = document.getElementById('removeMediaBtn');
const browseText = document.querySelector('.browse-text');

if (uploadZone) {
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    });

    // Browse Click
    uploadZone.addEventListener('click', (e) => {
        if(e.target !== removeMediaBtn) mediaUpload.click();
    });

    mediaUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    });

    removeMediaBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering upload click
        resetAdvancedFields();
    });
}

function handleFileSelect(file) {
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            document.getElementById('uploadPlaceholder').classList.add('hidden');
            mediaPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else if (file && file.type.match('video.*')) {
        // Simple video placeholder logic
        alert('Video upload simulation: Video selected');
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        mediaPreview.classList.remove('hidden');
        previewImage.src = 'img/video-placeholder.png'; // Mock placeholder
    }
}

// Title Char Count
const contentTitle = document.getElementById('contentTitle');
const titleCount = document.getElementById('titleCount');
if (contentTitle) {
    contentTitle.addEventListener('input', (e) => {
        const len = e.target.value.length;
        titleCount.textContent = `${len}/100`;
    });
}

// Schedule Toggle
const publishOptions = document.querySelectorAll('input[name="publishType"]');
const schedulePicker = document.getElementById('schedulePicker');
publishOptions.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'schedule') {
            schedulePicker.classList.remove('hidden');
        } else {
            schedulePicker.classList.add('hidden');
        }
    });
});

// Global functions for inline onclick
window.editContent = function(id) {
    const item = contentData.find(i => i.id === id);
    if (item) {
        document.getElementById('contentId').value = item.id;
        document.getElementById('contentTitle').value = item.title;
        // Set category: try to match option values (case-insensitive)
        const catEl = document.getElementById('contentCategory');
        if (catEl) {
            Array.from(catEl.options).forEach(opt => {
                if (opt.value.toLowerCase() === (item.content_type || '').toLowerCase() || opt.value.toLowerCase() === (item.category || '').toLowerCase()) {
                    opt.selected = true;
                }
            });
        }

        document.getElementById('contentDescription').value = item.description || '';

        // Populate platforms if available (supports JSON array or comma-separated string)
        try {
            let platformsRaw = item.platforms || item.platform || null;
            let list = [];
            if (Array.isArray(platformsRaw)) list = platformsRaw;
            else if (typeof platformsRaw === 'string') {
                try { list = JSON.parse(platformsRaw); }
                catch (e) { list = platformsRaw ? String(platformsRaw).split(/[,\s]+/).filter(Boolean) : []; }
            }
            document.querySelectorAll('input[name="platform"]').forEach(cb => cb.checked = list.includes(cb.value));
        } catch (e) {}

        // Media preview (thumbnail or video placeholder)
        const previewEl = document.getElementById('mediaPreview');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const previewImageEl = document.getElementById('previewImage');
        if (item.thumbnail_url) {
            previewImageEl.src = item.thumbnail_url;
            uploadPlaceholder.classList.add('hidden');
            previewEl.classList.remove('hidden');
        } else if (item.content_type === 'video') {
            previewImageEl.src = 'img/video-placeholder.png';
            uploadPlaceholder.classList.add('hidden');
            previewEl.classList.remove('hidden');
        } else {
            uploadPlaceholder.classList.remove('hidden');
            previewEl.classList.add('hidden');
        }

        // Publish status and schedule
        const publishValue = (item.status || '').toLowerCase();
        if (publishValue === 'published') {
            document.querySelectorAll('input[name="publishType"]').forEach(r => r.checked = r.value === 'now');
            document.getElementById('schedulePicker').classList.add('hidden');
        } else if (publishValue === 'scheduled') {
            document.querySelectorAll('input[name="publishType"]').forEach(r => r.checked = r.value === 'schedule');
            document.getElementById('schedulePicker').classList.remove('hidden');
            if (item.scheduled_at) {
                const dt = parseLocalDatetime(item.scheduled_at) || new Date();
                const local = getLocalDatetimeLocalString(dt);
                const scheduleDateEl = document.getElementById('scheduleDate');
                if (scheduleDateEl) scheduleDateEl.value = local;
            }
        } else {
            document.querySelectorAll('input[name="publishType"]').forEach(r => r.checked = r.value === 'draft');
            document.getElementById('schedulePicker').classList.add('hidden');
        }

        openContentModal('Chỉnh sửa Content');
    }
};

window.deleteContent = async function(id) {
    // Get content title for confirm message
    const content = contentData.find(c => c.id === id);
    const contentTitle = content ? content.title : 'content này';
    
    // Show delete confirm modal
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) {
        console.warn('Delete confirm modal not found');
        return;
    }
    
    // Update modal message - use i18n-compatible approach
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        // Find or create span with i18n attribute
        let msgSpan = modalBody.querySelector('[data-i18n="deleteContentConfirm"]');
        if (!msgSpan) {
            msgSpan = document.createElement('span');
            msgSpan.setAttribute('data-i18n', 'deleteContentConfirm');
            msgSpan.textContent = 'Are you sure you want to delete this content? This action cannot be undone.';
            modalBody.innerHTML = '';
            modalBody.appendChild(msgSpan);
        }
    }
    
    // Show modal by adding class
    modal.classList.add('delete-confirm-modal-overlay');
    
    // Ensure translate is called so modal content is translated to current language
    if (typeof window.translate === 'function') {
        const lang = localStorage.getItem('preferred_lang') || 'en';
        window.translate(lang);
    }
    
    // Handle confirm button click
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        // Remove old event listener by cloning
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new event listener with proper event handling
        const updatedConfirmBtn = document.getElementById('confirmDeleteBtn');
        updatedConfirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const res = await fetch(API_BASE + `/api/contents/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                    showNotification('Content đã xóa thành công', 'success');
                    closeDeleteConfirmModal();
                    await loadContents();
                    try { await refreshStatsUI(); } catch (e) { console.warn('refreshStatsUI failed', e); }
                } else {
                    showNotification(data.message || 'Xóa thất bại', 'error');
                }
            } catch (err) {
                console.error('Lỗi:', err);
                showNotification('Lỗi khi xóa content', 'error');
            }
        });
    }
};

window.closeDeleteConfirmModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('delete-confirm-modal-overlay');
    }
};

// ==================== ACTIVITIES ====================
function addActivity(type, title, time, badge) {
    const activitiesList = document.getElementById('activitiesList');
    if (!activitiesList) return;
    
    const icons = {
        edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
        livestream: '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>',
        approved: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
        video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>'
    };
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="activity-icon ${type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${icons[type] || icons.edit}
            </svg>
        </div>
        <div class="activity-content">
            <h4>${title}</h4>
            <p class="activity-time">${time}</p>
        </div>
        <span class="activity-badge ${badge}">${badge}</span>
    `;
    
    activitiesList.insertBefore(activityItem, activitiesList.firstChild);
    if (activitiesList.children.length > 5) activitiesList.lastChild.remove();
}

// ==================== ALL ACTIVITIES MODAL ====================
const viewAllActivities = document.getElementById('viewAllActivities');
const activitiesModal = document.getElementById('activitiesModal');
const closeActivitiesModal = document.getElementById('closeActivitiesModal');
const activityFilterTabs = document.querySelectorAll('.activity-filters .filter-tab');

// Extended activities data
const allActivities = [
    { type: 'edit', title: 'Đăng bài "Khuyến Mãi Cuối Tuần"', time: '2 giờ trước', badge: 'FB/Zalo' },
    { type: 'livestream', title: 'Livestream "Flash Sale Rau Củ"', time: 'Lên lịch lúc 19:00', badge: 'Sắp diễn ra' },
    { type: 'approved', title: 'Duyệt bình luận khách hàng', time: '1 ngày trước • "Trái Cây Nhập Khẩu"', badge: 'Hoàn thành' },
    { type: 'video', title: 'Video "Hướng Dẫn Chọn Hải Sản"', time: '2 ngày trước', badge: 'Hoàn thành' },
    { type: 'analytics', title: 'Báo cáo doanh số tháng 12', time: '3 ngày trước', badge: 'Hoàn thành' },
    { type: 'edit', title: 'Đăng bài "Combo Gia Đình"', time: '4 ngày trước', badge: 'FB/Zalo/TikTok' },
    { type: 'livestream', title: 'Livestream "Giới Thiệu Sản Phẩm Organic"', time: '5 ngày trước', badge: 'Hoàn thành' },
    { type: 'approved', title: 'Duyệt 15 bình luận mới', time: '6 ngày trước', badge: 'Hoàn thành' },
    { type: 'video', title: 'Video "Hướng Dẫn Bảo Quản Thực Phẩm"', time: '1 tuần trước', badge: 'Hoàn thành' },
    { type: 'edit', title: 'Đăng bài "Flash Sale Thịt Heo"', time: '1 tuần trước', badge: 'FB/Zalo' }
];

// Will hold activities fetched from server when available
let fetchedActivities = null;

function mapActionToType(action) {
    if (!action) return 'edit';
    const a = action.toLowerCase();
    if (a.includes('livestream')) return 'livestream';
    if (a.includes('video')) return 'video';
    if (a.includes('approve') || a.includes('approved')) return 'approved';
    if (a.includes('analytics')) return 'analytics';
    return 'edit';
}

function humanizeAction(action, details) {
    if (details) {
        try { const d = JSON.parse(details); if (d.title) return d.title; } catch (e) {}
    }
    if (!action) return 'Activity';
    return action.replace(/_|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

let currentActivityFilter = 'all';

function getActivityIcon(type) {
    const icons = {
        edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
        livestream: '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>',
        approved: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
        video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
        analytics: '<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>'
    };
    return icons[type] || icons.edit;
}

function filterActivities() {
    if (currentActivityFilter === 'all') {
        return allActivities;
    }
    return allActivities.filter(activity => activity.type === currentActivityFilter);
}

function renderAllActivities() {
    // Render contents list (Title, time, Description) filtered by tab
    const container = document.getElementById('allActivitiesList');
    if (!container) return;

    // Make sure we use the latest contentData
    const source = Array.isArray(contentData) ? contentData.slice() : [];

    let filtered = source;
    switch (currentActivityFilter) {
        case 'edit': // treat as Articles (Bài đăng)
            filtered = source.filter(c => (c.content_type || '').toLowerCase() === 'article');
            break;
        case 'video':
            filtered = source.filter(c => (c.content_type || '').toLowerCase() === 'video');
            break;
        case 'livestream':
            filtered = source.filter(c => (c.content_type || '').toLowerCase() === 'livestream');
            break;
        case 'approved': // "Duyệt" -> show published contents
            filtered = source.filter(c => (c.status || '').toLowerCase() === 'published');
            break;
        case 'all':
        default:
            filtered = source;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="muted">Không có nội dung để hiển thị.</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const time = item.created_at ? getTimeAgo(new Date(item.created_at)) : (item.date || '');
        const desc = item.description ? `<p class="activity-desc">${escapeHtml(item.description)}</p>` : '';
        // map status to badge text/class
        let badgeText = '';
        let badgeClass = '';
        const st = (item.status || '').toLowerCase();
        if (st === 'published') { badgeText = 'Done'; badgeClass = 'done'; }
        else if (st === 'scheduled') { badgeText = 'Waiting'; badgeClass = 'waiting'; }
        else if (st === 'draft' || st === 'draff') { badgeText = 'Copy'; badgeClass = 'copy'; }
        else { badgeText = item.content_type || ''; badgeClass = String(badgeText).toLowerCase().replace(/\s+/g,'-'); }

        return `
        <div class="activity-item content-item">
            <div class="activity-content">
                <h4>${escapeHtml(item.title)}</h4>
                <p class="activity-time">${time}</p>
                ${desc}
            </div>
            <span class="activity-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Open activities modal (now shows contents list: Title, time, Description)
if (viewAllActivities) {
    viewAllActivities.addEventListener('click', async function(e) {
        e.preventDefault();
        // Refresh contents from API to ensure latest
        try { await loadContents(); } catch (e) { /* ignore */ }
        currentActivityFilter = 'all';
        activityFilterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === 'all');
        });
        renderAllActivities();
        activitiesModal.classList.add('active');
    });
}

// Close activities modal
if (closeActivitiesModal) {
    closeActivitiesModal.addEventListener('click', function() {
        activitiesModal.classList.remove('active');
    });
}

// Activity filter tabs
activityFilterTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        activityFilterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentActivityFilter = this.dataset.filter;
        renderAllActivities();
    });
});

// Close modal when clicking outside
if (activitiesModal) {
    activitiesModal.addEventListener('click', function(e) {
        if (e.target === activitiesModal) {
            activitiesModal.classList.remove('active');
        }
    });
}

// ==================== SCHEDULE & ACTIONS ====================
const schedulePostBtn = document.getElementById('schedulePostBtn');
if (schedulePostBtn) {
    schedulePostBtn.addEventListener('click', function() {
        showNotification('Navigating to Schedule...', 'info');
        setTimeout(() => window.location.href = 'schedule.html', 500);
    });
}

const startLivestreamBtn = document.getElementById('startLivestreamBtn');
if (startLivestreamBtn) {
    startLivestreamBtn.addEventListener('click', function() {
        showNotification('Navigating to Livestream Studio...', 'info');
        setTimeout(() => window.location.href = 'livestream.html', 500);
    });
}

const uploadVideoBtn = document.getElementById('uploadVideoBtn');
if (uploadVideoBtn) {
    uploadVideoBtn.addEventListener('click', function() {
        openContentModal('Upload New Video');
        // Simulate video tab selection
        const categorySelect = document.getElementById('contentCategory');
        if(categorySelect) categorySelect.value = 'Video';
    });
}

const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', function() {
        showNotification('Navigating to Analytics...', 'info');
        setTimeout(() => window.location.href = 'analytics.html', 500);
    });
}

// ==================== SCHEDULED POSTS MODAL ====================
const viewCalendarBtn = document.getElementById('viewCalendarBtn');
const scheduleModal = document.getElementById('scheduleModal');
const closeScheduleModal = document.getElementById('closeScheduleModal');
const scheduleSearch = document.getElementById('scheduleSearch');
const filterTabs = document.querySelectorAll('.filter-tab');

// Scheduled posts will be derived from `contentData` (real data)

let currentFilter = 'all';
let currentSearch = '';

function getTypeLabel(type) {
    const labels = {
        'article': 'Bài viết',
        'livestream': 'Livestream',
        'video': 'Video'
    };
    return labels[type] || type;
}

function filterPosts() {
    // derive scheduled posts from contentData
    let posts = contentData.filter(item => (item.status || '').toLowerCase() === 'scheduled' && item.scheduled_at).map(item => {
        const dt = parseLocalDatetime(item.scheduled_at) || new Date();
        // parse platforms robustly
        let platformsRaw = item.platforms || item.platform || '';
        let parsedPlatforms = '';
        if (Array.isArray(platformsRaw)) parsedPlatforms = platformsRaw.join(', ');
        else if (typeof platformsRaw === 'string') {
            try { const p = JSON.parse(platformsRaw); parsedPlatforms = Array.isArray(p) ? p.join(', ') : String(platformsRaw); }
            catch (e) { parsedPlatforms = String(platformsRaw); }
        } else parsedPlatforms = '';

        return {
            date: formatLocalDate(dt),
            dayName: getDayName(dt),
            title: item.title,
            description: item.description || '',
            time: dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            platforms: parsedPlatforms,
            type: item.content_type || 'article'
        };
    });

    if (currentFilter !== 'all') {
        posts = posts.filter(p => p.type === currentFilter);
    }

    if (currentSearch) {
        posts = posts.filter(p => p.title.toLowerCase().includes(currentSearch.toLowerCase()) || (p.platforms || '').toLowerCase().includes(currentSearch.toLowerCase()));
    }

    return posts;
}

function renderScheduledPosts() {
    const container = document.getElementById('scheduledPostsList');
    const emptyState = document.getElementById('scheduleEmpty');
    if (!container) return;
    
    const filtered = filterPosts();
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.innerHTML = filtered.map(post => `
        <div class="scheduled-post-item">
            <div class="scheduled-post-date">
                <span class="day-name">${post.dayName}</span>
                <span class="day-number">${post.date.split('-')[2]}</span>
            </div>
            <div class="scheduled-post-content">
                <h4>${post.title}</h4>
                <div class="scheduled-post-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${post.time} • ${post.platforms}
                </div>
                <p class="scheduled-desc">${post.description ? escapeHtml(post.description) : ''}</p>
                <span class="post-type-badge ${post.type}">${getTypeLabel(post.type)}</span>
            </div>
        </div>
    `).join('');
}

// Open modal
if (viewCalendarBtn) {
    viewCalendarBtn.addEventListener('click', async function() {
        // Refresh contents from API to ensure calendar shows latest scheduled items
        try { await loadContents(); } catch (e) { /* ignore */ }
        currentFilter = 'all';
        currentSearch = '';
        if (scheduleSearch) scheduleSearch.value = '';
        filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === 'all');
        });
        renderScheduledPosts();
        scheduleModal.classList.add('active');
    });
}

// Close modal
if (closeScheduleModal) {
    closeScheduleModal.addEventListener('click', function() {
        scheduleModal.classList.remove('active');
    });
}

// Filter tabs
filterTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        filterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderScheduledPosts();
    });
});

// Search
if (scheduleSearch) {
    scheduleSearch.addEventListener('input', function(e) {
        currentSearch = e.target.value;
        renderScheduledPosts();
    });
}

// Close modal when clicking outside
if (scheduleModal) {
    scheduleModal.addEventListener('click', function(e) {
        if (e.target === scheduleModal) {
            scheduleModal.classList.remove('active');
        }
    });
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const colors = {
        success: '#00C853',
        info: '#5B5FED',
        warning: '#FF9800',
        error: '#FF4444'
    };
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== REAL-TIME SIMULATION ====================
setInterval(() => {
    const activities = [
        { type: 'edit', title: 'Article updated', time: 'Just now', badge: 'done' },
        { type: 'approved', title: 'Comment approved', time: 'Just now', badge: 'done' },
        { type: 'video', title: 'Video processed', time: 'Just now', badge: 'done' }
    ];
    
    if (Math.random() < 0.1) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        addActivity(activity.type, activity.title, activity.time, activity.badge);
    }
}, 30000);

// CSS Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Mobile Menu
if (window.innerWidth <= 768) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        mainContent.prepend(menuToggle);
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
}
