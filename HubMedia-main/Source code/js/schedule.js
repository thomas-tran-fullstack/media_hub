// ==================== MODAL INITIALIZATION ====================
// Force modal to start as hidden immediately
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        console.log('[DEBUG] DOMContentLoaded - forced modal to be hidden');
    }
});

// ==================== CALENDAR DATA ====================
const API_BASE = 'http://localhost:3000';
let currentDate = new Date();
let selectedDate = null;
let currentTypeFilter = 'all';
let currentPlatformFilter = 'all';

let events = [];

// Load scheduled contents from backend and map to calendar events
async function loadScheduledFromApi() {
    try {
        const res = await fetch(API_BASE + '/api/contents', { credentials: 'include' });
        if (res.status === 401) {
            // not logged in — keep sample data or empty
            console.warn('Not authenticated — scheduled calendar will show local sample events');
            if (events.length === 0) {
                // keep a small example so calendar isn't empty for unauthenticated users
                // use local-date formatting (avoid toISOString UTC shift)
                const pad = (n) => String(n).padStart(2, '0');
                const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                events = [
                    { id: 1, title: 'Sample Post', date: localDate(new Date()), time: '09:00', type: 'post', platforms: ['Facebook'], description: 'Sample scheduled post' }
                ];
            }
            console.log('[Schedule] Loaded sample events:', events);
            return;
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.contents)) {
            // Map DB contents that are scheduled into calendar events
            events = data.contents
                .filter(c => c.status && c.status.toLowerCase() === 'scheduled' && c.scheduled_at)
                .map(c => {
                    // scheduled_at may be timezone-aware (with 'Z' or offset) or local ('YYYY-MM-DD HH:MM:SS')
                    const scheduledAtStr = String(c.scheduled_at);
                    const pad = (n) => String(n).padStart(2, '0');

                    // Build a Date object that represents the correct local instant
                    let dt;
                    try {
                        // If string includes timezone indicator, let Date parse and convert to local
                        if (/[zZ]$/.test(scheduledAtStr) || /[+\-]\d{2}:?\d{2}$/.test(scheduledAtStr)) {
                            dt = new Date(scheduledAtStr);
                        } else if (scheduledAtStr.includes('T')) {
                            // ISO-like without explicit timezone -> treat parts as local
                            const [datePart, timePart] = scheduledAtStr.split('T');
                            const [y, m, d] = datePart.split('-').map(Number);
                            const [hh, mm, ss] = (timePart || '').split(':').map(Number).concat([0,0,0]);
                            dt = new Date(y, (m||1)-1, d||1, hh||0, mm||0, ss||0);
                        } else {
                            // space-separated 'YYYY-MM-DD HH:MM:SS'
                            const [datePart, timePart] = scheduledAtStr.split(' ');
                            const [y, m, d] = (datePart || '').split('-').map(Number);
                            const [hh, mm, ss] = (timePart || '').split(':').map(Number).concat([0,0,0]);
                            dt = new Date(y, (m||1)-1, d||1, hh||0, mm||0, ss||0);
                        }
                    } catch (e) {
                        dt = new Date(scheduledAtStr);
                    }
                    if (!dt || isNaN(dt.getTime())) dt = new Date(scheduledAtStr);

                    const date = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
                    const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
                    
                    const type = (c.content_type === 'article') ? 'post' : (c.content_type || 'post');
                    // platforms may come as JSON (DB JSON column) or comma-separated string
                    let platformsRaw = c.platforms || c.platform || [];
                    let parsedPlatforms = [];
                    if (Array.isArray(platformsRaw)) parsedPlatforms = platformsRaw;
                    else if (typeof platformsRaw === 'string') {
                        // try JSON parse first, otherwise fallback to splitting
                        try { parsedPlatforms = JSON.parse(platformsRaw); }
                        catch (e) { parsedPlatforms = platformsRaw ? String(platformsRaw).split(/[,\s]+/).filter(Boolean) : []; }
                    } else {
                        parsedPlatforms = [];
                    }

                    return {
                        id: c.content_id,
                        title: c.title || '(No title)',
                        date,
                        time,
                        type,
                        platforms: parsedPlatforms,
                        description: c.description || ''
                    };
                });
            console.log('[Schedule] Loaded events from API:', events);
        } else {
            console.warn('No scheduled contents found in API');
        }
    } catch (err) {
        console.error('Failed to load scheduled contents:', err);
    }
}

