// Livestream Studio Logic

// State
let isLive = false;
let streamDuration = 0;
let timerInterval;
let viewerCount = 0;
let viewerInterval;
let moderationEnabled = false;
let messageQueue = [];
let nextMessageId = 1;
let peakViewers = 0;
let newFollowers = 0;
let totalRevenue = 0;
let fpsInterval = null;

// Stream Settings
let streamSettings = {
    title: '',
    description: '',
    quality: '1080',
    platforms: []
};

// DOM Elements
const liveBadge = document.querySelector('.live-badge');
const goLiveBtn = document.getElementById('goLiveBtn');
const timerDisplay = document.getElementById('streamTimer');
const viewerDisplay = document.getElementById('viewerCount');
const viewerBoxDisplay = document.getElementById('viewerCountBox');
const chatMessages = document.getElementById('liveChatMessages'); // Updated ID
const chatInput = document.querySelector('.chat-input');
const sendBtn = document.querySelector('.btn-send');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const moderationQueue = document.getElementById('moderationQueue');
const moderationToggle = document.getElementById('moderationToggle');
const modCountBadge = document.getElementById('modCount');

// Controls
const micBtn = document.getElementById('micBtn');
const camBtn = document.getElementById('camBtn');
const shareBtn = document.getElementById('shareBtn');

// Initialize
function init() {
    console.log('=== LIVESTREAM INIT START ===');
    
    // FORCE hide all modals on page load
    const allModals = document.querySelectorAll('.modal-overlay');
    console.log(`Found ${allModals.length} modals`);
    
    allModals.forEach((modal, index) => {
        // Remove active class
        modal.classList.remove('active');

        // Clear any inline styles so CSS class can control visibility
        modal.style.display = '';
        modal.style.visibility = '';
        modal.style.opacity = '';

        console.log(`Modal ${index + 1} (${modal.id}): HIDDEN`);
    });
    
    // Ensure body can scroll
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    
    console.log('=== LIVESTREAM INIT COMPLETE ===');
    
    setupEventListeners();
    // Populate sessions on load so preview reflects available content
    fetchLiveSessions().then(() => {
        // if no title chosen, ensure preview shows default
        const preview = document.querySelector('.stream-title-preview');
        if (preview && !streamSettings.title) preview.textContent = 'No Live Session Selected';
    });
    addSystemMessage('Welcome to Livestream Studio. Set up your stream and click "Go Live" to start.');
}

