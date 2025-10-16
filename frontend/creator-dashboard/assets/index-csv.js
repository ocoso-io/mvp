/*
  index.js
  Handles chart initialization and dynamic data population for the dashboard.
*/

// --- Chart.js Global Config ---
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = 'Avenir Next, system-ui, sans-serif';

// --- Module-level state ---
let allPagesData, flatPagesData, aggregatedData, globalDateRange, rankingsData;
let currentDays = 30; // Default time period
let viewsChart, revenueSourcesChart, advertiserQualityChart, subscriptionTrendChart, poolShareTrendChart;

// ---- Collapsing erzwingen ---
(function ensureCollapseCss(){
  if (document.getElementById('collapse-css')) return;
  const style = document.createElement('style');
  style.id = 'collapse-css';
  style.textContent = `
    /* erzwingt das Verstecken auch gegen !important-Regeln */
    tr.page-row.is-collapsed { display: none !important; }
    /* optional: Chevron drehen */
    .site-toggle .chevron { display:inline-block; transition: transform .2s ease; }
    .site-toggle[aria-expanded="false"] .chevron { transform: rotate(-135deg) translateX(1px) translateY(1px); }
  `;
  document.head.appendChild(style);
})();

// --- Site-Toggle-Delegation: genau einmal verdrahten ---
let siteToggleDelegated = false;

function wireSiteToggleDelegationOnce() {
  if (siteToggleDelegated) return;
  siteToggleDelegated = true;

  const table = document.getElementById('page-overview-table');
  if (!table) return;

  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.site-toggle');
    if (!btn || !table.contains(btn)) return;

    e.preventDefault();

    const headerRow = btn.closest('tr.site-header-row');
    const tbody = table.querySelector('tbody');
    const siteName = (headerRow?.dataset.site || '').trim();
    if (!siteName || !tbody) return;

    const selector = `tr.page-row[data-site="${cssEscapeSafe(siteName)}"]`;
    const rows = tbody.querySelectorAll(selector);

    // wenn aktuell expanded=true -> wir wollen kollabieren
    const willCollapse = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!willCollapse));

    if (willCollapse) collapsedSites.add(siteName);
    else collapsedSites.delete(siteName);

    rows.forEach(tr => tr.classList.toggle('is-collapsed', willCollapse));

    const firstRowDisplay = rows[0] ? getComputedStyle(rows[0]).display : '(n/a)';
    console.log('[SITE TOGGLE]', { siteName, rowsFound: rows.length, willCollapse, newExpanded: btn.getAttribute('aria-expanded'), firstRowDisplay });
  }, { passive: true });
}

// --- Chart Initialization Functions ---
function initViewsChart(chartData) {
    const ctx = document.getElementById('viewsChart').getContext('2d');
    if (viewsChart) viewsChart.destroy();
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    viewsChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { color: '#374151' } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function initRevenueSourcesChart(chartData) {
    const ctx = document.getElementById('revenueSourcesChart').getContext('2d');
    if (revenueSourcesChart) revenueSourcesChart.destroy();
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    revenueSourcesChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
        }
    });
}

function initAdvertiserQualityChart(chartData) {
    const ctx = document.getElementById('advertiserQualityChart').getContext('2d');
    if (advertiserQualityChart) advertiserQualityChart.destroy();
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    advertiserQualityChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
        }
    });
}

function initSubscriptionTrendChart(chartData) {
    const ctx = document.getElementById('subscriptionTrendChart').getContext('2d');
    if (subscriptionTrendChart) subscriptionTrendChart.destroy();
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    if (chartData.datasets.length > 1) {
      chartData.datasets[1].yAxisID = 'y1';
    }

    subscriptionTrendChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: { 
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true, 
                    grid: { color: '#374151' },
                    ticks: { callback: function(value) { return Math.round(value); } }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: { callback: function(value) { return Math.round(value); } }
                },
                x: { grid: { color: '#374151' } }
            },
            plugins: { legend: { display: true, position: 'bottom' } }
        }
    });
}

function initPoolShareTrendChart(chartData) {
    const ctx = document.getElementById('poolShareTrendChart').getContext('2d');
    if (poolShareTrendChart) poolShareTrendChart.destroy();
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    poolShareTrendChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#374151' },
                    ticks: {
                        callback: function(value) {
                             if (value >= 1000) return `${value / 1000}K`;
                             return value;
                        }
                    }
                },
                x: { grid: { color: '#374151' } }
            },
            plugins: { 
                legend: { display: true, position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                },
                trendlineLinear: {
                    style: "rgba(156, 163, 175, 0.8)", // --text-secondary
                    lineStyle: "dashed",
                    width: 2,
                }
            }
        }
    });
}


// --- Data Processing and DOM Population ---

/**
 * Parses a single row of a CSV string, handling quoted fields.
 * This parser strips unescaped quotes from fields.
 * @param {string} rowString The string for a single CSV row.
 * @returns {string[]} An array of strings representing the fields.
 */
function parseCsvRow(rowString) {
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < rowString.length; i++) {
        let char = rowString[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            // Don't add the quote to the value unless it's an escaped quote
            if (i < rowString.length - 1 && rowString[i+1] === '"') {
                 currentVal += '"';
                 i++; // Skip next quote
            }
        } else if (char === ';' && !inQuotes) {
            values.push(currentVal.trim());
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal.trim());
    return values;
}