// ==================== FILTER FUNCTIONS ====================
function getFilteredEvents() {
    return events.filter(event => {
        try {
            const typeMatch = currentTypeFilter === 'all' || (event.type || 'all') === currentTypeFilter;

            // Normalize platforms into an array of lowercase strings
            let platforms = event.platforms;
            if (!platforms) platforms = [];
            else if (typeof platforms === 'string') {
                try { const parsed = JSON.parse(platforms); platforms = Array.isArray(parsed) ? parsed : String(platforms).split(/[,\s]+/).filter(Boolean); }
                catch (e) { platforms = String(platforms).split(/[,\s]+/).filter(Boolean); }
            }
            if (!Array.isArray(platforms)) platforms = Array.from(platforms || []).map(String);

            const platformMatch = currentPlatformFilter === 'all' || platforms.some(p => String(p).toLowerCase() === String(currentPlatformFilter).toLowerCase());

            return typeMatch && platformMatch;
        } catch (err) {
            console.warn('getFilteredEvents error for event', event, err);
            // on error, include event so UI doesn't hide everything
            return true;
        }
    });
}

function updateStatistics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get filtered events based on current filters
    const filteredEvents = getFilteredEvents();
    
    // Week: Monday to Sunday (same as renderUpcoming)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Add 6 days to get Sunday
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Helper function to convert date string to local date
    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    
    const monthTotal = filteredEvents.filter(event => {
        const eventDate = parseLocalDate(event.date);
        const match = eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        console.log(`[DEBUG] Checking event ${event.date}: eventMonth=${eventDate.getMonth()}, currentMonth=${currentMonth}, match=${match}`);
        return match;
    }).length;
    
    const weekTotal = filteredEvents.filter(event => {
        const eventDate = parseLocalDate(event.date);
        const match = eventDate >= startOfWeek && eventDate <= endOfWeek;
        console.log(`[DEBUG] Week check for ${event.date}: ${eventDate.toDateString()} between ${startOfWeek.toDateString()}-${endOfWeek.toDateString()}, match=${match}`);
        return match;
    }).length;
    
    console.log(`[DEBUG] Month: ${currentMonth}, Year: ${currentYear}, monthTotal: ${monthTotal}, weekTotal: ${weekTotal}`);
    
    document.getElementById('monthTotal').textContent = monthTotal;
    document.getElementById('weekTotal').textContent = weekTotal;
}

// ==================== CALENDAR RENDERING ====================
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    console.log(`[Schedule] renderCalendar for ${year}-${month+1}, events:`, events);
    console.log(`[DEBUG] filteredEvents:`, getFilteredEvents());
    console.log(`[DEBUG] events[0]:`, events[0]);
    
    // Update month display using Intl for locale-aware month names
    const locale = (localStorage.getItem('preferred_lang') || (navigator.language && navigator.language.split('-')[0]) || 'en');
    try {
        const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
        document.getElementById('currentMonth').textContent = fmt.format(new Date(year, month, 1));
    } catch (e) {
        // fallback to simple english when Intl fails
        document.getElementById('currentMonth').textContent = `${month + 1}/${year}`;
    }

    // Localize weekday header names (SUN..SAT) using locale short weekday names
    try {
        const dayEls = document.querySelectorAll('.calendar-header .day-name');
        if (dayEls && dayEls.length === 7) {
            // create date objects for a known week starting on Sunday
            const base = new Date(Date.UTC(2021, 7, 1)); // Sunday Aug 1 2021
            const dayNames = [];
            for (let d = 0; d < 7; d++) {
                const dt = new Date(base);
                dt.setUTCDate(base.getUTCDate() + d);
                const dn = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt);
                dayNames.push(dn);
            }
            dayEls.forEach((el, idx) => el.textContent = dayNames[idx]);
        }
    } catch (e) {
        // ignore localization errors
    }
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true, year, month - 1);
        calendarGrid.appendChild(dayElement);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false, year, month);
        calendarGrid.appendChild(dayElement);
    }
    
    // Next month days
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, true, year, month + 1);
        calendarGrid.appendChild(dayElement);
    }
    
    // Update statistics
    updateStatistics();
    
    // Update upcoming events
    renderUpcoming();
}