function setupEventListeners() {
    // Go Live Button
    if (goLiveBtn) goLiveBtn.addEventListener('click', toggleStream);

    // Chat
    if (sendBtn) sendBtn.addEventListener('click', handleUserSend);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleUserSend();
        });
    }

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update Buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update Content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}Tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Moderation Toggle
    if (moderationToggle) {
        moderationToggle.addEventListener('change', (e) => {
            moderationEnabled = e.target.checked;
            const status = moderationEnabled ? 'ON' : 'OFF';
            addSystemMessage(`Moderation mode turned ${status}`);
        });
    }

    // Controls
    if (micBtn) micBtn.addEventListener('click', () => toggleControl(micBtn));
    if (camBtn) camBtn.addEventListener('click', () => toggleControl(camBtn));
    if (shareBtn) shareBtn.addEventListener('click', () => toggleControl(shareBtn));

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                addSystemMessage('Logging out...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        });
    }

    // Camera confirm modal handlers (moved here to ensure DOM is ready)
    const cameraConfirmModalLocal = document.getElementById('cameraConfirmModal');
    const closeCameraConfirmLocal = document.getElementById('closeCameraConfirm');
    const cancelCameraConfirmLocal = document.getElementById('cancelCameraConfirm');
    const confirmCameraBtnLocal = document.getElementById('confirmCameraBtn');
    
    console.log('setupEventListeners: attaching camera modal handlers', {
        confirmCameraBtn: confirmCameraBtnLocal,
        cameraConfirmModal: cameraConfirmModalLocal
    });
    
    if (closeCameraConfirmLocal) {
        closeCameraConfirmLocal.addEventListener('click', () => {
            if (cameraConfirmModalLocal) cameraConfirmModalLocal.classList.remove('active');
        });
    }
    if (cancelCameraConfirmLocal) {
        cancelCameraConfirmLocal.addEventListener('click', () => {
            if (cameraConfirmModalLocal) cameraConfirmModalLocal.classList.remove('active');
        });
    }
    if (cameraConfirmModalLocal) {
        cameraConfirmModalLocal.addEventListener('click', (e) => {
            if (e.target === cameraConfirmModalLocal) cameraConfirmModalLocal.classList.remove('active');
        });
    }
    if (confirmCameraBtnLocal) {
        confirmCameraBtnLocal.addEventListener('click', async () => {
            console.log('confirmCameraBtn clicked - starting countdown');
            if (cameraConfirmModalLocal) cameraConfirmModalLocal.classList.remove('active');
            await startLiveWithCountdown();
        });
    }

    // Pause / Continue button
    const pauseBtn = document.getElementById('pauseBtn');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseIcon = document.getElementById('pauseIcon');
    const playIcon = document.getElementById('playIcon');
    let isPaused = false;
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            if (isPaused) {
                // Only hide camera visuals when live
                if (isLive) {
                    // show overlay, switch icon to play
                    if (pauseOverlay) pauseOverlay.style.display = 'flex';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                    if (playIcon) playIcon.style.display = '';

                    // Hide the actual video element and show a black placeholder
                    const videoEl = document.getElementById('localVideo');
                    const videoPlaceholder = document.getElementById('videoPlaceholder');
                    if (videoEl) videoEl.style.display = 'none';
                    if (videoPlaceholder) {
                        videoPlaceholder.classList.remove('hidden');
                        videoPlaceholder.classList.add('paused');
                    }
                }
                addSystemMessage('Livestream tạm dừng (camera ẩn), dữ liệu vẫn tiếp tục.');
            } else {
                // Only restore camera visuals when live
                if (isLive) {
                    // hide overlay, switch icon to pause
                    if (pauseOverlay) pauseOverlay.style.display = 'none';
                    if (pauseIcon) pauseIcon.style.display = '';
                    if (playIcon) playIcon.style.display = 'none';

                    // Restore video element and hide paused placeholder
                    const videoEl = document.getElementById('localVideo');
                    const videoPlaceholder = document.getElementById('videoPlaceholder');
                    if (videoEl) videoEl.style.display = '';
                    if (videoPlaceholder) {
                        videoPlaceholder.classList.add('hidden');
                        videoPlaceholder.classList.remove('paused');
                    }
                }
                addSystemMessage('Tiếp tục phát trực tiếp.');
            }
        });
    }

    // Stream info edit (open setup modal)
    const streamInfoEdit = document.querySelector('.stream-info-edit');
    const setupModalLocal = document.getElementById('setupModal');
    const closeSetupModalLocal = document.getElementById('closeSetupModal');
    const streamSessionSelectLocal = document.getElementById('streamSessionSelect');
    const startBroadcastBtnLocal = document.getElementById('startBroadcastBtn');
    const streamDescInputLocal = document.getElementById('streamDescInput');
    const streamQualitySelectLocal = document.getElementById('streamQualitySelect');

    if (streamInfoEdit) {
        streamInfoEdit.addEventListener('click', async () => {
            // Populate sessions each time modal opens to get latest
            await fetchLiveSessions();
            if (setupModalLocal) setupModalLocal.classList.add('active');
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSetupModalLocal) {
        closeSetupModalLocal.addEventListener('click', () => {
            if (setupModalLocal) setupModalLocal.classList.remove('active');
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        });
    }

    // Update preview when selection changes
    if (streamSessionSelectLocal) {
        streamSessionSelectLocal.addEventListener('change', (e) => {
            const preview = document.querySelector('.stream-title-preview');
            const selected = e.target.selectedOptions[0];
            if (selected && selected.value) {
                streamSettings.title = selected.textContent;
                // store the associated content id if present
                streamSettings.content_id = selected.value;
                if (preview) preview.textContent = selected.textContent;
            } else {
                streamSettings.title = '';
                streamSettings.content_id = null;
                if (preview) preview.textContent = 'No Live Session Selected';
            }
        });
    }

    // Start Broadcasting from setup modal — open camera confirm flow
    if (startBroadcastBtnLocal) {
        startBroadcastBtnLocal.addEventListener('click', () => {
            // Collect settings
            const platforms = Array.from(document.querySelectorAll('input[name="streamPlatform"]:checked')).map(i => i.value);
            streamSettings.platforms = platforms;
            streamSettings.description = streamDescInputLocal ? streamDescInputLocal.value : '';
            streamSettings.quality = streamQualitySelectLocal ? streamQualitySelectLocal.value : streamSettings.quality;

            // If a session is selected, ensure title is set
            let sel = null;
            if (streamSessionSelectLocal) sel = streamSessionSelectLocal.selectedOptions[0];

            // Validate selection — require a published livestream session to start
            if (!sel || !sel.value) {
                showNotification('Bạn phải chọn phiên Livestream để bắt đầu Live.', 'error');
                return;
            }

            streamSettings.title = sel.textContent;
            streamSettings.content_id = sel.value || null;

            // Close setup modal and open camera confirm
            if (setupModalLocal) setupModalLocal.classList.remove('active');
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';

            const cameraConfirmModal = document.getElementById('cameraConfirmModal');
            if (cameraConfirmModal) cameraConfirmModal.classList.add('active');
        });
    }
}

// Stream Logic
// Stream Logic
let localStream = null;

function toggleStream() {
    if (isLive) {
        // Confirmation before ending
        // show end confirmation modal instead of window.confirm
        const endConfirmModal = document.getElementById('endConfirmModal');
        if (endConfirmModal) {
            endConfirmModal.classList.add('active');
        } else {
            // fallback to browser confirm
            if (confirm('Are you sure you want to end the stream?')) {
                stopStream();
                showSummaryModal();
            }
        }
    } else {
        const cameraConfirmModal = document.getElementById('cameraConfirmModal');
        console.log('toggleStream: opening camera confirm modal', cameraConfirmModal);
        // Validate that a session is selected before opening camera confirm
        const streamSessionSelectEl = document.getElementById('streamSessionSelect');
        let hasSelection = false;
        if (streamSessionSelectEl) {
            const sel = streamSessionSelectEl.selectedOptions[0];
            if (sel && sel.value) hasSelection = true;
        } else if (streamSettings.title) {
            // If select not present but a title was set previously, allow
            hasSelection = true;
        }

        if (!hasSelection) {
            // show red corner notification
            showNotification('Bạn phải chọn phiên Livestream để bắt đầu Live.', 'error');
            return;
        }

        if (cameraConfirmModal) {
            cameraConfirmModal.classList.add('active');
        } else {
            console.warn('cameraConfirmModal element not found — falling back to setupModal');
            const setupModalEl = document.getElementById('setupModal');
            if (setupModalEl) setupModalEl.classList.add('active');
        }
    }
}

async function startCamera() {
    try {
        // Quality constraints based on selected quality
        const qualityConstraints = {
            '720': { width: 1280, height: 720 },
            '1080': { width: 1920, height: 1080 },
            '1440': { width: 2560, height: 1440 },
            '2160': { width: 3840, height: 2160 }
        };
        
        const selectedQuality = qualityConstraints[streamSettings.quality] || qualityConstraints['1080'];
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: selectedQuality.width },
                height: { ideal: selectedQuality.height },
                frameRate: { ideal: 30 }
            }, 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        localStream = stream;
        const videoElement = document.getElementById('localVideo');
        videoElement.srcObject = stream;
        
        // Apply initial button states
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        
        if (audioTrack) audioTrack.enabled = micBtn.classList.contains('active');
        if (videoTrack) videoTrack.enabled = camBtn.classList.contains('active');

        return true;
    } catch (err) {
        console.error("Error accessing media devices:", err);
        alert("Could not access camera/microphone. Please check permissions.");
        return false;
    }
}