/**
 * Converts CSV text data into a structured JSON object grouped by site name, then page name.
 * @param {string} csvText The raw CSV string.
 * @returns {object} The parsed data in a nested format: { siteName: { pageName: { data } } }.
 */
function csvToJson(csvText) {
    if (csvText.charCodeAt(0) === 0xFEFF) { // Remove BOM
        csvText = csvText.substring(1);
    }

    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    const normalizedCsv = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < normalizedCsv.length; i++) {
        const char = normalizedCsv[i];
        currentLine += char;

        if (char === '"') {
            inQuotes = !inQuotes;
        }

        if (char === '\n' && !inQuotes) {
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
            }
            currentLine = '';
        }
    }
    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }


    if (lines.length < 3) return {};

    const headers = parseCsvRow(lines[0]).map(h => h.trim());
    const dataRows = lines.slice(2);
    const allData = {};

    dataRows.forEach(rowStr => {
        if (!rowStr.trim()) return;

        const rowValues = parseCsvRow(rowStr);
        
        if (rowValues.length !== headers.length) {
            console.warn(`Skipping row due to mismatched column count. Expected ${headers.length}, got ${rowValues.length}.`);
            return;
        }

        const rowObject = headers.reduce((obj, header, index) => {
            if (header) obj[header] = rowValues[index];
            return obj;
        }, {});

        const pageName = rowObject.pageName;
        const siteName = rowObject.siteName;
        if (!pageName || !siteName) return;

        if (!allData[siteName]) {
            allData[siteName] = {};
        }
        if (!allData[siteName][pageName]) {
            allData[siteName][pageName] = {};
            headers.forEach(h => {
                if (h && h !== 'siteName' && h !== 'pageName') {
                    allData[siteName][pageName][h] = [];
                }
            });
        }
        
        headers.forEach(header => {
            if (!header || header === 'siteName' || header === 'pageName') return;

            let value = rowObject[header] || null;

            if (value === null || value === '') {
                allData[siteName][pageName][header].push(null);
                return;
            }
            
            if (typeof value === 'string') {
                value = value.replace(/%/g, '');
            }

            if (header === 'date') {
                const parts = value.split('.');
                if (parts.length === 3) {
                    value = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else {
                    value = null; 
                }
            } else if (header === 'topics') {
                 value = value.split(';').map(t => t.trim().replace(/\n/g, '')).filter(t => t && t.length > 1);
            } else {
                const numValue = (typeof value === 'string') ? parseFloat(value.replace(',', '.')) : parseFloat(value);
                value = isNaN(numValue) ? (value === '' ? null : value) : numValue;
            }
            allData[siteName][pageName][header].push(value);
        });
    });

    return allData;
}

/**
 * Parses the rankings and community CSV data into a structured object.
 * @param {string} csvText The raw CSV string from rankings.csv.
 * @returns {object} A structured object containing ranking and community data.
 */
function parseRankingsCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const data = {
        distribution: [],
        ranking: {},
        underrepresented: [],
        matchmaking: []
    };

    lines.forEach(line => {
        const [type, name, metric, value, demand] = line.split(';');
        if (!type) return;

        switch (type) {
            case 'distribution':
                data.distribution.push({ name, score: parseFloat(value) });
                break;
            case 'ranking':
                if (!data.ranking[name]) {
                    data.ranking[name] = { name };
                }
                data.ranking[name][metric] = parseFloat(value);
                break;
            case 'underrepresented':
                data.underrepresented.push({ name, ratio: parseFloat(value) });
                break;
            case 'matchmaking':
                data.matchmaking.push({ category: name, creator: metric });
                break;
        }
    });
    return data;
}

/**
 * Aggregates data from selected pages over a global date range.
 * @param {object} flatPagesData - The flattened data object with keys for each page.
 * @param {string[]} selectedPages - An array of page names to include in the aggregation.
 * @param {string[]} dateRange - The master array of dates for the x-axis.
 * @returns {object} A single data object with aggregated values.
 */