function createDayElement(day, isOtherMonth, year, month) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';

    // mark other-month days visually
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    // day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = String(day);
    dayElement.appendChild(dayNumber);

    // highlight today
    const dt = new Date(year, month, day);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (dt.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }

    // Render small event indicators for this date
    const pad = (n) => String(n).padStart(2, '0');
    const dateKey = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    const dayEvents = getFilteredEvents().filter(e => e.date === dateKey);
    if (dayEvents.length > 0) {
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';
        dayEvents.forEach(event => {
            const ev = document.createElement('div');
            ev.className = `calendar-event ${event.type}`;
            ev.textContent = event.title;
            ev.title = `${event.title} - ${event.time}`;
            ev.addEventListener('click', (evnt) => {
                evnt.stopPropagation();
                showEventDetails(event);
            });
            eventsContainer.appendChild(ev);
        });
        dayElement.appendChild(eventsContainer);
    }

    // clicking a day opens the schedule modal with selected date (only for future dates)
    dayElement.addEventListener('click', () => {
        const dt = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Validate date is in future
        if (dt < today) {
            showNotification('Hãy chọn lịch trình ở tương lai', 'error');
            return;
        }
        
        const pad = (n) => String(n).padStart(2, '0');
        selectedDate = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
        openEventModal();
    });

    return dayElement;
}

// ==================== MONTH NAVIGATION ====================
document.getElementById('prevMonth').addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await loadScheduledFromApi();
    renderCalendar();
    renderUpcoming();
});

document.getElementById('nextMonth').addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await loadScheduledFromApi();
    renderCalendar();
    renderUpcoming();
});

document.getElementById('todayBtn').addEventListener('click', async () => {
    currentDate = new Date();
    await loadScheduledFromApi();
    renderCalendar();
    renderUpcoming();
    showNotification('Jumped to today', 'info');
});

