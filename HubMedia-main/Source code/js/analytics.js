// ==================== PROFESSIONAL CHART LIBRARY ====================
class Chart {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * 2;
        this.canvas.height = rect.height * 2;
        this.ctx.scale(2, 2);
        
        this.width = rect.width;
        this.height = rect.height;
        this.padding = config.padding || { top: 20, right: 20, bottom: 30, left: 40 };
        this.chartWidth = this.width - this.padding.left - this.padding.right;
        this.chartHeight = this.height - this.padding.top - this.padding.bottom;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawGrid(horizontalCount = 5) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#E9ECEF';
        this.ctx.lineWidth = 1;

        // Horizontal Grid
        for (let i = 0; i <= horizontalCount; i++) {
            const y = this.padding.top + (this.chartHeight / horizontalCount) * i;
            this.ctx.moveTo(this.padding.left, y);
            this.ctx.lineTo(this.width - this.padding.right, y);
        }
        
        this.ctx.stroke();
    }

    drawAxes(labels, maxVal) {
        this.ctx.fillStyle = '#6C757D';
        this.ctx.font = '10px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // X Axis Labels
        if (labels) {
            const step = this.chartWidth / (labels.length - 1);
            labels.forEach((label, i) => {
                const x = this.padding.left + i * step;
                if (window.innerWidth < 768 && i % 2 !== 0) return; // Skip label on mobile
                this.ctx.fillText(label, x, this.height - this.padding.bottom + 8);
            });
        }

        // Y Axis Labels
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const val = Math.round(maxVal - (maxVal / steps) * i);
            const y = this.padding.top + (this.chartHeight / steps) * i;
            this.ctx.fillText(val, this.padding.left - 10, y);
        }
    }

    drawAreaChart(data, labels, color = '#5B5FED') {
        this.clear();
        const max = Math.ceil(Math.max(...data) * 1.1); // add 10% headroom
        
        this.drawGrid();
        this.drawAxes(labels, max);

        const step = this.chartWidth / (data.length - 1);
        
        // Draw Fill
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.height - this.padding.bottom);
        
        data.forEach((value, i) => {
            const x = this.padding.left + i * step;
            const y = this.padding.top + this.chartHeight - (value / max) * this.chartHeight;
            this.ctx.lineTo(x, y);
        });
        
        this.ctx.lineTo(this.width - this.padding.right, this.height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left, this.height - this.padding.bottom);
        this.ctx.closePath();
        
        const gradient = this.ctx.createLinearGradient(0, this.padding.top, 0, this.height - this.padding.bottom);
        gradient.addColorStop(0, color + '40'); // 25% opacity
        gradient.addColorStop(1, color + '00'); // 0% opacity
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw Line
        this.ctx.beginPath();
        data.forEach((value, i) => {
            const x = this.padding.left + i * step;
            const y = this.padding.top + this.chartHeight - (value / max) * this.chartHeight;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.bezierCurveTo(
                x - step / 2, this.padding.top + this.chartHeight - (data[i-1] / max) * this.chartHeight,
                x - step / 2, y,
                x, y
            );
        });
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw Points
        this.ctx.fillStyle = '#FFFFFF';
        data.forEach((value, i) => {
            const x = this.padding.left + i * step;
            const y = this.padding.top + this.chartHeight - (value / max) * this.chartHeight;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    drawBarChart(datasets, labels) {
        this.clear();
        const allValues = datasets.flatMap(d => d.values);
        const max = Math.ceil(Math.max(...allValues) * 1.1);
        
        this.drawGrid();
        this.drawAxes(labels, max);

        const groupWidth = this.chartWidth / labels.length;
        const barWidth = groupWidth * 0.3; // 30% of group width
        const spacing = groupWidth * 0.1;

        datasets.forEach((dataset, setIndex) => {
            dataset.values.forEach((value, i) => {
                // Calculate center of group, then offset based on set index
                // Assuming 2 datasets for now
                const groupCenter = this.padding.left + i * groupWidth + groupWidth / 2;
                const offset = setIndex === 0 ? -(barWidth + spacing/2) : (spacing/2);
                
                const x = groupCenter + offset;
                const barHeight = (value / max) * this.chartHeight;
                const y = this.height - this.padding.bottom - barHeight;
                
                this.ctx.fillStyle = dataset.color;
                
                // Draw rounded top bar
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
                this.ctx.fill();
            });
        });
    }

    drawDoughnutChart(data, colors, labels) {
        this.clear();
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.chartWidth, this.chartHeight) / 2;
        const innerRadius = radius * 0.75;
        
        const total = data.reduce((a, b) => a + b, 0);
        let currentAngle = -Math.PI / 2;
        
        data.forEach((value, index) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            
            this.ctx.fillStyle = colors[index];
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw label lines if needed, or simple legend
            currentAngle += sliceAngle;
        });
    }
}

