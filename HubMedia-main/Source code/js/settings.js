// Settings Page Functionality
const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    try {
        const authRes = await fetch(API_BASE + '/auth/me', { credentials: 'include' });
        if (!authRes.ok) {
            window.location.href = 'login.html';
            return;
        }
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    // Tab Switching Logic
    const navItems = document.querySelectorAll('.settings-nav-item');
    const tabs = document.querySelectorAll('.settings-tab');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items and tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));

            // Add active class to clicked item
            item.classList.add('active');

            // Show corresponding tab
            const tabId = item.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            // when viewing billing tab, ensure payment methods are loaded
            if (tabId === 'billing' && typeof loadPaymentMethods === 'function') loadPaymentMethods();
        });
    });

    // General Settings - Save
    const saveGeneralBtn = document.getElementById('saveGeneralBtn');
    if (saveGeneralBtn) {
        saveGeneralBtn.addEventListener('click', async () => {
            simulateLoading(saveGeneralBtn, 'Saving...', 'Save Changes', async () => {
                // Collect data from inputs
                const payload = {
                    full_name: document.getElementById('full_name')?.value || null,
                    email: document.getElementById('email')?.value || null,
                    mini_supermarket: document.getElementById('mini_supermarket')?.value || null,
                    bio: document.getElementById('bio')?.value || null
                };

                try {
                    const res = await fetch(API_BASE + '/api/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data && data.success) {
                        showNotification('Profile updated successfully!', 'success');
                        // update fields from server response if provided
                        if (data.profile) populateProfile(data.profile);
                    } else {
                        showNotification((data && data.message) || 'Failed to update profile', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showNotification('Server error while saving profile', 'error');
                }
            });
        });
    }

    // Notification Toggles
    const toggles = document.querySelectorAll('.switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            if (!this.disabled) {
                const key = this.getAttribute('data-setting');
                const value = !!this.checked;
                const label = this.closest('.toggle-item').querySelector('h4').textContent;
                // persist change (try backend, fallback to localStorage)
                saveUserSettings({ [key]: value })
                    .then(() => showNotification(`${label} ${value ? 'enabled' : 'disabled'}`, 'info'))
                    .catch(() => showNotification('Could not save setting', 'error'));
            }
        });
    });

    // Load persisted user settings (backend or localStorage)
    async function loadUserSettings() {
        // collect toggles keys
        const keys = [...document.querySelectorAll('.switch input')].map(i => i.getAttribute('data-setting')).filter(Boolean);
        // try backend first
        try {
            const res = await fetch(API_BASE + '/api/user/settings', { credentials: 'include' });
            if (res.ok) {
                const j = await res.json();
                if (j && j.success && j.settings) {
                    keys.forEach(k => {
                        const el = document.querySelector(`.switch input[data-setting="${k}"]`);
                        if (el && (k in j.settings)) el.checked = !!j.settings[k];
                    });
                    return;
                }
            }
        } catch (e) {}

        // fallback to localStorage
        try {
            const raw = localStorage.getItem('user_settings');
            if (raw) {
                const obj = JSON.parse(raw);
                keys.forEach(k => {
                    const el = document.querySelector(`.switch input[data-setting="${k}"]`);
                    if (el && (k in obj)) el.checked = !!obj[k];
                });
            }
        } catch (e) {}
    }

    async function saveUserSettings(partial) {
        // merge with existing local and attempt POST
        try {
            // update local copy first
            const existingRaw = localStorage.getItem('user_settings');
            let existing = existingRaw ? JSON.parse(existingRaw) : {};
            existing = Object.assign(existing, partial);
            localStorage.setItem('user_settings', JSON.stringify(existing));

            // attempt to persist to backend
            const res = await fetch(API_BASE + '/api/user/settings', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: partial })
            });
            if (!res.ok) throw new Error('Server error');
            const j = await res.json();
            if (!j || !j.success) throw new Error('Save failed');
            return j;
        } catch (err) {
            // rethrow so callers can show notification
            throw err;
        }
    }

    // --- Billing helpers ---
    async function loadSubscription() {
        try {
            const res = await fetch(API_BASE + '/api/subscriptions', { credentials: 'include' });
            if (!res.ok) return;
            const j = await res.json();
            if (j && j.success) {
                const sub = j.subscription;
                if (!sub) return;
                const badge = document.querySelector('.plan-badge');
                if (badge) badge.textContent = sub.plan || badge.textContent;
                const planTitleEl = document.querySelector('[data-i18n="professionalPlan"]');
                if (planTitleEl) planTitleEl.textContent = sub.planTitle || sub.plan || planTitleEl.textContent;
                const desc = document.querySelector('[data-i18n="professionalPlanDesc"]');
                if (desc) desc.textContent = `$${sub.amount} • Billed monthly`;
                const sp = document.getElementById('subPlan');
                const se = document.getElementById('subExpiry');
                const sa = document.getElementById('subAmount');
                if (sp) sp.textContent = sub.planTitle || sub.plan;
                if (se) se.textContent = sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : '—';
                if (sa) sa.textContent = `$${sub.amount}`;

                // storage usage UI
                const usageGB = (j.storageUsageGB || 0);
                const quotaGB = sub.quotaGB || 100;
                const used = Math.round(usageGB * 10) / 10; // 1 decimal
                const total = quotaGB;
                const percent = Math.min(100, Math.round((used / total) * 100));
                const usageLabel = document.querySelector('.usage-label span:last-child');
                if (usageLabel) usageLabel.textContent = `${used}GB / ${total}GB`;
                const fill = document.querySelector('.progress-fill');
                if (fill) {
                    fill.style.width = percent + '%';
                    if (percent >= 75) fill.style.background = '#e74c3c'; else fill.style.background = '';
                }
            }
        } catch (e) { console.warn('loadSubscription error', e); }
    }

    function openPurchaseModal() { const m = document.getElementById('purchaseModal'); if (m) { m.classList.remove('hidden'); m.classList.add('active'); loadPaymentMethods(); renderPlansInModal(); updatePurchaseSidebar(); } }
    function closePurchaseModal() { const m = document.getElementById('purchaseModal'); if (m) { m.classList.remove('active'); m.classList.add('hidden'); } }
    // old manage subscription modal removed — use purchase modal
    function openPaymentModal() { 
        const m = document.getElementById('paymentModal'); 
        if (m) { 
            m.classList.remove('hidden'); 
            m.classList.add('active'); 
            loadPaymentMethods();
            // Ensure translate is called so modal content is translated to current language
            if (typeof window.translate === 'function') {
                const lang = localStorage.getItem('preferred_lang') || 'en';
                window.translate(lang);
            }
        } 
    }
    function closePaymentModal() { const m = document.getElementById('paymentModal'); if (m) { m.classList.remove('active'); m.classList.add('hidden'); } }

    // Opens the delete confirmation modal for a given payment method id
    function openDeleteModal(id) {
        const deleteModal = document.getElementById('deleteConfirmModal');
        const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
        if (!deleteModal || !deleteConfirmBtn) return;
        deleteConfirmBtn.dataset.id = id;
        // Don't override text - let i18n handle it through data-i18n attribute
        deleteModal.classList.remove('hidden'); deleteModal.classList.add('active');
        // Ensure translate is called so modal content is translated to current language
        if (typeof window.translate === 'function') {
            const lang = localStorage.getItem('preferred_lang') || 'en';
            window.translate(lang);
        }
    }

    // Wire billing buttons
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', () => openPaymentModal());
    }
    const manageSubscriptionBtn = document.getElementById('manageSubscriptionBtn');
    if (manageSubscriptionBtn) {
        manageSubscriptionBtn.addEventListener('click', () => { openPurchaseModal(); });
    }

    // Delegated handlers as a fallback if elements are dynamically replaced
    document.addEventListener('click', (e) => {
        try {
            // Only handle delegated add payment clicks here. The manage button
            // has its own direct listener to avoid double-invocation.
            const a = e.target.closest && e.target.closest('#addPaymentBtn');
            if (a) { openPaymentModal(); e.preventDefault(); return; }
        } catch (err) { console.warn('delegated click handler error', err); }
    });

    // Purchase flow
    const purchaseBtn = document.getElementById('purchaseBtn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async () => {
            const plan = document.querySelector('input[name="planSelect"]:checked')?.value;
            const months = parseInt(document.getElementById('purchaseMonths')?.value || '1', 10) || 1;
            purchaseBtn.disabled = true;
            try {
                const res = await fetch(API_BASE + '/api/subscriptions', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan, months })
                });
                const j = await res.json();
                if (j && j.success) {
                    showNotification(window.t ? window.t('subscriptionCreated') : 'Subscription created', 'success');
                    closePurchaseModal();
                    await loadSubscription();
                } else {
                    showNotification((j && j.message) || (window.t ? window.t('subscriptionFailed') : 'Failed'), 'error');
                }
            } catch (e) {
                console.error(e);
                showNotification('Server error', 'error');
            }
            purchaseBtn.disabled = false;
        });
    }
    const purchaseCancel = document.getElementById('purchaseCancel');
    if (purchaseCancel) purchaseCancel.addEventListener('click', (e)=>{ e.preventDefault(); closePurchaseModal(); });

    // Payment methods modal logic
    async function loadPaymentMethods() {
        try {
            const res = await fetch(API_BASE + '/api/payment-methods', { credentials: 'include' });
            if (!res.ok) return;
            const j = await res.json();
            if (j && j.success) {
                const methods = (j.methods || []);
                // if modal list exists, populate it; otherwise skip modal list
                const list = document.getElementById('paymentMethodsList');
                if (list) {
                    list.innerHTML = '';
                    methods.forEach(m => {
                        const div = document.createElement('div');
                        div.className = 'payment-method-row';
                        div.dataset.id = m.id;
                        div.innerHTML = `<div class="card-details"><h4>${m.type} ending in ${m.last4}</h4><p>${m.exp ? 'Expires ' + m.exp : ''}</p></div><div style="margin-left:auto"><button class="btn-secondary btn-activate" data-id="${m.id}">${m.active? (window.t? window.t('active') : 'Active') : (window.t? window.t('setActive') : 'Set Active')}</button></div>`;
                        if (m.active) div.classList.add('default-method');
                        list.appendChild(div);
                    });
                }

                // update purchase sidebar with default payment method
                const purchaseContainer = document.getElementById('purchasePaymentSelect');
                if (purchaseContainer) {
                    const active = methods.find(x => x.active) || methods[0];
                    if (active) {
                        const defaultBadge = window.t ? `<span class="active-badge">${window.t('active') || 'Default'}</span>` : '<span class="active-badge">Default</span>';
                        purchaseContainer.innerHTML = `<div class="pm-summary">${active.type} ending in ${active.last4} ${defaultBadge}</div>`;
                        purchaseContainer.dataset.methodId = active.id;
                    } else {
                        purchaseContainer.innerHTML = window.t ? window.t('noPaymentMethodsSaved') : 'No payment method saved';
                        delete purchaseContainer.dataset.methodId;
                    }
                }

                // populate billing card area with full list of saved methods
                const billingList = document.getElementById('billingPaymentList');
                if (billingList) {
                    billingList.innerHTML = '';
                    if (methods.length === 0) {
                        billingList.innerHTML = `<div class="payment-method">${window.t ? window.t('noPaymentMethodsSaved') : 'No payment methods saved'}</div>`;
                    } else {
                        methods.forEach(m => {
                            const row = document.createElement('div');
                            row.className = 'payment-method-row';
                            if (m.active) row.classList.add('default-method');
                                const checked = m.active ? 'checked' : '';
                                const statusText = m.active ? (window.t ? window.t('active') : 'Active') : (window.t ? window.t('nonActive') : 'Non active');
                                // place status badge next to title; selector + delete on the right
                                row.innerHTML = `<div class="card-details"><h4>${m.type} ending in ${m.last4} <span class="pm-status ${m.active? 'active':'inactive'}">${statusText}</span></h4><p>${m.exp ? 'Expires ' + m.exp : ''}</p></div><div style="margin-left:auto;display:flex;gap:12px;align-items:center"><button class="btn-icon btn-delete-method" data-id="${m.id}" title="Delete">🗑</button><input type="checkbox" role="radio" class="pm-select" data-id="${m.id}" ${checked} aria-label="Select default payment method"></div>`;
                            billingList.appendChild(row);
                        });
                    }
                }
                // wire circular selector activation handlers (behave like radio)
                document.querySelectorAll('.pm-select').forEach(cb => cb.addEventListener('change', async function(ev){
                    ev.stopPropagation();
                    const id = Number(this.getAttribute('data-id'));
                    if (!this.checked) {
                        // don't allow unchecking; maintain radio-like behavior
                        this.checked = true;
                        return;
                    }
                    try {
                        const r = await fetch(API_BASE + '/api/payment-methods/activate', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
                        const jj = await r.json();
                        if (jj && jj.success) { showNotification(window.t? window.t('active') : 'Payment method activated','success'); loadPaymentMethods(); }
                    } catch (e) { console.error(e); showNotification('Server error','error'); }
                }));

                // clicking on a method row will set it as selected for purchase (but not activate)
                document.querySelectorAll('.payment-method-row').forEach(row => row.addEventListener('click', function(e){
                    // ignore clicks originating from checkbox or delete button
                    if (e.target.closest('.pm-select') || e.target.closest('.btn-delete-method') || e.target.closest('button')) return;
                    const pid = this.dataset.id;
                    const purchaseContainer = document.getElementById('purchasePaymentSelect');
                    if (purchaseContainer) {
                        const h = this.querySelector('.card-details h4')?.textContent || '';
                        purchaseContainer.innerHTML = `${h} <button class="btn-secondary" id="purchaseUseThis" data-id="${pid}">Use</button>`;
                        purchaseContainer.dataset.methodId = pid;
                    }
                }));

                // If user clicks Use button in sidebar, mark that method as active via API
                document.addEventListener('click', async (e) => {
                    const useBtn = e.target.closest && e.target.closest('#purchaseUseThis');
                    if (!useBtn) return;
                    const id = Number(useBtn.getAttribute('data-id'));
                    try {
                        const r = await fetch(API_BASE + '/api/payment-methods/activate', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
                        const jj = await r.json();
                        if (jj && jj.success) { showNotification('Payment method set as default','success'); loadPaymentMethods(); }
                    } catch (err) { console.error(err); showNotification('Unable to set default','error'); }
                });

                // wire delete buttons for payment methods (billing area)
                // delete flow uses a modal confirm instead of browser confirm
                document.querySelectorAll('.btn-delete-method').forEach(btn => btn.addEventListener('click', function(ev){
                    ev.preventDefault();
                    ev.stopPropagation();
                    const id = Number(this.getAttribute('data-id'));
                    console.log('[settings] delete button clicked, id=', id);
                    openDeleteModal(id);
                }));

                // modal handlers (may be attached multiple times but safe)
                const deleteModal = document.getElementById('deleteConfirmModal');
                const deleteCancel = document.getElementById('deleteCancel');
                const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
                if (deleteCancel) {
                    deleteCancel.removeEventListener?.('click', null);
                    deleteCancel.addEventListener('click', () => { if (deleteModal) { deleteModal.classList.remove('active'); deleteModal.classList.add('hidden'); } });
                }
                // attach confirm handler once (remove previous if any)
                // The delete confirm handler is attached globally (outside this function)
            }
        } catch (e) { console.warn('loadPaymentMethods error', e); }
    }

    // Attach delete confirm handler once to avoid duplicate requests
    (function attachGlobalDeleteHandler(){
        const deleteConfirmBtnGlobal = document.getElementById('deleteConfirmBtn');
        if (!deleteConfirmBtnGlobal) return;
        deleteConfirmBtnGlobal.addEventListener('click', async function(){
            const id = Number(deleteConfirmBtnGlobal.dataset.id);
            console.log('[settings] deleteConfirm clicked, id=', id);
            if (!id) return;
            deleteConfirmBtnGlobal.disabled = true;
            const deleteModal = document.getElementById('deleteConfirmModal');
            try {
                const r = await fetch(API_BASE + '/api/payment-methods/' + id, { method: 'DELETE', credentials: 'include' });
                if (!r.ok) {
                    const txt = await r.text();
                    console.error('Delete failed', r.status, txt);
                    showNotification((window.t? window.t('subscriptionFailed') : 'Failed to delete payment method') + ': ' + (txt || r.status), 'error');
                } else {
                    const jj = await r.json();
                    if (jj && jj.success) { showNotification(window.t? window.t('paymentMethodDeleted') : 'Payment method deleted','success'); loadPaymentMethods(); }
                }
            } catch (err) { console.error(err); showNotification('Server error', 'error'); }
            deleteConfirmBtnGlobal.disabled = false;
            if (deleteModal) { deleteModal.classList.remove('active'); deleteModal.classList.add('hidden'); }
        });
    })();

    const addPaymentSubmit = document.getElementById('addPaymentSubmit');
    if (addPaymentSubmit) {
        addPaymentSubmit.addEventListener('click', async (e) => {
            e.preventDefault();
            const cardholder = document.getElementById('pmCardholder')?.value?.trim() || '';
            const cardNumberRaw = document.getElementById('pmCardNumber')?.value?.trim() || '';
            const exp = document.getElementById('pmExp')?.value?.trim() || '';
            const cvc = document.getElementById('pmCvc')?.value?.trim() || '';

            // basic validation
            const digits = cardNumberRaw.replace(/\s+/g, '').replace(/[^0-9]/g, '');
            if (!digits || digits.length < 4) return showNotification('Please enter a valid card number', 'error');
            const last4 = digits.slice(-4);

            addPaymentSubmit.disabled = true;
            try {
                const payload = { type: 'Card', last4, exp, cardholder };
                // send only non-sensitive parts; backend will accept last4 and store safely
                const r = await fetch(API_BASE + '/api/payment-methods', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                if (!r.ok) {
                    const txt = await r.text();
                    console.error('payment-methods POST failed', r.status, txt);
                    showNotification('Failed to add payment method', 'error');
                } else {
                    const jj = await r.json();
                    if (jj && jj.success) {
                        showNotification('Payment method added','success');
                        document.getElementById('pmCardNumber').value = '';
                        document.getElementById('pmCardholder').value = '';
                        document.getElementById('pmExp').value = '';
                        document.getElementById('pmCvc').value = '';
                        loadPaymentMethods();
                    } else {
                        showNotification((jj && jj.message) || 'Failed', 'error');
                    }
                }

                
            } catch (err) { console.error(err); showNotification('Server error','error'); }
            addPaymentSubmit.disabled = false;
        });
    }

    // (manage subscription extend removed - handled via Purchase modal)

    // --- Purchase modal plan rendering & sidebar update ---
    let selectedPlan = null;

    async function renderPlansInModal() {
        const grid = document.getElementById('plansGrid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.display = 'flex';
        grid.style.gap = '12px';
        grid.style.alignItems = 'stretch';
        grid.style.overflowX = 'auto';
        try {
            const res = await fetch(API_BASE + '/api/plans', { credentials: 'include' });
            let plans = null;
            if (res.ok) {
                const j = await res.json(); if (j && j.success && j.plans) plans = j.plans;
            }
            // fallback to local defaults
            if (!plans) plans = {
                GO: { price: 9.99, title: 'GO', quotaGB: 256 },
                PLUS: { price: 39.99, title: 'PLUS', quotaGB: 512 },
                PRO: { price: 99.99, title: 'PRO', quotaGB: 1024 }
            };

            // Normalize plans into an array of unique entries
            const seen = new Set();
            const entries = [];
            if (Array.isArray(plans)) {
                plans.forEach(p => {
                    const key = p.key || p.id || p.title;
                    if (!key || seen.has(key)) return;
                    seen.add(key);
                    entries.push({ key, price: p.price, title: p.title || key, quotaGB: p.quotaGB || p.quota });
                });
            } else {
                Object.keys(plans).forEach(k => {
                    if (seen.has(k)) return;
                    seen.add(k);
                    const p = plans[k];
                    entries.push({ key: k, price: p.price, title: p.title || k, quotaGB: p.quotaGB || p.quota });
                });
            }

            // Render each unique plan
            entries.forEach((p, idx) => {
                const card = document.createElement('div');
                card.className = 'plan-card';
                card.style.cssText = 'min-width:160px; max-width:220px; padding:16px; border-radius:8px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:8px;';
                card.innerHTML = `
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;">
                        <div class="plan-title">${p.title}</div>
                        <div class="plan-meta">${p.quotaGB} GB storage</div>
                    </div>
                    <div style="margin-top:auto">
                        <div class="plan-price">$${(p.price||0).toFixed(2)}<span style="font-weight:400;font-size:13px">/month</span></div>
                    </div>
                    <input type="hidden" name="planKey" value="${p.key}">
                    <input type="radio" name="planSelect" value="${p.key}" style="display:none" ${idx===0? 'checked':''}>
                `;
                grid.appendChild(card);

                // card click selects it
                card.addEventListener('click', (ev) => {
                    // mark selected visual state
                    grid.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    // set hidden radio
                    const radio = card.querySelector('input[name="planSelect"]');
                    if (radio) radio.checked = true;
                    selectedPlan = p.key;
                    updatePurchaseSidebar();
                });
            });

            // default select first and wire change
            const first = grid.querySelector('input[name="planSelect"]');
            if (first) {
                first.checked = true;
                selectedPlan = first.value;
                const firstCard = first.closest('.plan-card');
                if (firstCard) firstCard.classList.add('selected');
            }
            grid.querySelectorAll('input[name="planSelect"]').forEach(inp => inp.addEventListener('change', () => { selectedPlan = inp.value; updatePurchaseSidebar(); }));
            // initial sidebar update
            updatePurchaseSidebar();
        } catch (e) { console.warn('renderPlansInModal error', e); }
    }

    function updatePurchaseSidebar() {
        const months = parseInt(document.getElementById('purchaseMonths')?.value || '1', 10) || 1;
        const grid = document.getElementById('plansGrid');
        if (!grid) return;

        // Read selected plan price from the visible card text
        let price = 0;
        const sel = document.querySelector('input[name="planSelect"]:checked');
        if (sel) {
            const card = sel.closest('.plan-card');
            if (card) {
                const priceEl = card.querySelector('.plan-price');
                if (priceEl) {
                    const m = priceEl.textContent.match(/\$([0-9]+(?:\.[0-9]+)?)/);
                    if (m) price = parseFloat(m[1]);
                }
            }
        }

        const total = (price * months) || 0;
        let summary = document.getElementById('purchaseSummary');
        if (!summary) {
            const container = document.getElementById('purchasePaymentSelect');
            if (container) {
                summary = document.createElement('div');
                summary.id = 'purchaseSummary';
                summary.style.marginTop = '8px';
                container.parentNode.insertBefore(summary, container);
            }
        }
        if (summary) {
            const priceLabel = window.t ? window.t('priceLabel') : 'Price';
            const totalTemplate = window.t ? window.t('totalForMonths') : 'Total for {months} month(s): {total}';
            const totalText = totalTemplate.replace('{months}', months).replace('{total}', `$${total.toFixed(2)}`);
            summary.innerHTML = `<div style="font-size:14px;color:#333;margin-bottom:6px">${priceLabel}: $${price.toFixed(2)} / month</div><div style="font-weight:700;font-size:16px">${totalText}</div>`;
        }
    }

    // update when months input changes
    const purchaseMonthsInput = document.getElementById('purchaseMonths');
    if (purchaseMonthsInput) purchaseMonthsInput.addEventListener('input', () => updatePurchaseSidebar());

    // Security - Update Password (reuse profile endpoint)
    const updatePassBtn = document.getElementById('updatePasswordBtn');
    if (updatePassBtn) {
        updatePassBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword')?.value || '';
            const newPassword = document.getElementById('newPassword')?.value || '';
            const confirmPassword = document.getElementById('confirmPassword')?.value || '';
            if (!currentPassword || !newPassword) return showNotification('Please fill out both password fields', 'error');
            if (newPassword !== confirmPassword) return showNotification('Passwords do not match', 'error');

            simulateLoading(updatePassBtn, 'Updating...', 'Update Password', async () => {
                try {
                    const res = await fetch(API_BASE + '/api/profile/password', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword, newPassword })
                    });
                    const data = await res.json();
                    if (data && data.success) {
                        showNotification(data.message || 'Password updated successfully!', 'success');
                        document.getElementById('currentPassword').value = '';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('confirmPassword').value = '';
                    } else {
                        showNotification((data && data.message) || 'Failed to update password', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showNotification('Server error while updating password', 'error');
                }
            });
        });
    }

    // Billing - Manage Subscription (handled by modal wiring further below)

    // Integrations Logic — persist via backend
    // Load user's connected integrations and wire buttons
    async function loadIntegrations() {
        try {
            const res = await fetch(API_BASE + '/api/integrations', { credentials: 'include' });
            if (!res.ok) return;
            const j = await res.json();
            const connected = (j && j.success && j.integrations) ? j.integrations : {};

            // Update settings page buttons
            document.querySelectorAll('.integration-item').forEach(item => {
                const platform = item.dataset.platform;
                const btn = item.querySelector('.btn-connect');
                if (!platform || !btn) return;
                if (connected[platform]) {
                    btn.classList.add('connected');
                    btn.textContent = window.t ? window.t('connected') : 'Connected';
                } else {
                    btn.classList.remove('connected');
                    btn.textContent = window.t ? window.t('connect') : 'Connect';
                }
            });

            // Hide platforms on content creation pages that are not connected
            document.querySelectorAll('input[name="platform"]').forEach(cb => {
                const val = (cb.value || '').toString().toLowerCase();
                const wrapper = cb.closest('.platform-checkbox') || cb.closest('.platform-option');
                if (!val) return;
                if (!connected[val]) {
                    if (wrapper) wrapper.style.display = 'none';
                } else {
                    if (wrapper) wrapper.style.display = '';
                }
            });

            return connected;
        } catch (e) { console.warn('loadIntegrations error', e); return {}; }
    }

    // Wire connect/disconnect click handlers (use data-platform)
    document.addEventListener('click', async function(e){
        const btn = e.target.closest && e.target.closest('.btn-connect');
        if (!btn) return;
        const platform = btn.getAttribute('data-platform');
        if (!platform) return;
        if (btn.classList.contains('connected')) {
            if (!confirm(window.t ? window.t('confirmDisconnect') || 'Are you sure you want to disconnect this account?' : 'Are you sure you want to disconnect this account?')) return;
            try {
                const res = await fetch(API_BASE + '/api/integrations/disconnect', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ platform }) });
                const j = await res.json();
                if (j && j.success) {
                    btn.classList.remove('connected');
                    btn.textContent = window.t ? window.t('connect') : 'Connect';
                    showNotification(window.t ? window.t('integrationDisconnected') : 'Account disconnected', 'info');
                    // update content platform visibility
                    await loadIntegrations();
                } else {
                    showNotification((j && j.message) || (window.t ? window.t('subscriptionFailed') : 'Failed'), 'error');
                }
            } catch (err) { console.error(err); showNotification('Server error', 'error'); }
        } else {
            btn.textContent = window.t ? (window.t('connecting') || 'Connecting...') : 'Connecting...';
            btn.disabled = true;
            try {
                const res = await fetch(API_BASE + '/api/integrations/connect', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ platform }) });
                const j = await res.json();
                if (j && j.success) {
                    btn.classList.add('connected');
                    btn.textContent = window.t ? window.t('connected') : 'Connected';
                    showNotification(window.t ? window.t('integrationConnected') : 'Account connected', 'success');
                    await loadIntegrations();
                } else {
                    showNotification((j && j.message) || (window.t ? window.t('subscriptionFailed') : 'Failed'), 'error');
                }
            } catch (e) { console.error(e); showNotification('Server error', 'error'); }
            btn.disabled = false;
        }
    });

    // initial load
    loadIntegrations();

    // Initialize Team Members functionality
    loadTeamMembers();
    
    // Auto-refresh team members every 30 seconds
    setInterval(loadTeamMembers, 30000);
    
    // Invite button
    const inviteBtn = document.getElementById('inviteUserBtn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            resetInviteModal();
            openTeamModal();
        });
    }
    
    // Modal close button
    const modalClose = document.getElementById('inviteModalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeTeamModal);
    }
    
    // Cancel button in modal
    const cancelBtn = document.getElementById('inviteCancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeTeamModal);
    }
    
    // Save button in modal
    const saveBtn = document.getElementById('inviteSend');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTeamMember);
    }
    
    // Email input autocomplete
    const emailInput = document.getElementById('inviteEmail');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            showEmailSuggestions(this.value);
            
            // Auto-fill full name if email matches exactly
            setTimeout(async () => {
                console.log('[emailInput] Current value:', this.value);
                if (this.value.includes('@')) {
                    const users = await searchUsers(this.value);
                    console.log('[emailInput] Search result users:', users);
                    const exactMatch = users.find(u => {
                        console.log('[emailInput] Comparing:', u.email.toLowerCase(), 'vs', this.value.toLowerCase());
                        return u.email.toLowerCase() === this.value.toLowerCase();
                    });
                    console.log('[emailInput] Exact match found:', exactMatch);
                    if (exactMatch) {
                        console.log('[emailInput] Setting full_name:', exactMatch.full_name);
                        document.getElementById('inviteEmail').setAttribute('data-user-id', exactMatch.user_id);
                        document.getElementById('inviteUserFullName').value = exactMatch.full_name;
                        console.log('[emailInput] Full name field updated');
                    }
                }
            }, 300);
        });
        
        emailInput.addEventListener('focus', function() {
            if (this.value) {
                showEmailSuggestions(this.value);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target !== emailInput && !e.target.closest('.autocomplete-dropdown')) {
                const dropdown = document.getElementById('inviteEmailSuggestions');
                if (dropdown) {
                    dropdown.classList.remove('visible');
                }
            }
        });
    }
    
    // Delete confirmation buttons
    const deleteCancel = document.getElementById('teamDeleteCancel');
    if (deleteCancel) {
        deleteCancel.addEventListener('click', closeDeleteConfirmation);
    }
    
    const deleteConfirm = document.getElementById('teamDeleteConfirmBtn');
    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', function() {
            const modal = document.getElementById('teamDeleteConfirmModal');
            const memberId = modal.getAttribute('data-member-id');
            if (memberId) {
                deleteTeamMember(memberId);
            }
        });
    }

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                showNotification('Logging out...', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        });
    }

    // Load current profile from backend and populate fields
    try {
        const resp = await fetch(API_BASE + '/api/profile', { credentials: 'include' });
        const j = await resp.json();
        if (j && j.success && j.profile) {
            populateProfile(j.profile);
        }
    } catch (e) {
        console.warn('Could not load profile', e);
    }

    // load persisted user settings (toggles)
    loadUserSettings();
    // load current subscription info
    try { if (typeof loadSubscription === 'function') loadSubscription(); } catch(e) { console.warn('loadSubscription not available', e); }
    // always load payment methods for billing area on page load
    try { if (typeof loadPaymentMethods === 'function') loadPaymentMethods(); } catch(e) { console.warn('loadPaymentMethods not available', e); }

    // Language/timezone logic
    const languageSelect = document.getElementById('languageSelect');
    const timezoneSelect = document.getElementById('timezoneSelect');

    const tzByLang = {
        vi: [ ['asia/ho_chi_minh', '(GMT+07:00) Bangkok, Hanoi, Jakarta'] ],
        en: [ ['utc', '(GMT+00:00) UTC'], ['america/new_york', '(GMT-05:00) New York'] ],
        zh: [ ['asia/Shanghai', '(GMT+08:00) Beijing, Shanghai'] ],
        ko: [ ['asia/seoul', '(GMT+09:00) Seoul'] ],
        ru: [ ['europe/moscow', '(GMT+03:00) Moscow'] ],
        ja: [ ['asia/tokyo', '(GMT+09:00) Tokyo'] ]
    };

    function populateTimezonesFor(lang) {
        const list = tzByLang[lang] || tzByLang['en'];
        timezoneSelect.innerHTML = '';
        for (const [val, label] of list) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            timezoneSelect.appendChild(opt);
        }
    }

    // Minimal i18n for settings page (only common labels here)
    const translations = {
        en: {
            profileInformation: 'Profile Information',
            fullName: 'Full Name',
            emailAddress: 'Email Address',
            miniSupermarket: 'Mini Supermarket Name',
            bio: 'Bio',
            regionalSettings: 'Regional Settings',
            language: 'Language',
            timezone: 'Timezone'
        },
        vi: {
            profileInformation: 'Thông tin cá nhân',
            fullName: 'Họ và tên',
            emailAddress: 'Email',
            miniSupermarket: 'Tên Siêu Thị Mini',
            bio: 'Tiểu sử',
            regionalSettings: 'Cài đặt vùng',
            language: 'Ngôn ngữ',
            timezone: 'Múi giờ'
        },
        zh: {
            profileInformation: '个人资料',
            fullName: '全名',
            emailAddress: '电子邮件',
            miniSupermarket: '小型超市名称',
            bio: '简介',
            regionalSettings: '区域设置',
            language: '语言',
            timezone: '时区'
        },
        ko: {
            profileInformation: '프로필 정보',
            fullName: '성명',
            emailAddress: '이메일',
            miniSupermarket: '미니 슈퍼마켓 이름',
            bio: '약력',
            regionalSettings: '지역 설정',
            language: '언어',
            timezone: '시간대'
        },
        ru: {
            profileInformation: 'Информация профиля',
            fullName: 'Полное имя',
            emailAddress: 'Эл. почта',
            miniSupermarket: 'Название мини-маркета',
            bio: 'О себе',
            regionalSettings: 'Региональные настройки',
            language: 'Язык',
            timezone: 'Часовой пояс'
        },
        ja: {
            profileInformation: 'プロフィール情報',
            fullName: '氏名',
            emailAddress: 'メールアドレス',
            miniSupermarket: 'ミニスーパーマーケット名',
            bio: '自己紹介',
            regionalSettings: '地域設定',
            language: '言語',
            timezone: 'タイムゾーン'
        }
    };

    function translatePage(lang) {
        const map = translations[lang] || translations['en'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (map[key]) el.textContent = map[key];
        });
    }

    languageSelect?.addEventListener('change', (e) => {
        const lang = e.target.value;
        populateTimezonesFor(lang);
        translatePage(lang);
        localStorage.setItem('preferred_lang', lang);
    });

    // initialize language/timezone from saved preference or browser
    const savedLang = localStorage.getItem('preferred_lang') || (navigator.language && navigator.language.split('-')[0]) || 'vi';
    if (languageSelect) {
        if ([...languageSelect.options].some(o => o.value === savedLang)) languageSelect.value = savedLang;
        populateTimezonesFor(languageSelect.value);
        translatePage(languageSelect.value);
    }

    // helper to populate profile form
    function populateProfile(profile) {
        try {
            if (!profile) return;
            const f = document.getElementById('full_name');
            const e = document.getElementById('email');
            const m = document.getElementById('mini_supermarket');
            const b = document.getElementById('bio');
            if (f && profile.full_name !== undefined) f.value = profile.full_name || '';
            if (e && profile.email !== undefined) e.value = profile.email || '';
            if (m && profile.mini_supermarket !== undefined) m.value = profile.mini_supermarket || '';
            if (b && profile.bio !== undefined) b.value = profile.bio || '';
        } catch (err) { console.warn(err); }
    }
});