function aggregateSelectedPages(flatPagesData, selectedPages, dateRange) {
    const aggregationTypes = {
      "revenueDisplay": "sum", "revenuePerformance": "sum", "revenueSubscriptions": "sum",
      "revenueLicencing": "sum", "revenueAIUsage": "sum", "revenue": "sum", "visits": "sum",
      "impressions": "sum", "clicksOCNetwork": "sum", "clicksAd": "sum", "Licenced": "sum",
      "usageAI": "sum", "earningsCNFTlicence": "sum", "newSubscriptions": "sum",
      "promotionsCount": "sum", "OCNetworkImpressions": "sum", "OCNetworkClicks": "sum",
      "OCNetworkRevenueDisplay": "sum", "OCNetworkRevenuePerformance": "sum",
      "OCNetworkRevenueSubscriptions": "sum", "OCNetworkRevenueLicencing": "sum",
      "OCNetworkRevenueAIUsage": "sum",
      "ecpm": "avg", "cpc": "avg", "pageCtr": "avg", "premiumQuality": "avg",
      "standardQuality": "avg", "lowQuality": "avg",
      "topics": "list"
    };
    
    const metrics = Object.keys(aggregationTypes);

    if (!selectedPages || selectedPages.length === 0 || !dateRange || dateRange.length === 0) {
        const emptyData = { date: [] };
        metrics.forEach(metric => { emptyData[metric] = []; });
        return emptyData;
    }

    const sortedDates = dateRange;

    const aggregatedData = { date: sortedDates };
    metrics.forEach(metric => {
        aggregatedData[metric] = [];
    });

    const pageDateMaps = {};
    for (const pageName of selectedPages) {
        pageDateMaps[pageName] = new Map();
        (flatPagesData[pageName]?.date || []).forEach((d, i) => pageDateMaps[pageName].set(d, i));
    }
    
    sortedDates.forEach(date => {
        metrics.forEach(metric => {
            const type = aggregationTypes[metric];
            let sum = 0;
            let count = 0;
            let list = [];

            for (const pageName of selectedPages) {
                const pageData = flatPagesData[pageName];
                if (!pageData) continue;
                
                const dateMap = pageDateMaps[pageName];
                
                if (dateMap.has(date)) {
                    const index = dateMap.get(date);
                    const value = pageData[metric]?.[index];

                    if (value !== undefined && value !== null && value !== '') {
                       if (type === 'sum') {
                           sum += Number(value) || 0;
                       } else if (type === 'avg') {
                           sum += Number(value) || 0;
                           count++;
                       } else if (type === 'list') {
                           if (Array.isArray(value)) {
                               list.push(...value);
                           }
                       }
                    }
                }
            }
            
            if (type === 'sum') {
                aggregatedData[metric].push(sum);
            } else if (type === 'avg') {
                aggregatedData[metric].push(count > 0 ? sum / count : 0);
            } else if (type === 'list') {
                aggregatedData[metric].push(list);
            }
        });
    });

    return aggregatedData;
}


function calculateKpi(data, field, days = 30) {
    const series = data?.[field];
    if (!series || !Array.isArray(series) || series.length === 0) {
        return { value: 0, change: 0 };
    }
    
    const recentDays = Math.min(days, series.length);
    const prevStart = series.length - (recentDays * 2);

    const recentData = series.slice(-recentDays);
    const previousData = prevStart >= 0 ? series.slice(prevStart, -recentDays) : [];

    const recentSum = recentData.reduce((sum, val) => sum + (val || 0), 0);
    const previousSum = previousData.reduce((sum, val) => sum + (val || 0), 0);
    
    let change = 0;
    if (previousSum > 0) {
        change = ((recentSum - previousSum) / previousSum) * 100;
    } else if (recentSum > 0) {
        change = 100; // From zero to something is considered a 100% increase in this context
    }
    
    return { value: recentSum, change: change };
}

function updateKpi(elementId, changeId, value, change, formatter = (v) => v.toLocaleString()) {
    const valueEl = document.getElementById(elementId);
    const changeEl = document.getElementById(changeId);

    if (valueEl) valueEl.textContent = formatter(value);
    if (changeEl) {
        changeEl.textContent = `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`;
        changeEl.className = 'stat-item-change'; // Reset
        changeEl.classList.add(change >= 0 ? 'change-positive' : 'change-negative');
    }
}

function getSlicedChartData(data, days) {
    if (!data) return { labels: [], datasets: [] };
    const sliceStart = Math.max(0, data.date.length - days);
    
    const slicedData = {};
    for (const key in data) {
        if (Array.isArray(data[key])) {
            slicedData[key] = data[key].slice(sliceStart);
        } else {
            slicedData[key] = data[key];
        }
    }
    return slicedData;
}

// ====== Pagination-State (global) ======
let pageOverviewFlat = [];       // flache Liste: [{siteName, pageName, pageData}]
let pageOverviewPage = 1;        // aktuelle Seite (1-based)
let pageOverviewPageSize = 20;   // 20 | 50 | 100
const pageOverviewSelected = new Set(); // hält ausgewählte pageIds (über Seiten)

// ====== Utility: Seite clampen ======
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

// ====== Aus Rohdaten flache Liste bauen ======
function buildPageOverviewFlatList(data){
  const out = [];
  for (const siteName in data){
    const pages = data[siteName] || {};
    for (const pageName in pages){
      out.push({ siteName, pageName, pageData: pages[pageName] });
    }
  }
  return out;
}

// Klapp-Status pro Site über Seitenwechsel hinweg behalten
const collapsedSites = new Set(); // z.B. "herold.biz"