function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        const videoElement = document.getElementById('localVideo');
        videoElement.srcObject = null;
    }
}

async function startStream() {
    // Try to start camera first
    const cameraStarted = await startCamera();
    if (!cameraStarted) return; // Exit if camera failed
    enableLiveUI();
}

// Enable UI and simulation when stream becomes live (shared by both flows)
function enableLiveUI() {
    isLive = true;

    // UI Updates
    goLiveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Off Live
    `;
    goLiveBtn.classList.replace('btn-primary', 'btn-danger');
    goLiveBtn.style.backgroundColor = '#FF5252';
    
    liveBadge.classList.add('active');
    liveBadge.querySelector('span').textContent = 'LIVE';
    
    // Hide placeholder, show video
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    if(videoPlaceholder) videoPlaceholder.classList.add('hidden');
    
    // Start Timer
    streamDuration = 0;
    timerInterval = setInterval(updateTimer, 1000);
    
    // Start Viewer Simulation
    viewerCount = 0;
    viewerInterval = setInterval(updateViewers, 3000);
    if (viewerBoxDisplay) viewerBoxDisplay.textContent = viewerCount.toLocaleString();
    // Start FPS simulation
    startFPSSimulation();
    
    addSystemMessage('Stream started. You are now live!');
    startChatSimulation();
    
    // Reset Stats
    totalRevenue = 0;
    peakViewers = 0;
    newFollowers = 0;
    const revEl = document.getElementById('revenueCount');
    if (revEl) revEl.textContent = '0.00';
    startInteractionSimulation();
}

function stopStream() {
    // Stop Camera
    stopCamera();

    isLive = false; // Fix: Ensure isLive is set to false

    // UI Updates
    goLiveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
        Go Live
    `;
    goLiveBtn.classList.replace('btn-danger', 'btn-primary');
    goLiveBtn.style.backgroundColor = '';
    
    liveBadge.classList.remove('active');
    liveBadge.querySelector('span').textContent = 'OFFLINE';
    
    // Persist stream data to localStorage
    try {
        const streams = JSON.parse(localStorage.getItem('streams') || '[]');
        const endedAt = new Date();
        const durationSeconds = streamDuration;
        const streamData = {
            title: streamSettings.title || document.querySelector('.stream-title-preview')?.textContent || '',
            startedAt: (endedAt.getTime() - (durationSeconds * 1000)),
            endedAt: endedAt.getTime(),
            durationSeconds: durationSeconds,
            peakViewers: peakViewers,
            viewersAtEnd: viewerCount,
            revenue: totalRevenue,
            followersGained: newFollowers,
            platforms: streamSettings.platforms || []
        };
        streams.push(streamData);
        localStorage.setItem('streams', JSON.stringify(streams));
        console.log('Saved stream data', streamData);
        // Also persist session summary to backend analytics for profile aggregation
        try {
            const sessionPayload = {
                content_id: streamSettings.content_id || null,
                date: new Date().toISOString(),
                views: Number(streamData.viewersAtEnd || 0),
                revenue: Number(streamData.revenue || 0),
                new_followers: Number(streamData.followersGained || 0)
            };
            console.log('[SESSION POST] Sending to /api/contents/session:', sessionPayload);
            
            fetch('http://localhost:3000/api/contents/session', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionPayload)
            }).then(async r => {
                console.log('[SESSION POST] Response status:', r.status, r.ok);
                const j = await r.json();
                console.log('[SESSION POST] Response body:', j);
                if (j && j.success) {
                    console.log('[SESSION POST] ✓ Session saved to server successfully');
                    try {
                        localStorage.setItem('last_stream_update', JSON.stringify({ content_id: streamSettings.content_id || null, views: Number(streamData.viewersAtEnd || 0), timestamp: Date.now() }));
                        console.log('[SESSION POST] ✓ Set last_stream_update in localStorage');
                    } catch (e) { console.warn('Could not set last_stream_update in localStorage', e); }
                } else {
                    console.warn('[SESSION POST] ✗ Server returned unsuccessful response:', j);
                }
            }).catch(e => {
                console.error('[SESSION POST] ✗ Fetch error:', e);
            });
            
            // Also update content with accumulated revenue
            if (streamSettings.content_id) {
                // First fetch the current content to get existing revenue
                fetch(`http://localhost:3000/api/contents/${streamSettings.content_id}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                }).then(async r => {
                    const contentData = await r.json();
                    const existingRevenue = (contentData && contentData.content && Number(contentData.content.revenue)) || 0;
                    const totalRevenue = existingRevenue + Number(streamData.revenue || 0);
                    
                    // Now update with accumulated revenue
                    const updatePayload = {
                        revenue: totalRevenue
                    };
                    console.log('[REVENUE UPDATE] Accumulating: existing=' + existingRevenue + ', new=' + Number(streamData.revenue || 0) + ', total=' + totalRevenue);
                    
                    fetch(`http://localhost:3000/api/contents/${streamSettings.content_id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload)
                    }).then(async r => {
                        console.log('[REVENUE UPDATE] Response status:', r.status);
                        const j = await r.json();
                        if (j && j.success) {
                            console.log('[REVENUE UPDATE] ✓ Content revenue updated successfully to $' + totalRevenue);
                        } else {
                            console.warn('[REVENUE UPDATE] ✗ Failed to update revenue:', j);
                        }
                    }).catch(e => {
                        console.error('[REVENUE UPDATE] ✗ Fetch error:', e);
                    });
                }).catch(e => {
                    console.error('[REVENUE UPDATE] ✗ Failed to fetch current content:', e);
                });
            }
        } catch (e) {
            console.error('[SESSION POST] ✗ Error preparing session POST:', e);
        }
    } catch (err) {
        console.error('Error saving stream data', err);
    }

    // Show placeholder
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    if(videoPlaceholder) videoPlaceholder.classList.remove('hidden');

    // Stop Timer
    clearInterval(timerInterval);
    timerDisplay.textContent = '00:00:00';

    // Stop Viewers
    clearInterval(viewerInterval);
    viewerCount = 0;
    viewerDisplay.textContent = '0';
    if (viewerBoxDisplay) viewerBoxDisplay.textContent = '0';

    // Stop FPS simulation
    stopFPSSimulation();

    addSystemMessage('Stream ended.');
    stopChatSimulation();
    stopInteractionSimulation();
}