// Helper function for button loading state
function simulateLoading(btn, loadingText, originalText, callback) {
    btn.textContent = loadingText;
    btn.style.opacity = '0.7';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.opacity = '1';
        btn.disabled = false;
        if (callback) callback();
    }, 1000);
}

// Notification System
function showNotification(message, type = 'info') {
    const colors = {
        success: '#00C853',
        error: '#FF5252',
        info: '#5B5FED'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== TEAM MEMBERS FUNCTIONALITY ====================

// Time formatting utility
function formatLastActive(lastLogin) {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const lastTime = new Date(lastLogin);
    const diffMs = now - lastTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    // If less than 1 minute
    if (diffSecs < 60) return 'just now';
    
    // If less than 1 hour
    if (diffMins < 60) {
        return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    
    // If less than 1 day
    if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    
    // If less than 1 week
    if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
    
    // If less than 1 month
    if (diffWeeks < 4) {
        return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    }
    
    // Otherwise months
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}

// Create avatar with initials
function getAvatarColor(role) {
    const roleMap = {
        'Manager': 'manager',
        'Editor': 'editor',
        'Assistant': 'assistant'
    };
    return roleMap[role] || 'assistant';
}

function getInitials(fullName) {
    if (!fullName) return 'U';
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Modal functions
function openTeamModal() {
    const modal = document.getElementById('teamInviteModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Ensure translate is called so modal content is translated to current language
        if (typeof window.translate === 'function') {
            const lang = localStorage.getItem('preferred_lang') || 'en';
            window.translate(lang);
        }
    }
}

function closeTeamModal() {
    const modal = document.getElementById('teamInviteModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    resetInviteModal();
}

function resetInviteModal() {
    document.getElementById('inviteModalTitle').textContent = 'Invite User';
    document.getElementById('inviteEmail').value = '';
    document.getElementById('inviteEmail').removeAttribute('data-user-id');
    document.getElementById('inviteEmail').removeAttribute('data-member-id');
    document.getElementById('inviteUserFullName').value = '';
    document.getElementById('inviteRole').value = '';
    document.getElementById('inviteSend').textContent = 'Save Changes';
}

function closeDeleteConfirmation() {
    const modal = document.getElementById('teamDeleteConfirmModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.removeAttribute('data-member-id');
    }
}

// Load team members and populate table
async function loadTeamMembers() {
    try {
        const res = await fetch(API_BASE + '/api/team', { credentials: 'include' });
        if (!res.ok) {
            console.error('Failed to load team members:', res.statusText);
            return;
        }
        
        const data = await res.json();
        if (data.success && Array.isArray(data.members)) {
            populateTeamTable(data.members);
        }
    } catch (err) {
        console.error('Error loading team members:', err);
    }
}

function populateTeamTable(members) {
    const tbody = document.getElementById('teamMembersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--gray-600);">No team members yet. Click "Invite User" to add someone.</td></tr>';
        return;
    }
    
    members.forEach(member => {
        const tr = document.createElement('tr');
        const initials = getInitials(member.full_name);
        const avatarColor = getAvatarColor(member.role);
        const lastActive = formatLastActive(member.last_login);
        
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="member-avatar ${avatarColor}">${initials}</div>
                    <div>
                        <div style="font-weight: 500;">${member.full_name}</div>
                        <div style="font-size: 12px; color: var(--gray-600);">${member.email}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge ${avatarColor.toLowerCase()}">${member.role}</span>
            </td>
            <td>
                <span class="status-badge ${lastActive === 'just now' ? 'online' : 'offline'}">${lastActive}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit" title="Edit Member" data-member-id="${member.member_id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" title="Remove Member" data-member-id="${member.member_id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Attach edit and delete listeners
    attachTeamActionListeners();
}

function attachTeamActionListeners() {
    // Edit buttons
    document.querySelectorAll('#teamMembersTableBody .btn-icon.edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const memberId = this.getAttribute('data-member-id');
            editTeamMember(memberId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('#teamMembersTableBody .btn-icon.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const memberId = this.getAttribute('data-member-id');
            showDeleteConfirmation(memberId);
        });
    });
}

// Search for users via email
let allUsersCache = [];
async function searchUsers(query) {
    try {
        const url = query 
            ? `${API_BASE}/api/users/search?q=${encodeURIComponent(query)}` 
            : `${API_BASE}/api/users/search`;
        
        console.log('[searchUsers] Fetching from:', url);
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
            console.error('[searchUsers] Request failed:', res.status, res.statusText);
            return [];
        }
        
        const data = await res.json();
        console.log('[searchUsers] Response data:', data);
        return data.success ? (data.users || []) : [];
    } catch (err) {
        console.error('Error searching users:', err);
        return [];
    }
}

// Show email autocomplete suggestions
async function showEmailSuggestions(query) {
    const dropdown = document.getElementById('inviteEmailSuggestions');
    if (!dropdown) return;
    
    if (!query || query.length < 1) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
        return;
    }
    
    const users = await searchUsers(query);
    
    if (users.length === 0) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
        return;
    }
    
    dropdown.innerHTML = users.map(user => `
        <li data-user-id="${user.user_id}" data-email="${user.email}" data-full-name="${user.full_name}">
            <div class="user-item">
                <div>
                    <div class="name">${user.full_name}</div>
                    <div class="email">${user.email}</div>
                </div>
            </div>
        </li>
    `).join('');
    
    dropdown.classList.add('visible');
    
    // Add click listeners
    dropdown.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const email = this.getAttribute('data-email');
            const fullName = this.getAttribute('data-full-name');
            
            document.getElementById('inviteEmail').value = email;
            document.getElementById('inviteEmail').setAttribute('data-user-id', userId);
            document.getElementById('inviteUserFullName').value = fullName;
            
            dropdown.classList.remove('visible');
            dropdown.innerHTML = '';
        });
    });
}

// Edit team member (populate modal with current data)
async function editTeamMember(memberId) {
    try {
        const res = await fetch(API_BASE + '/api/team', { credentials: 'include' });
        const data = await res.json();
        
        if (data.success && Array.isArray(data.members)) {
            const member = data.members.find(m => m.member_id == memberId);
            
            if (member) {
                // Set modal to edit mode
                document.getElementById('inviteModalTitle').textContent = 'Edit Team Member';
                document.getElementById('inviteEmail').value = member.email;
                document.getElementById('inviteEmail').setAttribute('data-user-id', member.user_id);
                document.getElementById('inviteEmail').setAttribute('data-member-id', memberId);
                document.getElementById('inviteUserFullName').value = member.full_name;
                document.getElementById('inviteRole').value = member.role;
                
                // Change button text
                document.getElementById('inviteSend').textContent = 'Update Member';
                
                openTeamModal();
            }
        }
    } catch (err) {
        console.error('Error editing team member:', err);
    }
}

// Show delete confirmation
function showDeleteConfirmation(memberId) {
    const modal = document.getElementById('teamDeleteConfirmModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Store member ID for deletion
        modal.setAttribute('data-member-id', memberId);
        
        // Ensure translate is called so modal content is translated to current language
        if (typeof window.translate === 'function') {
            const lang = localStorage.getItem('preferred_lang') || 'en';
            window.translate(lang);
        }
    }
}

// Delete team member
async function deleteTeamMember(memberId) {
    closeDeleteConfirmation();
    
    try {
        const res = await fetch(`${API_BASE}/api/team/${memberId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await res.json();
        if (data.success) {
            showNotification('Team member removed successfully', 'success');
            loadTeamMembers();
        } else {
            showNotification(data.message || 'Failed to remove team member', 'error');
        }
    } catch (err) {
        console.error('Error deleting team member:', err);
        showNotification('Server error while removing team member', 'error');
    }
}

// Add or update team member
async function saveTeamMember() {
    const email = document.getElementById('inviteEmail').value.trim();
    const userId = document.getElementById('inviteEmail').getAttribute('data-user-id');
    const memberId = document.getElementById('inviteEmail').getAttribute('data-member-id');
    const role = document.getElementById('inviteRole').value;
    
    if (!userId) {
        showNotification('Please select a valid user from the suggestions', 'error');
        return;
    }
    
    if (!role) {
        showNotification('Please select a role', 'error');
        return;
    }
    
    const btn = document.getElementById('inviteSend');
    btn.disabled = true;
    
    try {
        let endpoint, method, payload;
        
        if (memberId) {
            // Update existing member
            endpoint = `/api/team/update/${memberId}`;
            method = 'POST';
            payload = { role };
        } else {
            // Add new member
            endpoint = '/api/team/add';
            method = 'POST';
            payload = { userId: parseInt(userId), role };
        }
        
        const res = await fetch(API_BASE + endpoint, {
            method: method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showNotification(memberId ? 'Team member updated successfully' : 'Team member added successfully', 'success');
            closeTeamModal();
            loadTeamMembers();
        } else {
            showNotification(data.message || 'Failed to save team member', 'error');
        }
    } catch (err) {
        console.error('Error saving team member:', err);
        showNotification('Server error while saving team member', 'error');
    } finally {
        btn.disabled = false;
    }
}