// ====== Footer-Controls (Pagination) bauen ======
function renderPageOverviewFooter(table, totalItems, totalPages){
  const tfoot = table.tFoot || table.createTFoot();
  tfoot.className = 'table-footer';
  tfoot.innerHTML = '';
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 8;
  td.className = 'footer-cell';

  // UI
  td.innerHTML = `
    <div class="pagination-bar" style="display:flex; align-items:center; gap:.75rem; justify-content:flex-start;">
      <label style="display:flex; align-items:center; gap:.35rem;">
        <span>Rows per page:</span>
        <select id="po-page-size" class="ranking-select" style="min-width: auto;">
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>
      <span id="po-page-info">Page ${pageOverviewPage} / ${totalPages} (${totalItems} items)</span>
      <button id="po-prev" class="btn btn-ghost" aria-label="Previous page">‹</button>
      <button id="po-next" class="btn btn-ghost" aria-label="Next page">›</button>
    </div>
  `;

  tr.appendChild(td);
  tfoot.appendChild(tr);

  // Werte setzen + Events
  const sizeSel = td.querySelector('#po-page-size');
  if (sizeSel) {
    sizeSel.value = String(pageOverviewPageSize);
    sizeSel.onchange = () => {
      pageOverviewPageSize = Number(sizeSel.value) || 20;
      pageOverviewPage = 1;
      // Neu zeichnen mit aktuellem Datensatz
      populatePageOverviewTable.__lastData && populatePageOverviewTable(populatePageOverviewTable.__lastData);
    };
  }

  const btnPrev = td.querySelector('#po-prev');
  const btnNext = td.querySelector('#po-next');
  if (btnPrev) btnPrev.onclick = () => {
    pageOverviewPage = clamp(pageOverviewPage - 1, 1, totalPages);
    populatePageOverviewTable.__lastData && populatePageOverviewTable(populatePageOverviewTable.__lastData);
  };
  if (btnNext) btnNext.onclick = () => {
    pageOverviewPage = clamp(pageOverviewPage + 1, 1, totalPages);
    populatePageOverviewTable.__lastData && populatePageOverviewTable(populatePageOverviewTable.__lastData);
  };
}

// ====== Checkbox-State anwenden / updaten ======
function restorePageCheckboxState(rowEl, pageId){
  const cb = rowEl.querySelector('.page-checkbox');
  if (!cb) return;
  cb.checked = pageOverviewSelected.has(pageId);
  cb.addEventListener('change', () => {
    if (cb.checked) pageOverviewSelected.add(pageId);
    else pageOverviewSelected.delete(pageId);
  });
}

// ====== Select-All für sichtbare Seite ======
function wireSelectAllHandler(thead, tbody){
  const master = thead.querySelector('#select-all-pages');
  if (!master) return;

  master.onchange = () => {
    const boxes = tbody.querySelectorAll('.page-checkbox');
    boxes.forEach(cb => {
      cb.checked = master.checked;
      const id = cb.getAttribute('data-page');
      if (id){
        if (master.checked) pageOverviewSelected.add(id);
        else pageOverviewSelected.delete(id);
      }
    });
  };
}

// Safe CSS selector escaping (Polyfill-ish)
function cssEscapeSafe(str){
  if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(str);
  // rudimentär escapen: alle CSS-Sonderzeichen backslashen
  return String(str).replace(/([!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~\s])/g, '\\$1');
}