function updateTimer() {
    streamDuration++;
    const hours = Math.floor(streamDuration / 3600);
    const minutes = Math.floor((streamDuration % 3600) / 60);
    const seconds = streamDuration % 60;
    
    timerDisplay.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateViewers() {
    // Simulate fluctuation
    const change = Math.floor(Math.random() * 10) - 3;
    viewerCount = Math.max(0, viewerCount + change + (streamDuration < 60 ? 5 : 0)); // Grow faster at start
    viewerDisplay.textContent = viewerCount.toLocaleString();
    if (viewerBoxDisplay) viewerBoxDisplay.textContent = viewerCount.toLocaleString();
    if (viewerCount > peakViewers) peakViewers = viewerCount;
}

// Control Logic
function toggleControl(btn) {
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    
    // Visual update
    if (!isActive) {
        btn.style.color = '#FF5252'; // Muted/Off state color
    } else {
        btn.style.color = '';
    }

    // Hardware update if stream is running
    if (localStream) {
        if (btn.id === 'micBtn') {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = isActive;
                addSystemMessage(isActive ? 'Microphone enabled' : 'Microphone muted');
            }
        } else if (btn.id === 'camBtn') {
            const videoTracks = localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks[0].enabled = isActive;
                addSystemMessage(isActive ? 'Camera enabled' : 'Camera disabled');
            }
        }
    }
}