// ==================== UPCOMING EVENTS ====================
function renderUpcoming() {
    const upcomingGrid = document.getElementById('upcomingGrid');
    const upcomingNextGrid = document.getElementById('upcomingNextGrid');
    
    if (!upcomingGrid || !upcomingNextGrid) return;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // This week: Monday to Sunday of current week
    const startOfThisWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    
    // If today is Sunday (0), go back 6 days to get Monday of this week
    // If today is Monday (1), go back 0 days to get Monday of this week
    // If today is Tuesday (2), go back 1 day to get Monday of this week, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfThisWeek.setDate(today.getDate() - daysToMonday);
    startOfThisWeek.setHours(0,0,0,0);
    
    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6); // Add 6 days to get Sunday
    endOfThisWeek.setHours(23,59,59,999);
    
    // Next week: Monday to Sunday of next week
    const startOfNextWeek = new Date(startOfThisWeek);
    startOfNextWeek.setDate(startOfThisWeek.getDate() + 7);
    startOfNextWeek.setHours(0,0,0,0);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Add 6 days to get Sunday
    endOfNextWeek.setHours(23,59,59,999);
    
    console.log(`[DEBUG] Week boundaries - Today: ${today.toDateString()}`);
    console.log(`[DEBUG] This Week: ${startOfThisWeek.toDateString()} - ${endOfThisWeek.toDateString()}`);
    console.log(`[DEBUG] Next Week: ${startOfNextWeek.toDateString()} - ${endOfNextWeek.toDateString()}`);
    
    // Get filtered events based on current filters
    const filteredEvents = getFilteredEvents();
    
    // Helper function to convert date string to local date
    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dt = new Date(year, month - 1, day);
        return dt;
    };
    
    // Filter events for this week and next week
    const thisWeekEvents = filteredEvents.filter(event => {
        const ed = parseLocalDate(event.date);
        const match = ed >= startOfThisWeek && ed <= endOfThisWeek;
        console.log(`[DEBUG] This Week check - event: ${event.date}, eventDate: ${ed.toDateString()}, range: ${startOfThisWeek.toDateString()}-${endOfThisWeek.toDateString()}, match: ${match}`);
        return match;
    }).sort((a,b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        return dateA - dateB;
    });
    
    const nextWeekEvents = filteredEvents.filter(event => {
        const ed = parseLocalDate(event.date);
        const match = ed >= startOfNextWeek && ed <= endOfNextWeek;
        console.log(`[DEBUG] Next Week check - event: ${event.date}, eventDate: ${ed.toDateString()}, range: ${startOfNextWeek.toDateString()}-${endOfNextWeek.toDateString()}, match: ${match}`);
        return match;
    }).sort((a,b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        return dateA - dateB;
    });
    
    // Create card template for "No schedule for this week"
    const createNoScheduleCard = () => {
        const card = document.createElement('div');
        card.className = 'upcoming-card no-schedule';
        card.style.gridColumn = '1 / -1';
        card.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; color: #6C757D;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p style="font-size: 14px; margin: 0; color: #6C757D;">No schedule for this week</p>
            </div>
        `;
        return card;
    };
    
    // Render this week
    upcomingGrid.innerHTML = '';
    if (thisWeekEvents.length === 0) {
        upcomingGrid.appendChild(createNoScheduleCard());
    } else {
        thisWeekEvents.forEach(event => {
            const card = document.createElement('div');
            card.className = `upcoming-card ${event.type}`;
            // Parse date string to get local date
            const [year, month, day] = event.date.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            const dateStr = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            card.innerHTML = `
                <div class="upcoming-header">
                    <div class="upcoming-title">${event.title}</div>
                    <div class="upcoming-type ${event.type}">${event.type}</div>
                </div>
                <div class="upcoming-datetime">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${dateStr}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${event.time}</span>
                </div>
                <div class="upcoming-platforms">
                    ${event.platforms.map(p => `<span class="platform-tag">${p}</span>`).join('')}
                </div>
            `;
            
            card.addEventListener('click', () => showEventDetails(event));
            upcomingGrid.appendChild(card);
        });
    }
    
    // Render next week
    upcomingNextGrid.innerHTML = '';
    if (nextWeekEvents.length === 0) {
        upcomingNextGrid.appendChild(createNoScheduleCard());
    } else {
        nextWeekEvents.forEach(event => {
            const card = document.createElement('div');
            card.className = `upcoming-card ${event.type}`;
            // Parse date string to get local date
            const [year, month, day] = event.date.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            const dateStr = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            card.innerHTML = `
                <div class="upcoming-header">
                    <div class="upcoming-title">${event.title}</div>
                    <div class="upcoming-type ${event.type}">${event.type}</div>
                </div>
                <div class="upcoming-datetime">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${dateStr}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${event.time}</span>
                </div>
                <div class="upcoming-platforms">
                    ${event.platforms.map(p => `<span class="platform-tag">${p}</span>`).join('')}
                </div>
            `;
            
            card.addEventListener('click', () => showEventDetails(event));
            upcomingNextGrid.appendChild(card);
        });
    }
}

// ==================== EVENT MODAL ====================
let eventModal = null;
let eventForm = null;
let editingEventId = null;

function openEventModal(event = null) {
    console.log('[DEBUG] openEventModal called with event:', event);
    if (!eventModal) {
        eventModal = document.getElementById('eventModal');
        eventForm = document.getElementById('eventForm');
    }
    
    editingEventId = event ? event.id : null;
    
    // Set min date to today (only allow future dates) using local date (avoid UTC shift)
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const minDate = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    const eventDateInput = document.getElementById('eventDate');
    if (eventDateInput) {
        eventDateInput.min = minDate;
    }
    
    if (event) {
        document.getElementById('modalTitle').textContent = 'Edit Event';
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventTime').value = event.time;
        document.getElementById('eventType').value = event.type;
        document.getElementById('eventDescription').value = event.description || '';
        
        // Set platforms
        document.querySelectorAll('input[name="platform"]').forEach(checkbox => {
            checkbox.checked = event.platforms.includes(checkbox.value.charAt(0).toUpperCase() + checkbox.value.slice(1));
        });
    } else {
        document.getElementById('modalTitle').textContent = 'Schedule New Post';
        if (eventForm) {
            eventForm.reset();
        }
        if (selectedDate) {
            // Validate selected date is in future
            const selectedDateObj = new Date(selectedDate);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            if (selectedDateObj >= todayDate) {
                document.getElementById('eventDate').value = selectedDate;
            } else {
                document.getElementById('eventDate').value = minDate;
            }
        } else {
            document.getElementById('eventDate').value = minDate;
        }
    }
    
    if (eventModal) {
        eventModal.classList.add('active');
        eventModal.style.display = 'flex';
        eventModal.style.opacity = '1';
        console.log('[DEBUG] openEventModal - modal opened');
    }
}

function closeEventModal() {
    if (!eventModal) {
        eventModal = document.getElementById('eventModal');
    }
    if (eventModal) {
        eventModal.classList.remove('active');
        eventModal.style.display = 'none';
        eventModal.style.opacity = '0';
        console.log('[DEBUG] closeEventModal - modal closed');
    }
    editingEventId = null;
    selectedDate = null;
}

// Event listeners will be attached in window.load

// ==================== FORM SUBMISSION ====================
let isSubmitting = false;  // Flag to prevent double submissions

function initializeFormSubmission() {
    if (!eventForm) {
        eventForm = document.getElementById('eventForm');
    }
    
    if (!eventForm) {
        console.warn('[DEBUG] eventForm not found - form submission not initialized');
        return;
    }
    
    // Remove old event listeners by cloning and replacing
    const newForm = eventForm.cloneNode(true);
    eventForm.parentNode.replaceChild(newForm, eventForm);
    eventForm = newForm;
    
    eventForm.addEventListener('submit', async (e) => {
        console.log('[DEBUG] Form submitted');
        e.preventDefault();
        
        // Prevent double submission
        if (isSubmitting) {
            console.log('[DEBUG] Form submission already in progress, ignoring duplicate');
            return;
        }
        isSubmitting = true;
    
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const type = document.getElementById('eventType').value;
        const description = document.getElementById('eventDescription').value;
        
        // Validate date is in future (not past)
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            showNotification('Không thể chọn ngày trong quá khứ. Vui lòng chọn ngày trong tương lai.', 'error');
            isSubmitting = false;
            return;
        }
        
        // Check for duplicate schedule at the same time (only for new events, not edits)
        if (!editingEventId) {
            const isDuplicate = events.some(event => 
                event.date === date && event.time === time
            );
            
            if (isDuplicate) {
                showNotification('Bạn đã có lịch trình cho thời gian này trước đó', 'error');
                isSubmitting = false;
                return;
            }
        }
        
        const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
            .map(cb => cb.value.charAt(0).toUpperCase() + cb.value.slice(1));
        
        console.log('[DEBUG] Form data - title:', title, 'date:', date, 'time:', time, 'type:', type, 'platforms:', platforms);
        
        if (platforms.length === 0) {
            showNotification('Please select at least one platform', 'error');
            isSubmitting = false;
            return;
        }
        
        // Combine date and time into scheduled_at format
        const scheduledAt = `${date} ${time}:00`;
        
        const eventData = {
            id: editingEventId || Date.now(),
            title,
            date,
            time,
            type,
            platforms,
            description
        };
        
        // Map event type to content_type for API
        const contentType = type === 'post' ? 'article' : type;
        
        try {
            let response;
            
            if (editingEventId) {
                // Update existing event - call update API
                response = await fetch(API_BASE + '/api/contents/' + editingEventId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title,
                        description,
                        content_type: contentType,
                        status: 'scheduled',
                        scheduled_at: scheduledAt,
                        platforms: platforms
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('[DEBUG] Event updated successfully:', result);
                    const index = events.findIndex(e => e.id === editingEventId);
                    if (index !== -1) events[index] = eventData;
                    showNotification('Event updated successfully', 'success');
                    // refresh stats UI if available
                    try {
                        const s = await fetch(API_BASE + '/api/dashboard/stats', { credentials: 'include' });
                        if (s.ok) {
                            const js = await s.json();
                            if (js.success && js.stats) {
                                const el = document.getElementById('statTotalPosts');
                                if (el) el.textContent = String(js.stats.total_posts ?? 0);
                            }
                        }
                    } catch (e) { console.warn('refresh stats failed', e); }
                    isSubmitting = false;
                    editingEventId = null;
                } else {
                    console.error('[DEBUG] Update failed:', response.status);
                    showNotification('Failed to update event', 'error');
                    isSubmitting = false;
                    return;
                }
            } else {
                // Create new event - call create API
                response = await fetch(API_BASE + '/api/contents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title,
                        description,
                        content_type: contentType,
                        status: 'scheduled',
                        scheduled_at: scheduledAt,
                        platforms: platforms
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('[DEBUG] Event created successfully:', result);
                    showSuccessPopup();
                    // refresh stats UI if available
                    try {
                        const s = await fetch(API_BASE + '/api/dashboard/stats', { credentials: 'include' });
                        if (s.ok) {
                            const js = await s.json();
                            if (js.success && js.stats) {
                                const el = document.getElementById('statTotalPosts');
                                if (el) el.textContent = String(js.stats.total_posts ?? 0);
                            }
                        }
                    } catch (e) { console.warn('refresh stats failed', e); }
                    
                    // Reload scheduled events from API to sync with database - this will prevent duplicates
                    await loadScheduledFromApi();
                    isSubmitting = false;
                } else {
                    console.error('[DEBUG] Creation failed:', response.status);
                    showNotification('Failed to create event', 'error');
                    isSubmitting = false;
                    return;
                }
            }
        } catch (error) {
            console.error('[DEBUG] API error:', error);
            showNotification('Error saving event: ' + error.message, 'error');
            isSubmitting = false;
            return;
        }
        
        // Reset submission flag and editing state
        isSubmitting = false;
        editingEventId = null;
        
        closeEventModal();
        renderCalendar();
        renderUpcoming();
    });
}

// ==================== EVENT DETAILS ====================
function showEventDetails(event) {
    const detailModal = document.createElement('div');
    detailModal.className = 'modal-overlay active';
    detailModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${event.title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 16px;">
                    <strong style="color: #6C757D; font-size: 12px; text-transform: uppercase;">Type</strong>
                    <div class="upcoming-type ${event.type}" style="display: inline-block; margin-top: 4px;">${event.type}</div>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #6C757D; font-size: 12px; text-transform: uppercase;">Date & Time</strong>
                    <p style="margin-top: 4px; font-size: 14px;">${(function(){
                        const locale = (localStorage.getItem('preferred_lang') || (navigator.language && navigator.language.split('-')[0]) || 'en');
                        try { return new Date(event.date).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
                        catch (e) { return new Date(event.date).toLocaleDateString(); }
                    })()} at ${event.time}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #6C757D; font-size: 12px; text-transform: uppercase;">Platforms</strong>
                    <div style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                        ${event.platforms.map(p => `<span class="platform-tag">${p}</span>`).join('')}
                    </div>
                </div>
                ${event.description ? `
                    <div style="margin-bottom: 16px;">
                        <strong style="color: #6C757D; font-size: 12px; text-transform: uppercase;">Description</strong>
                        <p style="margin-top: 4px; font-size: 14px; color: #495057;">${event.description}</p>
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button class="btn-secondary" onclick="deleteEvent(${event.id})">Delete</button>
                    <button class="btn-primary" onclick="editEvent(${event.id})">Edit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailModal);
}