// ====== Hauptfunktion: Tabelle mit Pagination rendern ======
function populatePageOverviewTable(data) {
  // Merke Input (für Re-Render bei Paging)
  populatePageOverviewTable.__lastData = data;

  const table = document.getElementById('page-overview-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Header
  const headerRow = document.createElement('tr');
  headerRow.classList.add('header-row'); 
  const headers = [
    `<input type="checkbox" id="select-all-pages" class="select-all-pages">`,
    'Site',
    'Page Title',
    'Topics',
    'Revenue',
    'Visits',
    'Impressions',
    'eCPM'
  ];
  headers.forEach((h, index) => {
    const th = document.createElement('th');
    if (index === 0) {
      th.classList.add('header-cell-select');
      th.innerHTML = h;
    } else {
      th.classList.add('header-cell');
      th.textContent = h;
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Anzahl Spalten im Header ermitteln
  const colCount = thead.querySelectorAll('th').length;

  // Flache Liste aufbauen
  pageOverviewFlat = buildPageOverviewFlatList(data);

  // Paging berechnen
  const totalItems = pageOverviewFlat.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageOverviewPageSize));
  pageOverviewPage = clamp(pageOverviewPage, 1, totalPages);

  const startIdx = (pageOverviewPage - 1) * pageOverviewPageSize;
  const endIdx   = Math.min(startIdx + pageOverviewPageSize, totalItems);
  const slice    = pageOverviewFlat.slice(startIdx, endIdx);

  if (!slice.length){
    tbody.innerHTML = `<tr><td class="td-data" colspan="8">No data to display.</td></tr>`;
    renderPageOverviewFooter(table, totalItems, totalPages);
    wireSelectAllHandler(thead, tbody);
    return;
  }

  // Beim Rendern pro Seite: Site-Header nur für Sites, die in dieser Seite vorkommen
  let currentSite = null;
  for (const item of slice){
    const { siteName, pageName, pageData } = item;

  if (currentSite !== siteName) {
    currentSite = siteName;
  
    const isCollapsed = collapsedSites.has(siteName);
    const siteHeaderRow = document.createElement('tr');
    siteHeaderRow.classList.add('site-header-row');
    siteHeaderRow.setAttribute('data-site', siteName);
  
    siteHeaderRow.innerHTML = `
      <th class="site-header-cell" colspan="${colCount}">

        <label class="site-label">
          <input type="checkbox" class="site-checkbox" data-site="${siteName}">
          &nbsp;Site: ${siteName}
        </label>
                <button class="site-toggle" type="button" aria-expanded="${!isCollapsed}" aria-label="Toggle ${siteName}">
          <span class="chevron" aria-hidden="true"></span>
        </button>
      </th>
    `;
    tbody.appendChild(siteHeaderRow);
  }

  let siteToggleDelegated = false;

  function wireSiteToggleDelegationOnce() {
    if (siteToggleDelegated) return;
    siteToggleDelegated = true;
  
    // CSS-Fallback für hartes table-row!important
    if (!document.getElementById('collapse-css')) {
      const style = document.createElement('style');
      style.id = 'collapse-css';
      style.textContent = `
        tr.page-row.is-collapsed { display: none !important; }
        .site-toggle .chevron { display:inline-block; transition: transform .2s ease; }
        .site-toggle[aria-expanded="false"] .chevron { transform: rotate(-135deg) translateX(1px) translateY(1px); }
      `;
      document.head.appendChild(style);
    }
  
    const table = document.getElementById('page-overview-table');
    if (!table) return;
  
    table.addEventListener('click', (e) => {
      const btn = e.target.closest('.site-toggle');
      if (!btn || !table.contains(btn)) return;
  
      e.preventDefault();
      e.stopPropagation();
  
      const headerRow = btn.closest('tr.site-header-row');
      const tbody = table.querySelector('tbody');
      const siteName = (headerRow?.dataset.site || '').trim();
      if (!siteName || !tbody) return;
  
      const selector = `tr.page-row[data-site="${cssEscapeSafe(siteName)}"]`;
      const rows = tbody.querySelectorAll(selector);
  
      const willCollapse = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!willCollapse));
  
      if (willCollapse) collapsedSites.add(siteName);
      else collapsedSites.delete(siteName);
  
      rows.forEach(tr => tr.classList.toggle('is-collapsed', willCollapse));
  
      const firstRowDisplay = rows[0] ? getComputedStyle(rows[0]).display : '(n/a)';
      console.log('[SITE TOGGLE]', { siteName, rowsFound: rows.length, willCollapse, newExpanded: btn.getAttribute('aria-expanded'), firstRowDisplay });
    }, { passive: true });
  }

    // KPIs berechnen (wie gehabt)
    const revenue = (pageData.revenue?.reduce((a,b)=>a+(b||0),0)) || 0;
    const visits = (pageData.visits?.reduce((a,b)=>a+(b||0),0)) || 0;
    const impressions = (pageData.impressions?.reduce((a,b)=>a+(b||0),0)) || 0;
    const ecpm = (() => {
      const vals = (pageData.ecpm || []).filter(v => v != null);
      const sum  = vals.reduce((a,b)=>a+(b||0),0);
      return vals.length ? sum / vals.length : 0;
    })();

    // Topics
    const topicsSet = new Set();
    pageData.topics?.forEach(topicArray =>
      topicArray?.forEach(topic =>
        topicsSet.add(topic.split('–')[1]?.trim() || topic)
      )
    );
    const topicsText = [...topicsSet].slice(0, 3).join(', ');

    // ID stabil & ohne Spaces
    const pageId = `${siteName}-${pageName}`.replace(/\s+/g, '-');

    // Zeile
    const pageRow = document.createElement('tr');
    pageRow.classList.add('page-row');
    pageRow.setAttribute('data-site', siteName);
    pageRow.innerHTML = `
      <td class="td-data-select">
        <input type="checkbox" class="page-checkbox" id="page-${pageId}" data-page="${pageId}" data-site="${siteName}">
      </td>
      <td class="td-data">${siteName}</td>
      <td class="td-data page-title-cell">
        <label for="page-${pageId}">${pageName}</label>
      </td>
      <td class="td-data page-topics">${topicsText}</td>
      <td class="td-data">${formatCurrency(revenue)}</td>
      <td class="td-data">${formatNumber(visits)}</td>
      <td class="td-data">${formatNumber(impressions)}</td>
      <td class="td-data">${formatCurrency(ecpm)}</td>
    `;
    tbody.appendChild(pageRow);
    
    
    
    
    
    // 1) Initial registrieren
const cb = pageRow.querySelector('.page-checkbox');
if (cb) {
  cb.checked = true;                  // sichtbar aktiv
  pageOverviewSelected.add(pageId);   // logisch registriert
}

// 2) Danach bisherigen Zustand anwenden (falls vorhanden)
restorePageCheckboxState(pageRow, pageId);




    
    // nach dem Erzeugen jeder page-row:
    if (collapsedSites.has(siteName)) {
      pageRow.classList.add('is-collapsed');
    } else {
      pageRow.classList.remove('is-collapsed');
    }

  }



tbody.querySelectorAll('tr.site-header-row').forEach(siteRow => {
  const site = siteRow.dataset.site;
  const boxes = tbody.querySelectorAll(
    `tr.page-row[data-site="${cssEscapeSafe(site)}"] .page-checkbox`
  );
  const total = boxes.length;
  let checked = 0;
  boxes.forEach(b => { if (b.checked) checked++; });

  const siteCb = siteRow.querySelector('.site-checkbox');
  if (siteCb) {
    siteCb.checked = total > 0 && checked === total;
    siteCb.indeterminate = checked > 0 && checked < total;
  }
});

const master = thead.querySelector('#select-all-pages');
if (master) {
  const all = tbody.querySelectorAll('.page-checkbox');
  const total = all.length;
  let checked = 0;
  all.forEach(b => { if (b.checked) checked++; });

  master.checked = total > 0 && checked === total;
  master.indeterminate = checked > 0 && checked < total;
}





  // Footer mit Controls
  renderPageOverviewFooter(table, totalItems, totalPages);

  // Select-All (nur sichtbare Seite)
  wireSelectAllHandler(thead, tbody);
}