// Chat Logic
function handleUserSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    const messageData = {
        author: 'You',
        text: text,
        isSelf: true,
        avatar: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%235B5FED\'/%3E%3Ctext x=\'50\' y=\'65\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\' font-family=\'Arial\' font-weight=\'bold\'%3EU%3C/text%3E%3C/svg%3E',
        timestamp: new Date()
    };
    
    if (moderationEnabled) {
        addToModerationQueue(messageData);
        // Temporarily clear input as if sent
        chatInput.value = '';
    } else {
        addMessage(messageData);
        chatInput.value = '';
    }
}

function handleIncomingMessage(data) {
    // Basic User messages (from simulator or others)
    const messageData = {
        ...data,
        timestamp: new Date()
    };
    
    if (moderationEnabled) {
        addToModerationQueue(messageData);
    } else {
        addMessage(messageData);
    }
}

function addMessage({ author, text, isSelf = false, avatar }) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isSelf ? 'self' : ''}`;
    
    msgDiv.innerHTML = `
        <div class="chat-avatar">
            <img src="${avatar}" alt="${author}">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${author}</span>
                <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="message-text">${text}</div>
        </div>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message system';
    msgDiv.innerHTML = `<div class="message-text">${text}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Small corner notification (toast)
function showNotification(text, type = 'info', duration = 4000) {
    console.log('showNotification called:', text, type);
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        // append and ensure basic positioning in case CSS was reverted
        container.style.position = 'fixed';
        container.style.right = '20px';
        container.style.bottom = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.zIndex = '99999';
        document.body.appendChild(container);
    }

    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = text;
    // Inline styles to guarantee visibility/animation even without CSS
    n.style.minWidth = '240px';
    n.style.maxWidth = '360px';
    n.style.padding = '12px 16px';
    n.style.borderRadius = '8px';
    n.style.color = 'white';
    n.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    n.style.fontWeight = '600';
    n.style.opacity = '0';
    n.style.transform = 'translateY(8px)';
    n.style.transition = 'opacity 200ms ease, transform 200ms ease';
    if (type === 'error') n.style.background = '#D32F2F';
    else if (type === 'success') n.style.background = '#2E7D32';
    else n.style.background = '#1976D2';
    container.appendChild(n);

    // Force visible using inline styles (works even if CSS rules absent)
    requestAnimationFrame(() => {
        n.style.opacity = '1';
        n.style.transform = 'translateY(0)';
    });

    // Hide after duration
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transform = 'translateY(8px)';
        setTimeout(() => n.remove(), 250);
    }, duration);
}

// Moderation Logic
function addToModerationQueue(message) {
    const id = nextMessageId++;
    const queuedMessage = { ...message, id };
    messageQueue.push(queuedMessage);
    renderModerationQueue();
    updateBadge();
}

function renderModerationQueue() {
    moderationQueue.innerHTML = '';
    
    if (messageQueue.length === 0) {
        moderationQueue.innerHTML = `
            <div class="empty-state">
                <p>No messages pending approval</p>
            </div>
        `;
        return;
    }
    
    messageQueue.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'moderation-item';
        item.innerHTML = `
            <div class="mod-header">
                <span class="mod-author">${msg.author}</span>
                <span class="mod-time">${msg.timestamp.toLocaleTimeString()}</span>
            </div>
            <div class="mod-text">${msg.text}</div>
            <div class="mod-actions">
                <button class="btn-mod btn-reject" onclick="rejectMessage(${msg.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Reject
                </button>
                <button class="btn-mod btn-approve" onclick="approveMessage(${msg.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approve
                </button>
            </div>
        `;
        moderationQueue.appendChild(item);
    });
}

function updateBadge() {
    if (messageQueue.length > 0) {
        modCountBadge.style.display = 'inline-block';
        modCountBadge.textContent = messageQueue.length;
    } else {
        modCountBadge.style.display = 'none';
        modCountBadge.textContent = '0';
    }
}

// Global functions for onClick
window.approveMessage = function(id) {
    const index = messageQueue.findIndex(m => m.id === id);
    if (index !== -1) {
        const msg = messageQueue[index];
        addMessage(msg); // Move to chat
        messageQueue.splice(index, 1); // Remove from queue
        renderModerationQueue();
        updateBadge();
    }
};

window.rejectMessage = function(id) {
    const index = messageQueue.findIndex(m => m.id === id);
    if (index !== -1) {
        messageQueue.splice(index, 1); // Remove from queue
        renderModerationQueue();
        updateBadge();
    }
};

// Chat Simulation
let chatInterval;
const simulatedUsers = [
    { name: 'Nguyễn Thảo', avatar: 'https://ui-avatars.com/api/?name=Nguyen+Thao&background=random' },
    { name: 'Trần Bảo Toàn', avatar: 'https://ui-avatars.com/api/?name=Tran+Bao+Toan&background=random' },
    { name: 'Liam Carter', avatar: 'https://ui-avatars.com/api/?name=Liam+Carter&background=random' },
    { name: 'Sara Johnson', avatar: 'https://ui-avatars.com/api/?name=Sara+Johnson&background=random' },
    { name: 'Miguel Álvarez', avatar: 'https://ui-avatars.com/api/?name=Miguel+Alvarez&background=random' },
    { name: '陈 伟', avatar: 'https://ui-avatars.com/api/?name=%E9%99%88%E4%BC%9F&background=random' }
];
const simulatedMessages = [
    "Great stream!",
    "Tuyệt vời!",
    "¿Cuándo será el próximo evento?",
    "今天的內容很有幫助！",
    "Amazing tips, thanks.",
    "Âm thanh hơi nhỏ",
    "Can't wait for the Q&A",
    "Cảm ơn bạn đã chia sẻ",
    "شكرا للمحتوى!",
    "Muito bom!",
    "Loving the new update",
    "When is the next giveaway?",
    "Hello from Vietnam! 🇻🇳"
];

function startChatSimulation() {
    chatInterval = setInterval(() => {
        if (Math.random() > 0.6) { // 40% chance to send message every interval
            const user = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
            const text = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
            
            handleIncomingMessage({
                author: user.name,
                text: text,
                avatar: user.avatar
            });
        }
    }, 2000);
}

function stopChatSimulation() {
    clearInterval(chatInterval);
}

// Run Init
init();

// ==================== NEW FEATURES ====================

// 1. Floating Reactions
const reactionBtn = document.getElementById('reactionBtn');
const reactionContainer = document.getElementById('reactionContainer');

if (reactionBtn) {
    reactionBtn.addEventListener('click', triggerReaction);
}

function triggerReaction() {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    
    // Random horizontal position
    const randomLeft = Math.random() * 60 + 20; // 20% to 80%
    heart.style.left = `${randomLeft}%`;
    
    reactionContainer.appendChild(heart);
    
    // Remove after animation
    setTimeout(() => {
        heart.remove();
    }, 2000);
}

// 2. Gifting System
const giftBtn = document.getElementById('giftBtn');
const giftModal = document.getElementById('giftModal');
const closeGiftModal = document.getElementById('closeGiftModal');
const revenueDisplay = document.getElementById('revenueCount');

if (giftBtn) {
    giftBtn.addEventListener('click', () => {
        giftModal.classList.add('active');
    });
}

if (closeGiftModal) {
    closeGiftModal.addEventListener('click', () => {
        giftModal.classList.remove('active');
    });
}

document.querySelectorAll('.gift-item').forEach(item => {
    item.addEventListener('click', () => {
        const giftType = item.dataset.gift;
        const price = parseFloat(item.dataset.price);
        // Gifts in this studio are display-only; the broadcaster cannot gift to self.
        // Close modal and show informational system message instead.
        giftModal.classList.remove('active');
        addSystemMessage(`Gifts are for demonstration only. Simulated viewers will send gifts during the live session (${giftType} — $${price}).`);
    });
});

function sendGift(type, price, isSelf = true, userName = 'You') {
    // Update Revenue
    totalRevenue += price;
    revenueDisplay.textContent = totalRevenue.toFixed(2);
    
    // Add to Chat
    const icons = { rose: '🌹', coffee: '☕', diamond: '💎', rocket: '🚀' };
    const icon = icons[type] || '🎁';
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message gift-message`;
    msgDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                ${userName} sent ${type} ${icon} <span class="gift-emoji"></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 3. Interaction Simulation (Bot Likes & Gifts)
