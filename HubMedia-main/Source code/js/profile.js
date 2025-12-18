/**
 * Profile Page Logic
 * Refactored for modularity and enhanced features
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
    const State = {
        userRole: localStorage.getItem('userRole') || 'guest',
        isDirty: false,
        profileData: null,
        defaults: {
            admin: {
                fullName: 'Quản trị viên',
                email: 'admin@hubmedia.com',
                bio: 'Hệ thống quản lý Hub Media',
                avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%235B5FED'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E"
            },
            customer: {
                fullName: 'Khách hàng',
                email: 'customer@hubmedia.com',
                bio: 'Thành viên thân thiết',
                avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%235B5FED'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'%3EC%3C/text%3E%3C/svg%3E"
            },
            guest: {
                fullName: 'Guest User',
                email: 'guest@hubmedia.com',
                bio: 'Please login to manage profile',
                avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239e9e9e'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'%3EG%3C/text%3E%3C/svg%3E"
            }
        }
    };

    // Backend API base (frontend served from :8080, backend runs on :3000)
    const API_BASE = 'http://localhost:3000';

    // Redirect if not logged in (optional based on requirements)
    if (!localStorage.getItem('userRole')) {
        // window.location.href = 'login.html'; // Uncomment if strict auth needed
    }

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const DOM = {
        // Headers & Text
        displayName: document.getElementById('displayName'),
        displayBio: document.getElementById('displayBio'),
        
        // Forms & Inputs
        profileForm: document.getElementById('profileForm'),
        securityForm: document.getElementById('securityForm'),
        inputs: document.querySelectorAll('#profileForm input, #profileForm textarea'),
        
        // Actions
        btnEdit: document.getElementById('editProfileBtn'),
        btnCancel: document.getElementById('cancelEditBtn'),
        actionsContainer: document.getElementById('profileActions'),
        
        // Avatar
        avatarImg: document.getElementById('profileAvatar'),
        sidebarAvatar: document.querySelector('.sidebar-avatar-img'), 
        // Old input (kept for fallback but mostly unused now)
        avatarInput: document.getElementById('avatarUpload'),
        
        // Buttons
        btnRemoveAvatar: document.getElementById('btnRemoveAvatar'),
        btnViewAvatar: document.getElementById('btnViewAvatar'),
        
        // Avatar Selection Modal
        modal: document.getElementById('avatarModal'),
        btnCloseModal: document.querySelector('.btn-close-modal'),
        btnModalCancel: document.getElementById('btnModalCancel'),
        btnModalSave: document.getElementById('btnModalSave'),
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        dropZone: document.getElementById('dropZone'),
        modalNativeInput: document.getElementById('modalNativeInput'),
        btnBrowse: document.querySelector('.btn-browse'),
        galleryGrid: document.getElementById('avatarGallery'),
        previewContainer: document.getElementById('previewContainer'),
        previewImg: document.getElementById('modalPreviewImage'),

        // Lightbox
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightboxImage'),
        lightboxClose: document.querySelector('.lightbox-close'),
        // Toasts & Security fields
        toastContainer: document.getElementById('toastContainer'),
        passStrength: document.getElementById('passwordStrength'),
        currentPass: document.getElementById('currentPassword'),
        newPass: document.getElementById('newPassword'),
        confirmPass: document.getElementById('confirmPassword'),
        
        // ... rest of DOM
    };

    // ==========================================
    // 3. INITIALIZATION
    // ==========================================
    function init() {
        console.log('[DEBUG] init() called');
        loadStatsFromLocal(); // Load immediately from localStorage, no waiting
        
        // Load stats from backend FIRST (high priority) to show data immediately
        // Use aggressive retry with fallback polling
        loadStats(0).then(() => {
            console.log('[DEBUG] loadStats succeeded, animating stats');
            // Animate stats AFTER loading completes
            animateStats();
        }).catch(err => {
            console.error('[DEBUG] loadStats failed after retries, setting up polling:', err);
            // If initial attempts fail, set up polling to try again
            const pollInterval = setInterval(() => {
                loadStats(0).then(() => {
                    console.log('[DEBUG] Stats loaded via polling, animating');
                    animateStats();
                    clearInterval(pollInterval);
                }).catch(err => console.warn('[DEBUG] Polling attempt failed:', err));
            }, 2000); // Poll every 2 seconds
            
            // Stop polling after 30 seconds to avoid infinite retries
            setTimeout(() => {
                clearInterval(pollInterval);
                console.log('[DEBUG] Stopped polling after 30 seconds');
            }, 30000);
        });
        
        // Load other data in parallel
        loadProfileData();
        renderActivityTimeline();
        setupEventListeners();
        generateGallery(); // [NEW]
        // Don't call animateStats() here - it's called after loadStats() completes
    }
    
    // Load stats from backend (called early during init to show data faster)
    // With aggressive retry logic for resilience
    async function loadStats(retryCount = 0) {
        const MAX_RETRIES = 5; // Increased from 2 to 5
        const BASE_DELAY = 300; // Start with 300ms, increases exponentially
        
        try {
            console.log('[DEBUG] loadStats - attempt', retryCount + 1, 'of', MAX_RETRIES + 1);
            
            // Ensure DOM elements exist before trying to fetch
            const elTotalPosts = document.getElementById('statTotalPosts');
            if (!elTotalPosts) {
                console.warn('[DEBUG] loadStats - DOM elements not ready yet');
                if (retryCount < 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return loadStats(0);
                }
            }
            
            const s = await fetch(API_BASE + '/api/dashboard/stats', { 
                credentials: 'include',
                method: 'GET'
            });
            console.log('[DEBUG] loadStats - response status:', s.status);
            
            if (!s.ok) {
                if (retryCount < MAX_RETRIES) {
                    const delay = BASE_DELAY * Math.pow(1.5, retryCount); // Exponential backoff
                    console.log('[DEBUG] loadStats - response not ok, retrying in', Math.round(delay), 'ms...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return loadStats(retryCount + 1);
                } else {
                    throw new Error('Max retries reached, status: ' + s.status);
                }
            }
            
            const stats = await s.json();
            console.log('[DEBUG] loadStats - response data:', stats);
            
            if (stats.success && stats.stats) {
                console.log('[DEBUG] profile.js loadStats fetched:', stats.stats);
                
                const elTotalPosts = document.getElementById('statTotalPosts');
                const elFollowers = document.getElementById('statFollowers');
                const elViews = document.getElementById('statProfileViews');
                const elRevenue = document.getElementById('statEngagement');

                // Always update all elements, even if value is 0
                if (elTotalPosts) {
                    elTotalPosts.textContent = String(stats.stats.total_posts ?? 0);
                    console.log('[DEBUG] Updated statTotalPosts to:', stats.stats.total_posts);
                }
                
                const serverFollowers = Number(stats.stats.followers || 0);
                const serverAvgViews = Number(stats.stats.avg_livestream_views || 0) || Number(stats.stats.profile_views || 0);
                const serverRevenue = Number(stats.stats.total_revenue || 0);

                if (elFollowers) {
                    elFollowers.textContent = String(serverFollowers);
                    console.log('[DEBUG] Updated statFollowers to:', serverFollowers);
                }
                if (elViews) {
                    elViews.textContent = String(Math.round(serverAvgViews));
                    console.log('[DEBUG] Updated statViews to:', Math.round(serverAvgViews));
                }
                if (elRevenue) {
                    elRevenue.textContent = serverRevenue.toFixed(2);
                    console.log('[DEBUG] Updated statRevenue to:', serverRevenue.toFixed(2));
                }

                console.log('[DEBUG] Stats loaded successfully on attempt', retryCount + 1);
                return; // Success
            } else {
                console.warn('[DEBUG] loadStats - response not successful:', stats);
                if (retryCount < MAX_RETRIES) {
                    const delay = BASE_DELAY * Math.pow(1.5, retryCount);
                    console.log('[DEBUG] loadStats - response unsuccessful, retrying in', Math.round(delay), 'ms...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return loadStats(retryCount + 1);
                }
            }
        } catch (e) {
            console.warn('[DEBUG] loadStats error (attempt', retryCount + 1, '):', e);
            if (retryCount < MAX_RETRIES) {
                const delay = BASE_DELAY * Math.pow(1.5, retryCount);
                console.log('[DEBUG] Retrying in', Math.round(delay), 'ms...');
                await new Promise(resolve => setTimeout(resolve, delay));
                return loadStats(retryCount + 1);
            } else {
                console.error('[DEBUG] loadStats failed after', MAX_RETRIES + 1, 'attempts');
                throw e;
            }
        }
    }

    // Load and display stats immediately from localStorage (no waiting for server)
    function loadStatsFromLocal() {
        try {
            const localStreams = JSON.parse(localStorage.getItem('streams') || '[]');
            if (!Array.isArray(localStreams) || localStreams.length === 0) return;

            const elFollowers = document.getElementById('statFollowers');
            const elViews = document.getElementById('statProfileViews');
            const elRevenue = document.getElementById('statEngagement');

            // Sum all followers gained across all sessions
            const totalFollowers = localStreams.reduce((s, it) => s + (Number(it.followersGained) || 0), 0);
            // Average views across all sessions
            const avgViews = Math.round(localStreams.reduce((s, it) => s + (Number(it.viewersAtEnd) || 0), 0) / localStreams.length);
            // Sum all revenue across all sessions
            const totalRevenue = localStreams.reduce((s, it) => s + (Number(it.revenue) || 0), 0);

            if (elFollowers) elFollowers.textContent = totalFollowers;
            if (elViews) elViews.textContent = avgViews;
            if (elRevenue) elRevenue.textContent = totalRevenue.toFixed(2);

            console.log('[DEBUG] Loaded stats from localStorage:', { totalFollowers, avgViews, totalRevenue });
        } catch (e) {
            console.warn('Could not load local stats', e);
        }
    }

    // Toggle edit mode for personal information
    function setEditMode(on) {
        const all = document.querySelectorAll('#profileForm input, #profileForm textarea');
        all.forEach(i => {
            if (i.id === 'email') {
                // keep email editable if desired; here allow edit
            }
            i.disabled = !on;
        });
        if (DOM.actionsContainer) DOM.actionsContainer.classList.toggle('hidden', !on);
        if (DOM.btnEdit) DOM.btnEdit.classList.toggle('hidden', on);
    }

    async function saveProfile(form) {
        const full_name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        const bio = document.getElementById('bio').value.trim();

        try {
            const res = await fetch(API_BASE + '/api/profile', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, email, phone, address, bio })
            });
            const data = await res.json();
            if (data.success && data.profile) {
                State.profileData = data.profile;
                // update UI
                if (DOM.displayName) DOM.displayName.textContent = data.profile.full_name || data.profile.username;
                if (DOM.displayBio) DOM.displayBio.textContent = data.profile.bio || '';
                updateAvatarDisplay(data.profile.avatar_url || data.profile.avatar || '');
                // update localStorage user
                try { localStorage.setItem('user', JSON.stringify({ full_name: data.profile.full_name, email: data.profile.email, avatar_url: data.profile.avatar_url })); } catch (e) {}
                showToast('Success', 'Profile updated', 'success');
                setEditMode(false);
                return true;
            }
            showToast('Error', data.message || 'Update failed', 'error');
            return false;
        } catch (err) {
            console.error(err);
            showToast('Error', 'Update failed', 'error');
            return false;
        }
    }

    // Load profile data from backend (or fallback to localStorage)
    async function loadProfileData() {
        try {
            const resp = await fetch(API_BASE + '/api/profile', {
                credentials: 'include'
            });
            const data = await resp.json();
            if (data.success && data.profile) {
                State.profileData = data.profile;
                // mark that this data came from server so we don't overwrite localStorage on failures
                try { State.profileData._fromServer = true; } catch (e) {}
            } else {
                // Nếu không fetch được profile, kiểm tra session với /auth/me
                try {
                    const meResp = await fetch('/auth/me', { credentials: 'include' });
                    const meData = await meResp.json();
                    if (meData.success && meData.user) {
                        State.profileData = meData.user;
                    } else {
                        // Chưa đăng nhập, redirect tới login
                        window.location.href = '/login.html';
                        return;
                    }
                } catch (e) {
                    // Redirect tới login nếu lỗi
                    window.location.href = '/login.html';
                    return;
                }
            }
        } catch (err) {
            // Fetch fail, kiểm tra session
            try {
                const meResp = await fetch('/auth/me', { credentials: 'include' });
                const meData = await meResp.json();
                if (meData.success && meData.user) {
                    State.profileData = meData.user;
                } else {
                    window.location.href = '/login.html';
                    return;
                }
            } catch (e) {
                window.location.href = '/login.html';
                return;
            }
        }

        // Render fields
        updateAvatarDisplay(State.profileData.avatar_url || State.profileData.avatar || State.defaults.guest.avatar);
        if (DOM.displayName) DOM.displayName.textContent = State.profileData.full_name || State.profileData.fullName || 'Personal Account';
        if (DOM.displayBio) DOM.displayBio.textContent = State.profileData.bio || State.profileData.description || '';

        // Fill form inputs
        const fullNameEl = document.getElementById('fullName');
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phone');
        const addressEl = document.getElementById('address');
        const bioEl = document.getElementById('bio');

        if (fullNameEl) fullNameEl.value = State.profileData.full_name || State.profileData.fullName || '';
        if (emailEl) emailEl.value = State.profileData.email || '';
        if (phoneEl) phoneEl.value = State.profileData.phone || '';
        if (addressEl) addressEl.value = State.profileData.address || '';
        if (bioEl) bioEl.value = State.profileData.bio || '';

        // Update sidebar user info in DOM only if we have a real profile from server
        try {
            const nameEl = document.querySelector('.user-name');
            const sidebarImg = document.querySelector('.sidebar-avatar-img');
            // If we obtained profile from server, persist a small copy to localStorage and update DOM
            if (State.profileData && State.profileData.full_name && State.profileData.email && State.profileData._fromServer) {
                const small = { full_name: State.profileData.full_name, email: State.profileData.email, avatar_url: State.profileData.avatar_url };
                localStorage.setItem('user', JSON.stringify(small));
                if (nameEl) nameEl.textContent = small.full_name || State.profileData.username || 'User';
                if (sidebarImg && small.avatar_url) sidebarImg.src = small.avatar_url;
            } else {
                // Otherwise, try to preserve any existing localStorage `user` and apply to DOM
                const rawUser = localStorage.getItem('user');
                if (rawUser) {
                    const existing = JSON.parse(rawUser);
                    if (nameEl && existing.full_name) nameEl.textContent = existing.full_name;
                    if (sidebarImg && existing.avatar_url) sidebarImg.src = existing.avatar_url;
                }
            }
        } catch (e) {}
    }

    // Update avatar images in profile and sidebar
    function updateAvatarDisplay(src) {
        if (!src) return;
        const profileImg = document.getElementById('profileAvatar');
        if (profileImg) profileImg.src = src;
        const sidebarImg = document.querySelector('.sidebar-avatar-img');
        if (sidebarImg) sidebarImg.src = src;

        // Persist to localStorage `user` for sidebar sync
        try {
            const raw = localStorage.getItem('user');
            const user = raw ? JSON.parse(raw) : {};
            user.avatar_url = src;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {}
    }

    // Render recent activities from backend
    async function renderActivityTimeline() {
        const container = document.getElementById('activityTimeline');
        if (!container) return;
        container.innerHTML = `<p class="muted">${(window.t && window.t('loading')) || 'Loading...'}</p>`;
        try {
            const r = await fetch(API_BASE + '/api/activities', { credentials: 'include' });
            const data = await r.json();
            if (!data.success) {
                container.innerHTML = `<p class="muted">${(window.t && window.t('noRecentActivity')) || 'No recent activity'}</p>`;
                return;
            }
            
            if (!data.activities || data.activities.length === 0) {
                container.innerHTML = `<p class="muted">${(window.t && window.t('noRecentActivity')) || 'No recent activity'}</p>`;
                return;
            }

            const allActivities = data.activities;
            const visibleActivities = allActivities.slice(0, 4);
            const hasMore = allActivities.length > 4;
            
            let html = '';
            
            // Render visible activities
            html += visibleActivities.map(act => {
                return `<div class="activity-item"><div class="activity-meta"><strong>${act.action}</strong><span class="time">${new Date(act.created_at).toLocaleString()}</span></div></div>`;
            }).join('');
            
            // Add Show All / Show Less buttons if there are more activities
            if (hasMore) {
                html += `
                    <div class="activity-controls">
                        <button class="btn-show-all" id="btnShowAllActivities">${(window.t && window.t('showAll')) || 'Show All'}</button>
                    </div>
                    <div id="hiddenActivities" class="hidden">
                        ${allActivities.slice(4).map(act => {
                            return `<div class="activity-item"><div class="activity-meta"><strong>${act.action}</strong><span class="time">${new Date(act.created_at).toLocaleString()}</span></div></div>`;
                        }).join('')}
                    </div>
                `;
            }
            
            container.innerHTML = html;
            
            // Attach event listeners for Show All button
            if (hasMore) {
                const btnShowAll = document.getElementById('btnShowAllActivities');
                const hiddenActivities = document.getElementById('hiddenActivities');
                
                btnShowAll.addEventListener('click', () => {
                    const isHidden = hiddenActivities.classList.contains('hidden');
                    if (isHidden) {
                        // Show all
                        hiddenActivities.classList.remove('hidden');
                        btnShowAll.textContent = (window.t && window.t('showLess')) || 'Show Less';
                    } else {
                        // Show less
                        hiddenActivities.classList.add('hidden');
                        btnShowAll.textContent = (window.t && window.t('showAll')) || 'Show All';
                    }
                });
            }
        } catch (err) {
            container.innerHTML = `<p class="muted">${(window.t && window.t('couldNotLoadActivities')) || 'Could not load activities'}</p>`;
        }
    }

    // Simple stat animation placeholder
    function animateStats() {
        // could animate numbers — keep placeholder for now
    }

    // ==========================================
    // 4. LOGIC & HANDLERS
    // ==========================================
    
    // ... Profile Editing (toggleEditMode, saveProfile, cancelEdit) ...

    // --- Avatar Management (Enhanced) ---
    
    // [NEW] Modal State
    let pendingAvatar = null; // Store avatar choice before saving

    function openAvatarModal() {
        DOM.modal.classList.remove('hidden');
        resetModal();
    }

    function closeAvatarModal() {
        DOM.modal.classList.add('hidden');
        pendingAvatar = null;
    }

    function resetModal() {
        pendingAvatar = null;
        DOM.previewContainer.classList.add('hidden');
        DOM.btnModalSave.disabled = true;
        // Reset Tabs
        switchTab('upload');
        // Reset Gallery Selection
        document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
    }

    function switchTab(tabName) {
        DOM.tabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        DOM.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
            if (content.id === `tab-${tabName}`) {
                 // Animation reset
                 content.style.animation = 'none';
                 content.offsetHeight; /* trigger reflow */
                 content.style.animation = 'fadeIn 0.3s ease';
            }
        });
    }

    function handleFileSelection(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Error', 'Only image files are allowed', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Error', 'Image size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            updatePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    function updatePreview(src) {
        pendingAvatar = src;
        DOM.previewImg.src = src;
        DOM.previewContainer.classList.remove('hidden');
        DOM.btnModalSave.disabled = false;
        
        // Clear gallery selection if active
        document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
    }

    function saveAvatarChange() {
        if (!pendingAvatar) return;

        // Persist
        State.profileData.avatar = pendingAvatar;
        localStorage.setItem(`userProfile_${State.userRole}`, JSON.stringify(State.profileData));

        // Update UI
        updateAvatarDisplay(pendingAvatar);
        
        closeAvatarModal();
        showToast('Success', 'Profile picture updated', 'success');
    }

    // [NEW] Gallery Generation
    function generateGallery() {
        if (!DOM.galleryGrid) return;
        
        // Collection of playful avatars (using DiceBear or similar placeholder services or SVGs)
        // Using seeded SVGs for internal consistency
        const seeds = ['Felix', 'Aneka', 'Zack', 'Midnight', 'Luna', 'Shadow', 'Buddy', 'Molly'];
        const galleryHtml = seeds.map(seed => {
            // Using multiavatar or similar logic - here simply creating colored circles with initials for demo
            // In a real app, use real image URLs or a library.
            // Using a reliable placeholder service for demo:
            const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            return `
                <div class="gallery-item" data-src="${url}">
                    <img src="${url}" alt="Avatar ${seed}" loading="lazy">
                </div>
            `;
        }).join('');

        DOM.galleryGrid.innerHTML = galleryHtml;

        // Add click listeners to items
        DOM.galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                // UI Toggle
                document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                
                // Update Preview
                updatePreview(item.dataset.src);
            });
        });
    }

    // ... removeAvatar (refactored to just reset logic) ...
    function removeAvatar() {
        if (!confirm('Revert to default avatar?')) return;
        const defaultAv = State.defaults[State.userRole]?.avatar || State.defaults.guest.avatar;
        State.profileData.avatar = defaultAv;
        localStorage.setItem(`userProfile_${State.userRole}`, JSON.stringify(State.profileData));
        updateAvatarDisplay(defaultAv);
        showToast('Success', 'Avatar reset', 'success');
    }

    // Lightbox functions for avatar zoom
    function openLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightboxImage');
        const profileImg = document.getElementById('profileAvatar');
        
        if (lightbox && lightboxImg && profileImg) {
            lightboxImg.src = profileImg.src;
            lightbox.classList.remove('hidden');
        }
    }

    function closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (lightbox) {
            lightbox.classList.add('hidden');
        }
    }

    // ==========================================
    // 5. EVENT LISTENERS
    // ==========================================
    function setupEventListeners() {
        // ... existing form/edit listeners ...

        // --- Avatar Selection Modal Triggers ---
        // Instead of triggering input immediately, open Modal
        const avatarContainer = document.querySelector('.profile-avatar-large');
        if (avatarContainer) {
            avatarContainer.addEventListener('click', (e) => {
                 // Prevent if clicking View/Remove buttons
                 if (e.target.closest('.avatar-control')) return; 
                 // If clicking the main area or the edit button
                 openAvatarModal();
            });
        }
        
        // Modal Controls (guarded in case modal elements are not present)
        if (DOM.btnCloseModal) DOM.btnCloseModal.addEventListener('click', closeAvatarModal);
        if (DOM.btnModalCancel) DOM.btnModalCancel.addEventListener('click', closeAvatarModal);
        if (DOM.btnModalSave) DOM.btnModalSave.addEventListener('click', saveAvatarChange);
        
        // Tabs
        if (DOM.tabs && DOM.tabs.length) {
            DOM.tabs.forEach(tab => {
                tab.addEventListener('click', () => switchTab(tab.dataset.tab));
            });
        }

        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            if (DOM.dropZone) DOM.dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            if (DOM.dropZone) DOM.dropZone.addEventListener(eventName, () => DOM.dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            if (DOM.dropZone) DOM.dropZone.addEventListener(eventName, () => DOM.dropZone.classList.remove('dragover'), false);
        });

        if (DOM.dropZone) {
            DOM.dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                handleFileSelection(files[0]);
            });
        }
        
        // Browse Button
        if (DOM.btnBrowse && DOM.modalNativeInput) {
            DOM.btnBrowse.addEventListener('click', () => {
                DOM.modalNativeInput.click();
            });

            DOM.modalNativeInput.addEventListener('change', (e) => {
                handleFileSelection(e.target.files[0]);
                e.target.value = ''; // Reset
            });
        }

        // Direct avatar upload (hidden input)
        if (DOM.avatarInput) {
            DOM.avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const form = new FormData();
                form.append('avatar', file);
                try {
                    const res = await fetch(API_BASE + '/api/profile/avatar', {
                            method: 'POST',
                            body: form,
                            credentials: 'include'
                        });
                    const data = await res.json();
                    if (data.success) {
                        State.profileData = data.profile || State.profileData;
                        const newUrl = data.avatar_url || (data.profile && data.profile.avatar_url);
                        updateAvatarDisplay(newUrl);
                        try { localStorage.setItem('user', JSON.stringify({ full_name: State.profileData.full_name, email: State.profileData.email, avatar_url: newUrl })); } catch (e) {}
                        showToast('Success', 'Avatar updated', 'success');
                    } else {
                        showToast('Error', data.message || 'Upload failed', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error', 'Upload failed', 'error');
                }
                e.target.value = '';
            });
        }

        // Existing Direct View/Remove buttons
        if (DOM.btnRemoveAvatar) DOM.btnRemoveAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            removeAvatar();
        });
        if (DOM.btnViewAvatar) DOM.btnViewAvatar.addEventListener('click', (e) => {
             e.stopPropagation();
             openLightbox();
        });
        
        // Lightbox close button and click outside
        if (DOM.lightboxClose) {
            DOM.lightboxClose.addEventListener('click', closeLightbox);
        }
        if (DOM.lightbox) {
            DOM.lightbox.addEventListener('click', (e) => {
                if (e.target === DOM.lightbox) closeLightbox();
            });
        }
        
        // Close modal on outside click
        if (DOM.modal) {
            DOM.modal.addEventListener('click', (e) => {
                if (e.target === DOM.modal) closeAvatarModal();
            });
        }

        // Edit profile button
        if (DOM.btnEdit) {
            DOM.btnEdit.addEventListener('click', () => setEditMode(true));
        }
        if (DOM.btnCancel) {
            DOM.btnCancel.addEventListener('click', () => {
                // reload data
                loadProfileData();
                setEditMode(false);
            });
        }

        // Profile form submit
        if (DOM.profileForm) {
            DOM.profileForm.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                await saveProfile();
            });
        }

        // Security form submit -> call backend
        if (DOM.securityForm) {
            DOM.securityForm.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                if (newPassword !== confirmPassword) return showToast('Error', 'Passwords do not match', 'error');
                try {
                    const res = await fetch(API_BASE + '/api/profile/password', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword, newPassword })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Success', data.message || 'Password changed', 'success');
                        DOM.securityForm.reset();
                    } else {
                        showToast('Error', data.message || 'Could not change password', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error', 'Request failed', 'error');
                }
            });
        }

        // ... rest of listeners (Security, Logout, Utils) ...

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', formatPhone);
        }
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', validateEmailInput);
        }
        // Security logout button
        const secLogout = document.getElementById('securityLogoutBtn');
        if (secLogout) {
            secLogout.addEventListener('click', async () => {
                try { localStorage.removeItem('user'); localStorage.removeItem('userRole'); } catch (e) {}
                try { await fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
                window.location.href = 'login.html';
            });
        }
    }

    // ==========================================
    // 6. UTILITIES & HELPERS
    // ==========================================
    
    function showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconPath = '';
        if (type === 'success') iconPath = '<polyline points="20 6 9 17 4 12"></polyline>';
        else if (type === 'error') iconPath = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
        else iconPath = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';

        toast.innerHTML = `
            <div class="toast-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">${iconPath}</svg>
            </div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        DOM.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function checkPasswordStrength(val) {
        let strength = 0;
        if (val.length >= 6) strength++;
        if (val.match(/[A-Z]/)) strength++;
        if (val.match(/[0-9]/)) strength++;
        
        const bar = DOM.passStrength;
        bar.className = 'password-strength';
        if (val.length > 0) {
            if (strength === 1) bar.classList.add('strength-weak');
            else if (strength === 2) bar.classList.add('strength-medium');
            else if (strength >= 3) bar.classList.add('strength-strong');
        }
    }

    function handleSecurityUpdate() {
        const current = DOM.currentPass.value;
        const newP = DOM.newPass.value;
        const confirmP = DOM.confirmPass.value;

        if (!current) return showToast('Error', 'Enter current password', 'error');
        if (newP.length < 6) return showToast('Error', 'New password must be > 6 chars', 'error');
        if (newP !== confirmP) return showToast('Error', 'Passwords do not match', 'error');

        setTimeout(() => {
            showToast('Success', 'Password updated successfully', 'success');
            DOM.securityForm.reset();
            DOM.passStrength.className = 'password-strength';
        }, 500);
    }

    function formatPhone(e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,3})/);
        if (x[1]) {
            e.target.value = !x[2] ? x[1] : `(+${x[1]}) ${x[2]}${x[3] ? ` ${x[3]}` : ''}${x[4] ? ` ${x[4]}` : ''}`;
        }
    }

    function validateEmailInput(e) {
        const valid = String(e.target.value).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
        if (!valid && e.target.value) {
            showToast('Warning', 'Invalid email format', 'error');
            e.target.style.borderColor = 'var(--danger-red)';
        } else {
            e.target.style.borderColor = '';
        }
    }

    function animateStats() {
        document.querySelectorAll('.stat-details h3').forEach(stat => {
            const original = stat.innerText;
            const match = original.match(/([\d\.]+)(.*)/);
            if (!match) return;
            
            const value = parseFloat(match[1]);
            const suffix = match[2];
            let current = 0;
            const step = value / 40;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= value) {
                    clearInterval(timer);
                    stat.innerText = original;
                } else {
                    stat.innerText = (Number.isInteger(value) ? Math.floor(current) : current.toFixed(1)) + suffix;
                }
            }, 30);
        });
    }

    // Note: activity timeline is rendered from server in the async `renderActivityTimeline` above.

    // Run Init
    // Ensure dynamic texts update when language changes
    window.onLanguageChanged = function(lang){
        try { renderActivityTimeline(); } catch(e){}
    };

    init();
});