function populateTopPostsTable(flatPagesData, selectedPages, days) {
    const tableBody = document.getElementById('topPostsTableBody');
    const table = tableBody.closest('table');
    tableBody.innerHTML = '';
    
    // Entferne vorhandenen Footer, falls neu generiert wird
    //const existingFooter = table.querySelector('tfoot.table-footer');
    //if (existingFooter) existingFooter.remove();

    if (!flatPagesData || selectedPages.length === 0) {
        tableBody.innerHTML = `<tr><td class="td-data" colspan="3">No data to display. Select pages to begin.</td></tr>`;
        return;
    }

    const topPosts = selectedPages.map(pageId => {
        const pageData = flatPagesData[pageId];
        if (!pageData) return null;

        const recentDays = Math.min(days, pageData.date.length);
        const revenue = pageData.revenue.slice(-recentDays).reduce((a, b) => a + (b || 0), 0);
        const visits = pageData.visits.slice(-recentDays).reduce((a, b) => a + (b || 0), 0);
        
        const topicsSet = new Set();
        pageData.topics?.forEach(topicArray => topicArray?.forEach(topic => topicsSet.add(topic.split('–')[1]?.trim() || topic)));
        const primaryTopic = [...topicsSet][0] || 'N/A';
        
        const categoryMap = {
            'Technology & Computing': 'Technology & Computing',
            'Artificial Intelligence (AI)': 'Technology & Computing',
            'Cryptocurrency & Blockchain': 'Technology & Computing',
            'Food & Drink': 'Food & Drink',
            'Coffee & Tea': 'Food & Drink',
            'Gadgets': 'Technology & Computing',
            'Mental Health': 'Health & Fitness',
            'Health & Fitness': 'Health & Fitness'
        };
        const category = Object.keys(categoryMap).find(key => primaryTopic.includes(key)) 
                       ? categoryMap[Object.keys(categoryMap).find(key => primaryTopic.includes(key))] 
                       : 'General';

        return {
            title: pageId.split('-')[1], // Extract Page name
            ratio: visits > 0 ? revenue / visits : 0,
            category: category
        };
    }).filter(p => p !== null);

    topPosts.sort((a, b) => b.ratio - a.ratio);

    if (topPosts.length === 0) {
        tableBody.innerHTML = `<tr><td class="td-data" colspan="3">No performance data for the selected period.</td></tr>`;
        return;
    }

    topPosts.forEach(post => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="td-data">${post.title}</td>
            <td class="td-data">${formatCurrency(post.ratio)}</td>
            <td class="td-data">${post.category}</td>
        `;
        tableBody.appendChild(row);
    });

    // --- Footer hinzufügen ---
    //const tfoot = document.createElement('tfoot');
    //tfoot.classList.add('table-footer');
    //tfoot.innerHTML = `
    //    <tr>
    //        <td colspan="8" class="footer-cell"></td>
    //    </tr>
    //`;
    //table.appendChild(tfoot);
}

function populateRankings(data) {
    // Distribution Ranking
    const distributionList = document.getElementById('distributionRankingList');
    distributionList.innerHTML = '';
    data.distribution.sort((a,b) => b.score - a.score).forEach((item, index) => {
        const li = document.createElement('li');
        li.classList.add('ranking-list-item');
        if (item.name === 'Creator Delta') {
            li.classList.add('current-user');
        }
        li.innerHTML = `
            <span class="rank-position">#${index + 1}</span>
            <span class="rank-creator">${item.name}</span>
            <span class="rank-shares">${item.score.toFixed(1)}%</span>
        `;
        distributionList.appendChild(li);
    });

    // Creator Ranking (Initial Population)
    populateCreatorRanking(data, 'Klickrate');

    // Underrepresented Categories
    const underrepresentedList = document.getElementById('underrepresentedCategoriesList');
    underrepresentedList.innerHTML = '';
    data.underrepresented.sort((a, b) => b.ratio - a.ratio).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.name}</span>
            <span class="demand-factor">${item.ratio.toFixed(1)} Demand Ratio</span>
        `;
        underrepresentedList.appendChild(li);
    });

    // Creator Matchmaking
    const matchmakingList = document.getElementById('creatorMatchmakingList');
    matchmakingList.innerHTML = '';
    data.matchmaking.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.category}</span>
            <span class="match-creator">${item.creator}</span>
        `;
        matchmakingList.appendChild(li);
    });
}