let interactionInterval;

function startInteractionSimulation() {
    interactionInterval = setInterval(() => {
        // Random Likes
        if (Math.random() > 0.3) {
            triggerReaction();
        }

        // Random Gifts (rarer) - gifts only change revenue
        if (Math.random() > 0.85) {
            const gifts = [
                { type: 'rose', price: 1 },
                { type: 'coffee', price: 5 },
                { type: 'diamond', price: 20 },
                { type: 'rocket', price: 50 }
            ];
            const gift = gifts[Math.floor(Math.random() * gifts.length)];
            const user = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];

            sendGift(gift.type, gift.price, false, user.name);
        }

        // Random Followers (rare)
        if (Math.random() > 0.92) {
            newFollowers++;
        }
    }, 800);
}

function stopInteractionSimulation() {
    clearInterval(interactionInterval);
}

// 4. Summary Modal
const summaryModal = document.getElementById('summaryModal');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');

function showSummaryModal() {
    // Populate Data
    const hours = Math.floor(streamDuration / 3600);
    const minutes = Math.floor((streamDuration % 3600) / 60);
    const seconds = streamDuration % 60;
    
    document.getElementById('sumDuration').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
    document.getElementById('sumViewers').textContent = peakViewers.toLocaleString();
    document.getElementById('sumFollowers').textContent = newFollowers;
    document.getElementById('sumRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    
    summaryModal.classList.add('active');
}

closeSummaryBtn.addEventListener('click', () => {
    summaryModal.classList.remove('active');
});

// 5. Setup Stream Logic
const setupModal = document.getElementById('setupModal');
const closeSetupModal = document.getElementById('closeSetupModal');
const startBroadcastBtn = document.getElementById('startBroadcastBtn');
const streamSessionSelect = document.getElementById('streamSessionSelect');

// Countdown overlay (can be accessed globally for countdown display)
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumberEl = document.getElementById('countdownNumber');

if (closeSetupModal) {
    closeSetupModal.addEventListener('click', () => {
        setupModal.classList.remove('active');
    });
}

// Close modal when clicking on overlay background
if (setupModal) {
    setupModal.addEventListener('click', (e) => {
        if (e.target === setupModal) {
            setupModal.classList.remove('active');
        }
    });
}

// Close gift modal when clicking on overlay
if (giftModal) {
    giftModal.addEventListener('click', (e) => {
        if (e.target === giftModal) {
            giftModal.classList.remove('active');
        }
    });
}

// Close summary modal when clicking on overlay
if (summaryModal) {
    summaryModal.addEventListener('click', (e) => {
        if (e.target === summaryModal) {
            summaryModal.classList.remove('active');
        }
    });
}

if (startBroadcastBtn) {
    startBroadcastBtn.addEventListener('click', startBroadcast);
}

// End confirm modal handlers
const endConfirmModal = document.getElementById('endConfirmModal');
const closeEndConfirm = document.getElementById('closeEndConfirm');
const cancelEndConfirm = document.getElementById('cancelEndConfirm');
const confirmEndBtn = document.getElementById('confirmEndBtn');

if (closeEndConfirm) closeEndConfirm.addEventListener('click', () => endConfirmModal.classList.remove('active'));
if (cancelEndConfirm) cancelEndConfirm.addEventListener('click', () => endConfirmModal.classList.remove('active'));
if (endConfirmModal) {
    endConfirmModal.addEventListener('click', (e) => {
        if (e.target === endConfirmModal) endConfirmModal.classList.remove('active');
    });
}

if (confirmEndBtn) {
    confirmEndBtn.addEventListener('click', () => {
        if (endConfirmModal) endConfirmModal.classList.remove('active');
        // Stop stream and then show summary
        stopStream();
        showSummaryModal();
    });
}

function startBroadcast() {
    const title = streamTitleInput.value.trim();
    const description = document.getElementById('streamDescInput').value.trim();
    const quality = document.getElementById('streamQualitySelect').value;
    
    // Validation
    if (!title) {
        alert('Please enter a stream title');
        streamTitleInput.focus();
        return;
    }
    
    if (!description) {
        alert('Please enter a stream description');
        document.getElementById('streamDescInput').focus();
        return;
    }
    
    // Get Selected Platforms
    const platforms = Array.from(document.querySelectorAll('input[name="streamPlatform"]:checked'))
        .map(cb => cb.value);
        
    if (platforms.length === 0) {
        alert('Please select at least one platform');
        return;
    }
    
    // Store stream settings
    streamSettings = {
        title: title,
        description: description,
        quality: quality,
        platforms: platforms
    };
    
    // Update stream title preview in UI
    const streamTitlePreview = document.querySelector('.stream-title-preview');
    if (streamTitlePreview) {
        streamTitlePreview.textContent = title;
    }
    
    // Show quality info in system message
    const qualityLabels = {
        '720': '720p HD',
        '1080': '1080p Full HD',
        '1440': '1440p 2K',
        '2160': '4K Ultra HD'
    };
    
    addSystemMessage(`Starting stream: "${title}" in ${qualityLabels[quality]} on ${platforms.join(', ')}...`);
    
    setupModal.classList.remove('active');
    startStream();
}

// Try to fetch published livestream contents to populate session select
async function fetchLiveSessions() {
    const streamSessionSelect = document.getElementById('streamSessionSelect');
    if (!streamSessionSelect) return [];
    // Clear existing options
    streamSessionSelect.innerHTML = '';
    try {
        const res = await fetch('http://localhost:3000/api/contents?content_type=livestream&status=published', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
            console.warn('fetchLiveSessions: server returned', res.status);
            if (res.status === 401) {
                addSystemMessage('Bạn chưa đăng nhập hoặc không có quyền truy cập nội dung. Vui lòng đăng nhập.');
                // Optionally redirect to login page (uncomment if desired)
                // window.location.href = '/login';
            }
            throw new Error('fetch failed');
        }
        const payload = await res.json();
        // API may return either an array or an object { success, contents }
        const items = Array.isArray(payload) ? payload : (payload && payload.contents ? payload.contents : []);
        if (!Array.isArray(items) || items.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No Livestream Content Published At This Moment';
            opt.disabled = true;
            streamSessionSelect.appendChild(opt);
            // also set preview title
            const preview = document.querySelector('.stream-title-preview');
            if (preview) preview.textContent = 'No Live Session Selected';
            return [];
        }

        // Populate select with fetched items
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = 'No Live Session Selected';
        streamSessionSelect.appendChild(emptyOpt);

        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.content_id || item.id || item.title;
            opt.textContent = item.title || (`#${item.content_id || item.id}`);
            streamSessionSelect.appendChild(opt);
        });

        // If there's a chosen title in settings, reflect it — otherwise keep 'No Live Session Selected'
        const preview = document.querySelector('.stream-title-preview');
        if (streamSettings.title && preview) preview.textContent = streamSettings.title;

        return items;
    } catch (err) {
        console.warn('Could not fetch live sessions, using default', err);
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No Livestream Content Published At This Moment';
        opt.disabled = true;
        streamSessionSelect.appendChild(opt);
        const preview = document.querySelector('.stream-title-preview');
        if (preview) preview.textContent = 'No Live Session Selected';
        return [];
    }
}