function editEvent(eventId) {
    document.querySelector('.modal-overlay:last-child').remove();
    const event = events.find(e => e.id === eventId);
    openEventModal(event);
}

function deleteEvent(eventId) {
    // Open custom confirmation modal (we use the shared deleteConfirmModal in the page)
    const deleteModal = document.getElementById('deleteConfirmModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (deleteModal && confirmBtn) {
        // Close any existing detail/modal overlays so the confirm modal is on top
        // BUT: Don't remove eventModal or deleteConfirmModal
        document.querySelectorAll('.modal-overlay').forEach(el => {
            const id = el.id;
            if (id === 'deleteConfirmModal' || id === 'eventModal') return;
            el.remove();
        });

        // Attach an overlay click handler if not already attached
        if (!deleteModal._overlayHandlerAttached) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    closeDeleteConfirmModal();
                }
            });
            deleteModal._overlayHandlerAttached = true;
        }

        // Prepare confirm button with event id and ensure modal is centered and above other UI
        confirmBtn.dataset.eventId = String(eventId);
        deleteModal.style.display = 'flex';
        deleteModal.style.justifyContent = 'center';
        deleteModal.style.alignItems = 'center';
        deleteModal.style.opacity = '1';
        deleteModal.style.zIndex = '9999';
        // ensure content container doesn't float to top-left
        const content = deleteModal.querySelector('.modal-content');
        if (content) {
            content.style.margin = '0 auto';
            content.style.position = 'relative';
            content.style.zIndex = '10000';
        }
        
        // Ensure translate is called so modal content is translated to current language
        if (typeof window.translate === 'function') {
            const lang = localStorage.getItem('preferred_lang') || 'en';
            window.translate(lang);
        }
    } else {
        // Fallback to native confirm if modal not present
        if (!confirm('Are you sure you want to delete this event?')) return;
        // perform deletion immediately
        performDeleteEvent(eventId);
    }
}