function populateCreatorRanking(data, metric) {
    const listEl = document.getElementById('creatorRankingList');
    listEl.innerHTML = '';
    
    const rankingArray = Object.values(data.ranking);
    rankingArray.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));

    const currentUserIndex = rankingArray.findIndex(c => c.name === 'Creator Delta');
    
    const listSize = 11;
    let start = 0;
    
    if (currentUserIndex !== -1) {
        start = Math.max(0, currentUserIndex - Math.floor(listSize / 2));
    }
    
    // Ensure the list doesn't go past the end
    if (start + listSize > rankingArray.length) {
        start = Math.max(0, rankingArray.length - listSize);
    }
    
    const visibleCreators = rankingArray.slice(start, start + listSize);
    
    visibleCreators.forEach((item, index) => {
        const actualRank = rankingArray.indexOf(item) + 1;
        const li = document.createElement('li');
        li.classList.add('ranking-list-item');
        if (item.name === 'Creator Delta') {
            li.classList.add('current-user');
        }
        
        let valueDisplay = '';
        if (metric === 'Klickrate') valueDisplay = `${(item[metric] || 0).toFixed(1)}%`;
        else if (metric === 'Visits') valueDisplay = formatNumber(item[metric] || 0);
        else if (metric === 'Recurring') valueDisplay = `${item[metric] || 0}%`;
        else if (metric === 'Verweildauer') valueDisplay = `${item[metric] || 0}s`;

        li.innerHTML = `
            <span class="rank-position">#${actualRank}</span>
            <span class="rank-creator">${item.name}</span>
            <span class="rank-shares">${valueDisplay}</span>
        `;
        listEl.appendChild(li);
    });
}

function populateTopAiTopics(flatData, selectedPages) {
    const topicCounts = {};
    
    selectedPages.forEach(pageId => {
        const pageData = flatData[pageId];
        if (!pageData || !pageData.topics) return;
        pageData.topics.forEach(dayTopics => {
            if (!dayTopics) return;
            dayTopics.forEach(topic => {
                const cleanTopic = topic.split('–')[1]?.trim() || topic;
                topicCounts[cleanTopic] = (topicCounts[cleanTopic] || 0) + 1;
            });
        });
    });

    const sortedTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 11);

    const listEl = document.getElementById('topAiTopicsList');
    listEl.innerHTML = '';
    sortedTopics.forEach(([topic, count], index) => {
        const li = document.createElement('li');
        li.classList.add('ranking-list-item');
        li.innerHTML = `
             <span class="rank-position">#${index + 1}</span>
             <span class="rank-creator">${topic}</span>
             <span class="rank-shares">${count} mentions</span>
        `;
        listEl.appendChild(li);
    });
}


// --- Central Update Function ---

function updateDashboardFromControls() {
    // 1. Get selected pages from the UI
    const selectedPages = [...document.querySelectorAll('.page-checkbox:checked')].map(cb => cb.dataset.page);

    // 2. Aggregate data for the selected pages over the full date range
    aggregatedData = aggregateSelectedPages(flatPagesData, selectedPages, globalDateRange);
    
    // 3. Get sliced data for the current time period (for charts)
    const chartData = getSlicedChartData(aggregatedData, currentDays);

    // 4. Update KPIs (using the full aggregated data for accurate period-over-period)
    const revenueKpi = calculateKpi(aggregatedData, 'revenue', currentDays);
    const readersKpi = calculateKpi(aggregatedData, 'OCNetworkImpressions', currentDays);
    const trafficKpi = calculateKpi(aggregatedData, 'visits', currentDays);
    const subsKpi = calculateKpi(aggregatedData, 'newSubscriptions', currentDays);
    const poolShareKpi = calculateKpi(aggregatedData, 'OCNetworkImpressions', currentDays);
    
    updateKpi('kpi-revenue-value', 'kpi-revenue-change', revenueKpi.value, revenueKpi.change, formatCurrency);
    updateKpi('kpi-oc-readers-value', 'kpi-oc-readers-change', readersKpi.value, readersKpi.change, formatNumber);
    updateKpi('kpi-ai-traffic-value', 'kpi-ai-traffic-change', trafficKpi.value, trafficKpi.change, formatNumber);
    updateKpi('kpi-subs-value', 'kpi-subs-change', subsKpi.value, subsKpi.change, formatNumber);
    updateKpi('kpi-pool-share-value', 'kpi-pool-share-change', poolShareKpi.value, poolShareKpi.change, formatNumber);
    document.getElementById('revenue-kpi-label').textContent = `Revenue (Last ${currentDays} Days)`;

    // 5. Update Charts
    initViewsChart({
        labels: chartData.date,
        datasets: [
            { 
                label: 'Visits', 
                data: chartData.visits, 
                borderColor: '#3b82f6', 
                tension: 0.4, 
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.2)'
            },
            { 
                label: 'Impressions', 
                data: chartData.impressions, 
                borderColor: '#8b5cf6', 
                tension: 0.4, 
                fill: true,
                backgroundColor: 'rgba(139, 92, 246, 0.2)'
            }
        ]
    });
    
    const totalRevDisplay = chartData.revenueDisplay?.reduce((a, b) => a + b, 0) || 0;
    const totalRevPerf = chartData.revenuePerformance?.reduce((a, b) => a + b, 0) || 0;
    const totalRevSubs = chartData.revenueSubscriptions?.reduce((a, b) => a + b, 0) || 0;
    const totalRevLic = chartData.revenueLicencing?.reduce((a, b) => a + b, 0) || 0;
    const totalRevAi = chartData.revenueAIUsage?.reduce((a, b) => a + b, 0) || 0;

    initRevenueSourcesChart({
        labels: ['Display', 'Performance', 'Subscriptions', 'Licencing', 'AI Usage'],
        datasets: [{
            data: [totalRevDisplay, totalRevPerf, totalRevSubs, totalRevLic, totalRevAi],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ef4444'],
            borderColor: '#141618',     
            borderWidth: 2             
        }]
    });
    
    const totalPremium = chartData.premiumQuality?.reduce((a, b) => a + b, 0) || 0;
    const totalStandard = chartData.standardQuality?.reduce((a, b) => a + b, 0) || 0;
    const totalLow = chartData.lowQuality?.reduce((a, b) => a + b, 0) || 0;

    initAdvertiserQualityChart({
        labels: ['Premium', 'Standard', 'Low'],
        datasets: [{
            data: [totalPremium, totalStandard, totalLow],
            backgroundColor: ['#22c55e', '#3b82f6', '#ef4444'],
            borderColor: '#141618',     
            borderWidth: 2      
        }]
    });

    initSubscriptionTrendChart({
        labels: chartData.date,
        datasets: [
            {
                label: 'New Subscriptions',
                data: chartData.newSubscriptions,
                borderColor: '#22c55e',
                type: 'line',
                yAxisID: 'y',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(34, 197, 94, 0.2)'
            },
            {
                label: 'Revenue from Subscriptions',
                data: chartData.revenueSubscriptions,
                borderColor: '#eab308',
                type: 'line',
                yAxisID: 'y1',
                tension: 0.4,
                fill: false,
                borderDash: [5, 5]
            }
        ]
    });

    initPoolShareTrendChart({
        labels: chartData.date,
        datasets: [{
            label: 'OC Network Impressions',
            data: chartData.OCNetworkImpressions,
            borderColor: '#8b5cf6',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(139, 92, 246, 0.2)'
        }]
    });

    // 6. Update other dynamic modules
    populateTopPostsTable(flatPagesData, selectedPages, currentDays);
    populateTopAiTopics(flatPagesData, selectedPages);
}