// Update aggregates from stored sessions
function updateAggregates() {
    try {
        const streams = JSON.parse(localStorage.getItem('streams') || '[]');
        const agg = {
            totalRevenueAll: 0,
            totalViewsAll: 0,
            totalDurationSecondsAll: 0,
            totalNewFollowersAll: 0,
            sessionCount: streams.length
        };
        streams.forEach(s => {
            agg.totalRevenueAll += Number(s.revenue || 0);
            agg.totalViewsAll += Number(s.viewersAtEnd || 0);
            agg.totalDurationSecondsAll += Number(s.durationSeconds || 0);
            agg.totalNewFollowersAll += Number(s.followersGained || 0);
        });
        agg.avgRevenuePerSession = agg.sessionCount ? agg.totalRevenueAll / agg.sessionCount : 0;
        agg.avgViewsPerSession = agg.sessionCount ? agg.totalViewsAll / agg.sessionCount : 0;
        localStorage.setItem('streams_aggregate', JSON.stringify(agg));
        console.log('Aggregates updated', agg);
        return agg;
    } catch (err) {
        console.error('Error updating aggregates', err);
    }
}

// FPS simulation functions
function startFPSSimulation() {
    if (fpsInterval) clearInterval(fpsInterval);
    fpsInterval = setInterval(() => {
        const fps = Math.floor(Math.random() * (123 - 105 + 1)) + 105;
        const fpsEl = document.getElementById('fpsValue');
        if (fpsEl) fpsEl.textContent = fps;
    }, 1500);
}