// ==================== DATA ====================
// Mock Data for Professional Charts
const viewsData = {
    daily: [1420, 1680, 2100, 1850, 2400, 2150, 2800],
    weekly: [12500, 14200, 11800, 15600, 18900, 17500, 21000],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

const engagementData = {
    mobile: [65, 55, 80, 45, 70],
    desktop: [45, 35, 60, 25, 50],
    labels: ['Likes', 'Shares', 'Comments', 'Saves', 'Clicks']
};

// ==================== INITIALIZATION ====================
const API_BASE = 'http://localhost:3000';

window.addEventListener('load', async () => {
    // Load real data from backend
    await loadAnalyticsData(7); // default 7 days

    await renderLists();
    initCharts();

    // Chart Periods Toggle
    document.querySelectorAll('.chart-period').forEach(btn => {
        btn.addEventListener('click', function() {
            const btns = document.querySelectorAll('.chart-period');
            btns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update Chart
            const isWeekly = this.textContent === 'Weekly';
            const canvas = document.getElementById('clickChart');
            const chart = new Chart(canvas);
            const data = isWeekly ? viewsData.weekly : viewsData.daily;
            chart.drawAreaChart(data, viewsData.labels, '#5B5FED');
        });
    });

    // Date Selectors
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Get days from button text
            let days = 7;
            if (this.textContent.includes('30')) days = 30;
            else if (this.textContent.includes('7')) days = 7;
            
            loadAnalyticsData(days);
        });
    });

    // Mobile Sidebar Toggle
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.sidebar');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Close sidebar when clicking on a nav link
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    });

    // Export Report (Word)
    const exportBtn = document.querySelector('.btn-download');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportAnalyticsToWord();
        });
    }
});

// Fetch overview data from backend and populate KPI cards
async function loadAnalyticsData(days) {
    try {
        const res = await fetch(API_BASE + `/api/dashboard/overview?days=${days}`, { credentials: 'include' });
        if (!res.ok) {
            console.warn('Failed to fetch analytics data:', res.status);
            return;
        }
        const data = await res.json();
        if (!data.success || !data.overview) return;
        
        const o = data.overview;
        
        // 1. Total Views (profile_views - sum of all views from analytics table, all time)
        const totalViewsEl = document.getElementById('totalViewsValue');
        const totalViewsTrendEl = document.getElementById('totalViewsTrend');
        if (totalViewsEl) totalViewsEl.textContent = String(o.profile_views || 0).toLocaleString();
        if (totalViewsTrendEl) {
            const pct = Number(o.profile_views_pct || 0);
            totalViewsTrendEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
            totalViewsTrendEl.className = 'trend ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
        }
        
        // 2. Avg Revenue Per Session
        const avgRevenueEl = document.getElementById('avgRevenueValue');
        const avgRevenueTrendEl = document.getElementById('avgRevenueTrend');
        const avgRev = Number(o.revenue || 0);
        if (avgRevenueEl) avgRevenueEl.textContent = avgRev.toFixed(2);
        if (avgRevenueTrendEl) {
            const pct = Number(o.revenue_pct || 0);
            avgRevenueTrendEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
            avgRevenueTrendEl.className = 'trend ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
        }
        
        // 3. Total Contents (total_posts - all posts regardless of status)
        const totalContentsEl = document.getElementById('totalContentsValue');
        const totalContentsTrendEl = document.getElementById('totalContentsTrend');
        if (totalContentsEl) totalContentsEl.textContent = String(o.total_posts || 0);
        if (totalContentsTrendEl) {
            const pct = Number(o.total_posts_pct || 0);
            totalContentsTrendEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
            totalContentsTrendEl.className = 'trend ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
        }
        
        // 4. New Followers
        const newFollowersEl = document.getElementById('newFollowersValue');
        const newFollowersTrendEl = document.getElementById('newFollowersTrend');
        if (newFollowersEl) newFollowersEl.textContent = String(o.new_followers || 0).toLocaleString();
        if (newFollowersTrendEl) {
            const pct = Number(o.new_followers_pct || 0);
            newFollowersTrendEl.textContent = `${pct >= 0 ? '+' : ''}${pct}% vs previous`;
            newFollowersTrendEl.className = 'trend ' + (pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral'));
        }
    } catch (e) {
        console.error('Error loading analytics data:', e);
    }
}

// Resize handler
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initCharts, 250); // Debounce
});