// performs the actual delete API call
function performDeleteEvent(eventId) {
    fetch(API_BASE + '/api/contents/' + eventId, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(res => {
        if (res.ok) {
            console.log('[DEBUG] Event deleted successfully from API');
            events = events.filter(e => e.id !== eventId);
            // remove only detail modal overlays, not the eventModal or deleteConfirmModal
            const detailOverlays = document.querySelectorAll('.modal-overlay');
            detailOverlays.forEach(overlay => {
                const id = overlay.id;
                // Don't remove eventModal or deleteConfirmModal
                if (id !== 'eventModal' && id !== 'deleteConfirmModal') {
                    overlay.remove();
                }
            });
            renderCalendar();
            renderUpcoming();
            showNotification('Event deleted successfully', 'success');
        } else {
            console.error('[DEBUG] Delete failed:', res.status);
            showNotification('Failed to delete event', 'error');
        }
    })
    .catch(error => {
        console.error('[DEBUG] Delete error:', error);
        showNotification('Error deleting event: ' + error.message, 'error');
    });
}

// Delegated click handler: if the shared confirm delete button is clicked
// and it carries an `data-event-id`, call performDeleteEvent.
document.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('#confirmDeleteBtn') : (e.target.id === 'confirmDeleteBtn' ? e.target : null);
    if (!btn) return;
    const id = btn.dataset.eventId || btn.getAttribute('data-event-id');
    if (id && typeof performDeleteEvent === 'function') {
        try {
            performDeleteEvent(Number(id));
        } finally {
            const modal = document.getElementById('deleteConfirmModal');
            if (modal) {
                modal.style.display = 'none';
                modal.style.opacity = '0';
            }
        }
    }
});