function stopFPSSimulation() {
    if (fpsInterval) {
        clearInterval(fpsInterval);
        fpsInterval = null;
    }
}

// Start live flow that requests camera (video only), shows countdown, then enables live UI
async function startLiveWithCountdown() {
    try {
        // Quality constraints mapping
        const qualityConstraints = {
            '720': { width: 1280, height: 720 },
            '1080': { width: 1920, height: 1080 },
            '1440': { width: 2560, height: 1440 },
            '2160': { width: 3840, height: 2160 }
        };
        const selectedQuality = qualityConstraints[streamSettings.quality] || qualityConstraints['1080'];

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: selectedQuality.width },
                height: { ideal: selectedQuality.height },
                frameRate: { ideal: 30 }
            },
            audio: false
        });

        // Assign local stream and attach to video element
        localStream = stream;
        const videoElement = document.getElementById('localVideo');
        if (videoElement) videoElement.srcObject = stream;

        // Hide video placeholder
        const videoPlaceholder = document.getElementById('videoPlaceholder');
        if (videoPlaceholder) videoPlaceholder.classList.add('hidden');

        // Show countdown overlay
        if (countdownOverlay && countdownNumberEl) {
            let count = 5;
            countdownNumberEl.textContent = String(count);
            countdownOverlay.classList.add('active');
            const cd = setInterval(() => {
                count--;
                if (count <= 0) {
                    clearInterval(cd);
                    countdownOverlay.classList.remove('active');
                    // Now enable UI and simulations
                    enableLiveUI();
                } else {
                    countdownNumberEl.textContent = String(count);
                }
            }, 1000);
        } else {
            // Fallback: immediately enable
            enableLiveUI();
        }
    } catch (err) {
        console.error('Camera permission denied or error:', err);
        alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
}