// ==================== HELPER FUNCTIONS ====================
function initCharts() {
    // 1. Views Summary (Area Chart)
    const clickCanvas = document.getElementById('clickChart');
    if (clickCanvas) {
        const chart = new Chart(clickCanvas);
        chart.drawAreaChart(viewsData.daily, viewsData.labels, '#5B5FED');
    }

    // 2. Engagement (Bar Chart)
    const engCanvas = document.getElementById('engagementChart');
    if (engCanvas) {
        const chart = new Chart(engCanvas);
        chart.drawBarChart([
            { values: engagementData.mobile, color: '#5B5FED' },
            { values: engagementData.desktop, color: '#E0E1FC' }
        ], engagementData.labels);

        // Render Legend Manually
        const legend = document.getElementById('engagementLegend');
        if (legend) {
            legend.innerHTML = `
                <div class="legend-item"><span class="dot" style="background:#5B5FED"></span> Mobile</div>
                <div class="legend-item"><span class="dot" style="background:#E0E1FC"></span> Desktop</div>
            `;
        }
    }

    // 3. Target (Doughnut) - draw based on current KPI values
    const targetCanvas = document.getElementById('targetChart');
    if (targetCanvas) {
        // use KPI values to render donut via helper
        updateDonutFromKPIs();
    }
}

function renderLists() {
    return (async function() {
        // Fetch real content list from API
        let contents = [];
        try {
            const res = await fetch(API_BASE + '/api/contents', { credentials: 'include' });
            if (res.status === 401) {
                // fallback sample data if not logged in
                contents = [
                    { content_id: 1, title: 'Sample Content A', view_count: 150000, platforms: ['Facebook'], revenue: 24.5 },
                    { content_id: 2, title: 'Sample Content B', view_count: 120000, platforms: ['YouTube'], revenue: 18.2 },
                    { content_id: 3, title: 'Sample Content C', view_count: 200000, platforms: ['TikTok'], revenue: 12.1 },
                    { content_id: 4, title: 'Sample Content D', view_count: 80000, platforms: ['Facebook','YouTube'], revenue: 8.4 }
                ];
            } else {
                const data = await res.json();
                if (data && data.success && Array.isArray(data.contents)) contents = data.contents;
            }
        } catch (e) {
            console.warn('Failed to load contents for analytics:', e);
        }

        // Map to unified format
        const mapped = (contents || []).map(item => ({
            id: item.content_id || item.id,
            title: item.title || ('#' + (item.content_id||item.id||'')).toString(),
            views: Number(item.view_count || item.views || 0),
            platformsRaw: item.platforms || item.platform || '',
            revenue: Number(item.revenue || item.total_revenue || item.revenue_amount || 0)
        }));

        // Top Performing Content: top 3 by views
        const performedList = document.getElementById('performedList');
        if (performedList) {
            const top = mapped.slice().sort((a,b) => b.views - a.views).slice(0,3);
            performedList.innerHTML = top.map(item => {
                const viewsLabel = formatViewsLabel(item.views);
                return `
                    <div class="performed-item">
                        <div class="performed-title">${escapeHtml(item.title)}</div>
                        <div class="performed-stats">
                            <div class="stat-badge gray">Views: ${viewsLabel}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Trending Activities: top 3 contents by revenue with platforms and revenue formatted as $xx.xx
        const trendingList = document.getElementById('trendingList');
        if (trendingList) {
            const byRevenue = mapped.slice().sort((a,b) => (Number(b.revenue)||0) - (Number(a.revenue)||0));
            const pick = byRevenue.slice(0,3);
            trendingList.innerHTML = pick.map(item => {
                const platforms = parsePlatforms(item.platformsRaw).join(', ');
                const revenueLabel = `$${(Number(item.revenue)||0).toFixed(2)}`;
                return `
                    <div class="trending-item">
                        <div class="trending-content">
                            <h4>${escapeHtml(item.title)}</h4>
                            <p>${escapeHtml(platforms)}</p>
                        </div>
                        <div class="trending-right">
                            <div class="trending-value">${revenueLabel}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Update donut chart based on KPI boxes
        updateDonutFromKPIs();
    })();
}

// Helpers
function formatViewsLabel(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(n>=10000?0:1) + 'K';
    return String(n || 0);
}

function parsePlatforms(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); }
        catch (e) { return raw.split(/[,\s]+/).filter(Boolean); }
    }
    return [];
}