// Provide local close function so inline onclick handlers work on this page
window.closeDeleteConfirmModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    // clear pending event id
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        delete confirmBtn.dataset.eventId;
    }
    modal.style.display = 'none';
    modal.style.opacity = '0';
};

// ==================== NOTIFICATION SYSTEM ====================
// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.centered-notification');
    if (existing) existing.remove();

    const colors = {
        success: '#00C853',
        error: '#FF5252',
        info: '#00BCD4',
        warning: '#FFB84D'
    };
    
    const notification = document.createElement('div');
    notification.className = 'centered-notification';
    
    // Icon based on type
    let icon = '';
    if (type === 'success') {
        icon = `<div style="
            width: 50px; 
            height: 50px; 
            background: white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <svg viewBox="0 0 24 24" fill="none" stroke="${colors[type]}" stroke-width="3" width="30" height="30">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>`;
    }

    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${type === 'success' ? 'rgba(255, 255, 255, 0.95)' : colors[type]};
        color: ${type === 'success' ? '#333' : 'white'};
        padding: 32px 48px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        font-size: 18px;
        font-weight: 600;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 300px;
        backdrop-filter: blur(8px);
        animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    notification.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not present
    if (!document.getElementById('notification-anim-style')) {
        const style = document.createElement('style');
        style.id = 'notification-anim-style';
        style.textContent = `
            @keyframes popIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    // N - New event
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
            openEventModal();
        }
    }
    
    // Escape - Close modal
    if (e.key === 'Escape') {
        if (eventModal.classList.contains('active')) {
            closeEventModal();
        }
    }
    
    // Arrow keys - Navigate months
    if (e.key === 'ArrowLeft' && e.ctrlKey) {
        document.getElementById('prevMonth').click();
    }
    if (e.key === 'ArrowRight' && e.ctrlKey) {
        document.getElementById('nextMonth').click();
    }
});

// ==================== ANIMATIONS ====================
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

// ==================== FILTER EVENT LISTENERS ====================
const typeFilter = document.getElementById('typeFilter');
const platformFilter = document.getElementById('platformFilter');

if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
        currentTypeFilter = e.target.value;
        renderCalendar();
        renderUpcoming();
    });
}

if (platformFilter) {
    platformFilter.addEventListener('change', (e) => {
        currentPlatformFilter = e.target.value;
        renderCalendar();
        renderUpcoming();
    });
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', async () => {
    console.log('[DEBUG] Window load event fired');
    // Initialize modal references
    eventModal = document.getElementById('eventModal');
    eventForm = document.getElementById('eventForm');
    console.log('[DEBUG] eventModal element:', eventModal);
    console.log('[DEBUG] eventModal has active class?', eventModal?.classList.contains('active'));
    
    // FORCE modal to be closed (in case it has active class for some reason)
    if (eventModal) {
        eventModal.classList.remove('active');
        eventModal.style.display = 'none';
        eventModal.style.opacity = '0';
        console.log('[DEBUG] Forcefully closed eventModal in window.load');
    }
    editingEventId = null;
    selectedDate = null;
    
    await loadScheduledFromApi();
    console.log('[DEBUG] After loadScheduledFromApi, events:', events);
    renderCalendar();
    renderUpcoming();
    
    // Initialize form submission
    initializeFormSubmission();
    
    // Attach event listeners after DOM is ready
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeEventModal();
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeEventModal();
        });
    }
    // expose a handler so i18n.js can notify this file about language changes
    window.onLanguageChanged = function(lang) {
        try {
            // re-render calendar/headers with the new locale
            renderCalendar();
            renderUpcoming();
        } catch (e) {
            console.warn('onLanguageChanged handler failed', e);
        }
    };
    
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) {
                closeEventModal();
            }
        });
    }
    
    // Attach schedulePostBtn listener
    const schedulePostBtn = document.getElementById('schedulePostBtn');
    if (schedulePostBtn) {
        schedulePostBtn.addEventListener('click', () => {
            console.log('[DEBUG] schedulePostBtn clicked inside window.load');
            openEventModal();
        });
        console.log('[DEBUG] schedulePostBtn event listener attached in window.load');
    } else {
        console.warn('[DEBUG] schedulePostBtn not found in window.load');
    }
    // Footer buttons in modal (duplicate controls to ensure visibility)
    const cancelBtnFooter = document.getElementById('cancelBtnFooter');
    const applyBtnFooter = document.getElementById('applyBtnFooter');
    if (cancelBtnFooter) {
        cancelBtnFooter.addEventListener('click', (e) => {
            e.preventDefault();
            closeEventModal();
        });
    }
    if (applyBtnFooter) {
        applyBtnFooter.addEventListener('click', (e) => {
            e.preventDefault();
            // Trigger form submit
            const submit = document.getElementById('submitBtn');
            if (submit) submit.click();
        });
    }
});

// ==================== LOGOUT ====================
const logoutBtnEl = document.getElementById('logoutBtn');
if (logoutBtnEl) {
    logoutBtnEl.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            showNotification('Logging out...', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    });
}

// ==================== SUCCESS POPUP ====================
function showSuccessPopup() {
    const popup = document.getElementById('successPopup');
    popup.classList.add('active');
    
    // Play checkmark animation by re-inserting SVG
    const checkmark = popup.querySelector('.success-checkmark');
    const svg = checkmark.innerHTML;
    checkmark.innerHTML = '';
    setTimeout(() => {
        checkmark.innerHTML = svg;
    }, 10);
}

function closeSuccessPopup() {
    const popup = document.getElementById('successPopup');
    popup.classList.remove('active');
}

const successPopupBtnEl = document.getElementById('successPopupBtn');
if (successPopupBtnEl) successPopupBtnEl.addEventListener('click', closeSuccessPopup);
const successPopupEl = document.getElementById('successPopup');
if (successPopupEl) {
    successPopupEl.addEventListener('click', (e) => {
        if (e.target.id === 'successPopup') closeSuccessPopup();
    });
}

// Navigate to Index page when clicking "View in Index"
document.getElementById('successPopupViewBtn').addEventListener('click', () => {
    window.location.href = 'Index.html';
});