// --- Helper Functions ---
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatNumber(value) {
    if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'k';
    }
    return Math.round(value).toLocaleString();
}


// --- Event Listener Setup ---

function setupEventListeners() {
    // Global Time Selector
    const timeSelector = document.getElementById('global-time-selector');
    timeSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            timeSelector.querySelector('.active')?.classList.remove('active');
            e.target.classList.add('active');
            currentDays = parseInt(e.target.dataset.days, 10);
            updateDashboardFromControls();
        }
    });

    // Page Overview Table Checkboxes
    const table = document.getElementById('page-overview-table');
    table.addEventListener('change', (e) => {
        const target = e.target;
        if (target.matches('.page-checkbox, .site-checkbox, #select-all-pages')) {
             if (target.matches('#select-all-pages')) {
                const isChecked = target.checked;
                table.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
            } else if (target.matches('.site-checkbox')) {
                const siteName = target.dataset.site;
                const isChecked = target.checked;
                table.querySelectorAll(`.page-checkbox[data-site="${siteName}"]`).forEach(cb => cb.checked = isChecked);
            }
            
            // Update indeterminate states
            document.querySelectorAll('.site-checkbox').forEach(siteCb => {
                const siteName = siteCb.dataset.site;
                const pageCheckboxes = [...table.querySelectorAll(`.page-checkbox[data-site="${siteName}"]`)];
                const checkedCount = pageCheckboxes.filter(cb => cb.checked).length;
                
                if (checkedCount === 0) {
                    siteCb.checked = false;
                    siteCb.indeterminate = false;
                } else if (checkedCount === pageCheckboxes.length) {
                    siteCb.checked = true;
                    siteCb.indeterminate = false;
                } else {
                    siteCb.checked = false;
                    siteCb.indeterminate = true;
                }
            });

            updateDashboardFromControls();
        }
    });

    // Ranking Dropdown
    document.getElementById('rankingSelect').addEventListener('change', (e) => {
        populateCreatorRanking(rankingsData, e.target.value);
    });
}

// --- Main Initialization Function ---
async function main() {
    try {
        // Fetch and parse both data sources in parallel
        const [performanceResponse, rankingsResponse] = await Promise.all([
            fetch('data-csv.csv'),
            fetch('rankings.csv')
        ]);

        if (!performanceResponse.ok || !rankingsResponse.ok) {
            throw new Error('Failed to fetch data files.');
        }

        const performanceCsvText = await performanceResponse.text();
        const rankingsCsvText = await rankingsResponse.text();
        
        allPagesData = csvToJson(performanceCsvText);
        rankingsData = parseRankingsCsv(rankingsCsvText);
        
        // Flatten data for easier access by pageId
        flatPagesData = {};
        let allDates = new Set();
        for (const siteName in allPagesData) {
            for (const pageName in allPagesData[siteName]) {
                const pageId = `${siteName}-${pageName}`.replace(/\s+/g, '-');
                flatPagesData[pageId] = allPagesData[siteName][pageName];
                allPagesData[siteName][pageName].date.forEach(d => allDates.add(d));
            }
        }
        globalDateRange = [...allDates].sort();
        
        // Populate static and semi-static elements
        populatePageOverviewTable(allPagesData);
        populateRankings(rankingsData);
        wireSiteToggleDelegationOnce();

        // Setup event listeners first
        setupEventListeners();

        // Finally, trigger the initial dashboard render with the correct state
        updateDashboardFromControls();

    } catch (error) {
        console.error("Error initializing dashboard:", error);
        document.body.innerHTML = '<p style="color: red; padding: 2rem;">Error loading dashboard data. Please check the console.</p>';
    }
}

// Run the main function when the DOM is ready
document.addEventListener('DOMContentLoaded', main);