function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

// Build donut from KPI numbers and update legend under chart
function updateDonutFromKPIs() {
    const v1 = Number((document.getElementById('totalViewsValue')?.textContent || '').toString().replace(/[^0-9\.]/g,'')) || 0;
    const v2 = Number((document.getElementById('avgRevenueValue')?.textContent || '').toString().replace(/[^0-9\.]/g,'')) || 0;
    const v3 = Number((document.getElementById('totalContentsValue')?.textContent || '').toString().replace(/[^0-9\.]/g,'')) || 0;
    const v4 = Number((document.getElementById('newFollowersValue')?.textContent || '').toString().replace(/[^0-9\.]/g,'')) || 0;

    const values = [v1, v2, v3, v4];
    const total = values.reduce((a,b)=>a+b,0) || 1;
    const labels = ['Total Views','Average Revenue','Total Contents','New Followers'];
    const colors = ['#5B5FED','#00C853','#8E6DF5','#FF9800'];

    // Draw doughnut
    const targetCanvas = document.getElementById('targetChart');
    if (targetCanvas) {
        const chart = new Chart(targetCanvas, { padding: { top:10, right:10, bottom:10, left:10 } });
        chart.drawDoughnutChart(values.map(v=>Math.max(0,Number(v)||0)), colors, labels);
    }

    // Update legend list
    const goalList = document.getElementById('goalList');
    if (goalList) {
        goalList.innerHTML = labels.map((lab, i) => `
            <div class="goal-item">
                <div class="goal-info">
                    <div class="goal-dot" style="background:${colors[i]};width:12px;height:12px;border-radius:6px;margin-right:8px"></div>
                    <span class="goal-name">${lab}</span>
                </div>
                <span class="goal-val">${Math.round((values[i]/total)*100)}%</span>
            </div>
        `).join('');
    }
}

// Generate and download a simple Word (.doc) file containing KPI table
function exportAnalyticsToWord() {
    const entries = [
        { name: 'Total Views', value: document.getElementById('totalViewsValue')?.textContent || '' },
        { name: 'Average Revenue', value: '$' + (document.getElementById('avgRevenueValue')?.textContent || '') },
        { name: 'Total Contents', value: document.getElementById('totalContentsValue')?.textContent || '' },
        { name: 'New Followers', value: document.getElementById('newFollowersValue')?.textContent || '' }
    ];

    const rows = entries.map(e => `
        <tr>
            <td style="padding:8px;border:1px solid #ddd">${e.name}</td>
            <td style="padding:8px;border:1px solid #ddd">${e.value}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Analytics Report</title>
    </head>
    <body>
      <h2>Demo Word Reported</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">${rows}</table>
    </body>
    </html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.doc';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1500);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Simple mock animation logic
    el.textContent = target.toLocaleString(); 
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(confirm('Are you sure you want to logout?')) {
            window.location.href = 'login.html';
        }
    });
}
