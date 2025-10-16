// index-dynamic.js
// Clean, robust, senior-grade implementation.

// Imports
import Chart from "chart.js/auto";
import { parseISO, subDays, startOfDay, endOfDay, startOfMonth, format as dfFormat } from "date-fns";

// --- GLOBAL STATE ---
let allData = [];
let fieldTypes = {};
let chartInstances = [];
let geoChartInstance = null;
let navReady = false;
let loading = false;

const GEO_CHART_COLORS = [
  "#E2A517", "#78BC24", "#33AA4D", "#169C93",
  "#3D6FEB", "#8F33FF", "#BF25A0", "#E22D36",
];

const CURRENCY = 'USD';          // oder 'USD', falls gewünscht
const LOCALE   = 'en-US';        // Komma Tausender, Punkt Dezimal

// --- HELPERS ---
const parseDate = (dateString) => parseISO(dateString);

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const formatNumber = (value, fractionDigits = 0) =>
  (Number(value) || 0).toLocaleString(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const formatPercent = (value, fractionDigits = 2) =>
  (Number(value) || 0).toLocaleString(LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

function toTitle(key) {
  return String(key)
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// --- CONFIG: JSON-SOURCE ---
function resolveJsonSource() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("source")) return urlParams.get("source"); // ?source=dataX.json

  const thisScript =
    document.currentScript ||
    document.querySelector('script[src*="index-dynamic.js"]');
  if (thisScript && thisScript.dataset.json) return thisScript.dataset.json;

  return "data.json"; // Fallback
}
let jsonSource = resolveJsonSource();

// --- FILTERING ---
function filterDataByTimeframe(data, timeframe, today, customStart, customEnd) {
  // Custom Range
  if (timeframe === "custom" && customStart && customEnd) {
    const start = startOfDay(parseDate(customStart));
    const end = endOfDay(parseDate(customEnd));
    return data.filter((d) => {
      const recordDate = parseDate(d.date);
      return recordDate >= start && recordDate <= end;
    });
  }

  // Presets
  let startDate;
  const endDate = endOfDay(today);

  switch (timeframe) {
    case "1d": {
      const s = startOfDay(subDays(today, 1));
      const e = endOfDay(subDays(today, 1));
      return data.filter((d) => {
        const t = parseDate(d.date);
        return t >= s && t <= e;
      });
    }
    case "7d":
      startDate = startOfDay(subDays(today, 7));
      break;
    case "30d":
      startDate = startOfDay(subDays(today, 30));
      break;
    case "this_month":
      startDate = startOfMonth(today);
      break;
    default:
      return data;
  }

  return data.filter((d) => {
    const t = parseDate(d.date);
    return t >= startDate && t <= endDate;
  });
}

// --- AGGREGATION CORE ---
// table & KPI aggregation (bool => boolean)
function aggregateField(values, fieldName, fieldTypes) {
  const valid = values.filter((v) => v != null);
  if (!valid.length) return 0;

  const type = (fieldTypes?.[fieldName] || "sum").toLowerCase();
  switch (type) {
    case "sum":
      return valid.reduce((a, b) => a + Number(b || 0), 0);
    case "avg":
      return valid.reduce((a, b) => a + Number(b || 0), 0) / valid.length;
    case "bool":
      return valid.some((v) => v === true);
    default:
      return valid.reduce((a, b) => a + Number(b || 0), 0);
  }
}

// Charts sauber abbauen
function resetCharts() {
  try {
    chartInstances.forEach(({ chart }) => chart?.destroy());
  } catch(_) {}
  chartInstances = [];

  if (geoChartInstance) {
    try { geoChartInstance.destroy(); } catch(_) {}
    geoChartInstance = null;
  }
}

// Canvas sicher „neu“ machen (falls Charts hängen bleiben)
function reviveCanvasById(id) {
  const old = document.getElementById(id);
  if (!old) return null;
  const fresh = old.cloneNode(true); // leeres <canvas> mit gleicher id
  old.replaceWith(fresh);
  return fresh.getContext('2d');
}

// chart aggregation (bool => count of true)
function aggregateForChart(values, fieldName, fieldTypes) {
  const valid = values.filter((v) => v != null);
  if (!valid.length) return 0;

  const type = (fieldTypes?.[fieldName] || "sum").toLowerCase();
  const toNum = (v) => Number(v) || 0;

  switch (type) {
    case "sum":
      return valid.reduce((a, b) => a + toNum(b), 0);
    case "avg":
      return valid.reduce((a, b) => a + toNum(b), 0) / valid.length;
    case "bool":
      return valid.filter((v) => v === true).length; // numeric
    default:
      return valid.reduce((a, b) => a + toNum(b), 0);
  }
}

// Formats
function isPercentField(name, fieldTypes) {
  const t = (fieldTypes?.[name] || "").toLowerCase();
  const n = String(name).toLowerCase();
  return t === "avg" && (n.includes("ctr") || n.endsWith("rate") || n.includes("ratio"));
}
function isRevenueField(name) {
  const n = String(name).toLowerCase();
  return (
    n === "revenue" ||
    n === "umsatz"  ||
    n.endsWith("_revenue") ||
    n === "cpc"    ||      // neu
    n === "ecpm"   ||      // neu
    n === "rpm"           // optional: falls RPM auch als Währung
  );
}
function prettyValue(metric, value) {
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (isPercentField(metric, fieldTypes)) return formatPercent(value, 2);
  if (isRevenueField(metric))             return formatCurrency(value);
  const n = Number(value);
  return Number.isInteger(n) ? formatNumber(n, 0) : formatNumber(n, 2);
}

// --- DAILY SERIES FOR CHARTS ---
function buildDailySeries(data, fields) {
  const byDate = new Map(); // date -> rows[]
  for (const r of data) {
    const k = r.date;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(r);
  }

  const dateKeys = [...byDate.keys()].sort(); // ascending
  const labels = dateKeys.map((d) => dfFormat(parseDate(d), "MMM d"));
  const series = Object.fromEntries(fields.map((f) => [f, []]));

  for (const dk of dateKeys) {
    const rows = byDate.get(dk);
    for (const f of fields) {
      const vals = rows.map((r) => r[f]);
      series[f].push(aggregateForChart(vals, f, fieldTypes));
    }
  }
  return { labels, series };
}


// --- UI: KPIs ---
function updateKpiCards(data, metric) {
  // Always use the full dataset for KPI ranges.
  if (!metric) {
    const ordered = Object.keys(fieldTypes).filter(
      (k) => !["date", "pageTitle", "country"].includes(k)
    );
    metric = ordered[0] || "revenue";
  }

  const latestDate =
    data.map((d) => parseDate(d.date)).sort((a, b) => b - a)[0] || new Date();

  const yesterdayData = filterDataByTimeframe(data, "1d", latestDate);
  const last7DaysData = filterDataByTimeframe(data, "7d", latestDate);
  const thisMonthData = filterDataByTimeframe(data, "this_month", latestDate);
  const last30DaysData = filterDataByTimeframe(data, "30d", latestDate);

  const agg = (arr) => aggregateField(arr.map((d) => d[metric]), metric, fieldTypes);

  const totalValue      = agg(data);
  const yesterdayValue  = agg(yesterdayData);
  const last7DaysValue  = agg(last7DaysData);
  const thisMonthValue  = agg(thisMonthData);
  const last30DaysValue = agg(last30DaysData);

  const outTotal = document.querySelector(".hero-revenue-card h2");
  const outTitle = document.querySelector(".hero-revenue-card h5");
  const kpi1 = document.querySelector(".kpi-grid .kpi-card:nth-child(1) p");
  const kpi2 = document.querySelector(".kpi-grid .kpi-card:nth-child(2) p");
  const kpi3 = document.querySelector(".kpi-grid .kpi-card:nth-child(3) p");
  const kpi4 = document.querySelector(".kpi-grid .kpi-card:nth-child(4) p");

  if (outTotal) outTotal.textContent = prettyValue(metric, totalValue);
  if (kpi1) kpi1.textContent = prettyValue(metric, yesterdayValue);
  if (kpi2) kpi2.textContent = prettyValue(metric, last7DaysValue);
  if (kpi3) kpi3.textContent = prettyValue(metric, thisMonthValue);
  if (kpi4) kpi4.textContent = prettyValue(metric, last30DaysValue);
  if (outTitle) outTitle.textContent = `Total ${toTitle(metric)}`;
}

// --- UI: Performance Charts ---
function updatePerformanceCharts(filteredData) {
  if (!chartInstances.length) return;

  const fields = chartInstances.map((c) => c.field);
  const { labels, series } = buildDailySeries(filteredData, fields);

  chartInstances.forEach(({ chart, field }) => {
    chart.data.labels = labels;
    chart.data.datasets[0].data = series[field] || [];
    chart.update();
  });
}

// --- UI: Geo Metric Select (order from fieldTypes) ---
function buildGeoMetricSelect(data, fieldTypes) {
  const sel = document.getElementById("geo-metric-filter");
  if (!sel) return;

  const prev = sel.value;
  const skip = new Set(["date", "Date", "pageTitle", "country"]);
  const list = Object.keys(fieldTypes).filter((k) => !skip.has(k));

  sel.innerHTML = "";
  list.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = toTitle(k);
    sel.appendChild(opt);
  });

  if (list.includes("revenue")) sel.value = "revenue";
  else if (prev && list.includes(prev)) sel.value = prev;
  else if (list.length) sel.value = list[0];
}

// --- UI: Geo Chart + Table with Change ---
function updateGeoChartAndTable(filteredData, metric) {
  const tbody = document.getElementById("geo-table-body");

  // Guards
  if (!filteredData.length) {
    if (geoChartInstance) {
      geoChartInstance.data.labels = [];
      geoChartInstance.data.datasets[0].data = [];
      geoChartInstance.update();
    }
    if (tbody) tbody.innerHTML = "";
    const title = toTitle(metric || "");
    const t1 = document.getElementById("geo-card-title");
    const t2 = document.getElementById("geo-table-metric-header");
    if (t1) t1.textContent = `${title}`;
    if (t2) t2.textContent = title;
    return;
  }

  // current span
  const dates = filteredData.map((d) => parseDate(d.date)).sort((a, b) => a - b);
  const curStart = startOfDay(dates[0]);
  const curEnd = endOfDay(dates[dates.length - 1]);
  const curSpanDays = Math.max(1, Math.round((curEnd - curStart) / 86400000) + 1);

  // previous span
  const prevEnd = endOfDay(subDays(curStart, 1));
  const prevStart = startOfDay(subDays(curStart, curSpanDays));

  const prevRaw = allData.filter((d) => {
    const t = parseDate(d.date);
    return t >= prevStart && t <= prevEnd;
  });

  const aggType = (fieldTypes?.[metric] || "sum").toLowerCase();
  const isBool = aggType === "bool";
  const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
  const cntTrue = (arr) => arr.filter((v) => v === true).length;

  const aggFn = (arr) => {
    const vals = arr.filter((v) => v != null);
    if (!vals.length) return 0;
    if (isBool) return cntTrue(vals);
    if (aggType === "avg") return avg(vals);
    return sum(vals);
  };

  // country -> values
  const curMap = new Map();
  for (const d of filteredData) {
    const c = d.country || "(unknown)";
    if (!curMap.has(c)) curMap.set(c, []);
    curMap.get(c).push(d[metric]);
  }
  const prevMap = new Map();
  for (const d of prevRaw) {
    const c = d.country || "(unknown)";
    if (!prevMap.has(c)) prevMap.set(c, []);
    prevMap.get(c).push(d[metric]);
  }

  // rows with change
  const rows = [];
  for (const [country, arr] of curMap.entries()) {
    const curVal = aggFn(arr);
    const prevVal = aggFn(prevMap.get(country) || []);
    const change = prevVal > 0 ? (curVal - prevVal) / prevVal : null;
    rows.push({ country, curVal, prevVal, change });
  }

  rows.sort((a, b) => b.curVal - a.curVal);
  const top = rows.slice(0, 5);

  // Donut (half)
  if (geoChartInstance) {
    geoChartInstance.data.labels = top.map((r) => r.country);
    geoChartInstance.data.datasets[0].data = top.map((r) => r.curVal);
    geoChartInstance.update();
  }

  // Table
  if (tbody) {
    tbody.innerHTML = "";
    top.forEach((r, i) => {
      const hasCh = r.change !== null && isFinite(r.change);
      const cls = hasCh ? (r.change >= 0 ? "change-positive" : "change-negative") : "";
      const icon = hasCh ? (r.change >= 0 ? "▲" : "▼") : "—";
      const txt = hasCh ? formatPercent(Math.abs(r.change), 0) : '—';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="color-dot" style="background-color:${
          GEO_CHART_COLORS[i % GEO_CHART_COLORS.length]
        }"></span>${r.country}</td>
        <td style="text-align: center;">${prettyValue(metric, r.curVal)}</td>
        <td class="change-indicator ${cls}" style="text-align: right;">${icon} ${txt}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Headings
  const title = toTitle(metric);
  const t1 = document.getElementById("geo-card-title");
  const t2 = document.getElementById("geo-table-metric-header");
  if (t1) t1.textContent = `${title}`;
  if (t2) t2.textContent = title;
}

// --- UI: Page Table ---
function collectTableColumns(rows, fieldTypes) {
  // Order is controlled by fieldTypes.
  // Always put pageTitle first. Skip date/country. Keep all defined fields.
  const skip = new Set(["date", "Date", "country"]);
  const ordered = Object.keys(fieldTypes).filter((k) => !skip.has(k));
  return ["pageTitle", ...ordered];
}

function updatePageTable(filteredRawData) {
  const table = document.querySelector(".page-table-card table");
  if (!table) return;

  const theadTr = table.querySelector("thead tr");
  const tbody = document.getElementById("page-table-body");
  if (!theadTr || !tbody) return;

  // Helper: Footer setzen
  const setFooter = (colspan, text = "") => {
    const tfoot = table.tFoot || table.createTFoot();
    tfoot.className = "table-footer";
    tfoot.innerHTML = ""; // reset
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = Math.max(1, colspan);
    td.className = "footer-cell";
    /*td.textContent = text;*/
    tr.appendChild(td);
    tfoot.appendChild(tr);
  };

  tbody.innerHTML = "";
  if (!filteredRawData.length) {
    theadTr.innerHTML = "";
    return;
  }

  const columns = collectTableColumns(filteredRawData, fieldTypes);
  theadTr.innerHTML = columns.map((col) => `<th class="header-cell">${toTitle(col)}</th>`).join("");

  // group by pageTitle
  const groups = new Map();
  for (const row of filteredRawData) {
    const key = row.pageTitle || "(no title)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  for (const [title, rows] of groups.entries()) {
    const tds = columns
      .map((col) => {
        if (col.toLowerCase() === "pagetitle") return `<td class="td-data">${title}</td>`;
        const vals = rows.map((r) => r[col]);
        const agg = aggregateField(vals, col, fieldTypes);
        return `<td class="td-data">${prettyValue(col, agg)}</td>`;
      })
      .join("");

    const tr = document.createElement("tr");
    tr.innerHTML = tds;
    tbody.appendChild(tr);
  }
  
    // Footer setzen (Beispieltext: Anzahl Gruppen/Zeilen)
  setFooter(columns.length, ``);
}

// --- INIT CHARTS ---
function initializeCharts(fieldTypes) {
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: "#fff", callback: (value) => formatNumber(value), },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      x: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
    plugins: { legend: { display: false } },
    interaction: { intersect: false, mode: "index" },
    elements: { point: { radius: 0, hitRadius: 10, hoverRadius: 4 } },
  };

  const container = document.querySelector(".performance-grid");
  if (!container) return;
  container.innerHTML = "";

  const fields = Object.keys(fieldTypes).filter(
    (f) => !["date", "pageTitle", "country"].includes(f)
  );

  fields.forEach((field) => {
    const canvasId = `${field}-chart`;

    const item = document.createElement("div");
    item.classList.add("performance-item");
    item.innerHTML = `
      <h5>${toTitle(field)}</h5>
      <div class="chart-wrapper">
        <canvas id="${canvasId}" class="performance-chart"></canvas>
      </div>
    `;
    container.appendChild(item);

    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: field,
          data: [],
          borderColor: "#E2A517",
          backgroundColor: "rgba(226,165,23,0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.4, // smooth
        }],
      },
      options,
    });

    chartInstances.push({ field, chart });
  });

  // Geo Chart (half donut)
  const geoCtx = reviveCanvasById("geoChart");  // <<< statt getContext(...)
  if (geoCtx) {
    geoChartInstance = new Chart(geoCtx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [{ data: [], backgroundColor: GEO_CHART_COLORS, borderWidth: 0 }],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false } },
        circumference: 180,
        rotation: -90,
        cutout: "70%",
      },
    });
  }
}



// --- EVENTS ---
function setupEventListeners() {
  const timeframeFilter = document.getElementById("timeframe-filter");
  const geoMetricFilter = document.getElementById("geo-metric-filter");
  const startDateFilter = document.getElementById("start-date-filter");
  const endDateFilter = document.getElementById("end-date-filter");

  if (timeframeFilter) {
    timeframeFilter.addEventListener("change", () => {
      if (startDateFilter) startDateFilter.value = "";
      if (endDateFilter) endDateFilter.value = "";
      updateAllDetails();
    });
  }

  if (geoMetricFilter) {
    geoMetricFilter.addEventListener("change", () => {
      updateAllDetails();
    });
  }

  const dateHandler = () => {
    if (!startDateFilter || !endDateFilter) return;
    if (startDateFilter.value && endDateFilter.value) {
      if (timeframeFilter) timeframeFilter.value = "custom";
      updateAllDetails();
    }
  };

  if (startDateFilter) {
    startDateFilter.addEventListener("input", dateHandler);
    startDateFilter.addEventListener("change", dateHandler);
  }
  if (endDateFilter) {
    endDateFilter.addEventListener("input", dateHandler);
    endDateFilter.addEventListener("change", dateHandler);
  }
}

let listenersReady = false;
function setupEventListenersOnce() {
  if (listenersReady) return;
  setupEventListeners();
  listenersReady = true;
}

// --- UPDATE ALL ---
function updateAllDetails() {
  const tf = document.getElementById("timeframe-filter")?.value || "7d";
  const geoMetric = document.getElementById("geo-metric-filter")?.value;
  const startDate = document.getElementById("start-date-filter")?.value;
  const endDate = document.getElementById("end-date-filter")?.value;

  const latestDate =
    allData.map((d) => parseDate(d.date)).sort((a, b) => b - a)[0] || new Date();

  const filteredRaw = filterDataByTimeframe(allData, tf, latestDate, startDate, endDate);

  // KPIs always on full dataset, but for the selected metric.
  updateKpiCards(allData, geoMetric);

  // Details on filtered
  updatePerformanceCharts(filteredRaw);
  updateGeoChartAndTable(filteredRaw, geoMetric);
  updatePageTable(filteredRaw);
}

function setActiveNav(source) {
  const sidebar = document.querySelector('.dashboard-sidebar');
  if (!sidebar) return;

  // bisherige Markierung entfernen
  sidebar.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));

  // passenden Link finden
  let link = null;
  try {
    // CSS.escape ist sicherer, falls source Sonderzeichen hat
    link = sidebar.querySelector(`a[data-source="${CSS.escape(source)}"]`);
  } catch (_) {
    link = sidebar.querySelector(`a[data-source="${source}"]`);
  }

  // WICHTIG: Wenn (noch) kein Link vorhanden → NICHT auf den ersten Eintrag fallen!
  if (!link) return;

  // markieren (Fallback: ersten Eintrag aktivieren)
  const target = link ? (link.closest('.nav-item') || link) : sidebar.querySelector('.nav-item');
  if (target) {
    target.classList.add('active');
        console.log('RUFEN', target);
    updateHeadlineFromNav(target); // <- hier Headline setzen
  }
}


// Hilfsfunktion: leitet Titel/Subtitel aus dem aktiven Nav-Item ab
function updateHeadlineFromNav(target) {
  console.log('HOEREN');
    
  // ⬇️ Headline direkt aus dem geklickten Link übernehmen
  const h = document.getElementById('page-headline');
  if (h) h.textContent = target.textContent.trim();
  else console.warn('Headline element not found – check selector / add id="page-headline"');
}



function waitForSidebarAndActivate(source, {timeout=3000} = {}) {
  const start = performance.now();

  return new Promise((resolve) => {
    const trySet = () => {
      // ist der Link inzwischen da?
      const sel = `a[data-source="${source}"]`;
      const byEsc = (() => {
        try { return document.querySelector(`a[data-source="${CSS.escape(source)}"]`); }
        catch { return null; }
      })();
      const link = byEsc || document.querySelector(sel);

      if (link) {
        setActiveNav(source);
        resolve(true);
        return;
      }

      if (performance.now() - start > timeout) {
        resolve(false); // Sidebar kam nicht rechtzeitig, kein Fallback mehr!
        return;
      }
      requestAnimationFrame(trySet);
    };
    trySet();
  });
}

function ensureInitialHistoryState(source) {
  const usp = new URLSearchParams(location.search);
  const url = `${location.pathname}?source=${encodeURIComponent(source)}`;
  if (!usp.has('source')) {
    history.replaceState({ source }, url);
  } else {
    history.replaceState({ source }, location.href);
  }
}







function onNavClick(e) {
  const link = e.target.closest('.dashboard-sidebar a[data-source]');
  if (!link) return;

  e.preventDefault();
  const source = link.dataset.source;
  if (!source) return;


  const label = (link.innerText || link.textContent || '').trim();

  // 👇 Minimaler Log – zeigt dir sofort, was genommen wird
  console.log('[NAV CLICK]', { label, source, link });

  // URL & State aktualisieren
  const newUrl = `${location.pathname}?source=${encodeURIComponent(source)}`;
  history.pushState({ source }, "", newUrl);

  // sofort visuell markieren
  setActiveNav(source);

  // Daten laden
  if (source !== jsonSource) {
    jsonSource = source;
    main();
  }
}

function onPopState(e) {
  const src = e.state?.source;
  if (!src) return;
  
    // ⬇️ passenden Link suchen und Headline setzen
  //const link = document.querySelector(`.dashboard-sidebar a[data-source="${src}"]`)
  //          || document.querySelector(`.dashboard-sidebar a[data-source$="${src.split('/').pop()}"]`);
            
  //const link = document.querySelector(`.dashboard-sidebar a[data-source="${src}"]`);
  //const label = (link?.innerText || link?.textContent || '').trim();

  //console.log('[POPSTATE]', { label, source: src, link });     
         
  //const h = document.getElementById('page-headline');
  //if (h && link) h.textContent = link.textContent.trim();
  
  
  setActiveNav(src);
  if (src !== jsonSource) {
    jsonSource = src;
    main();
  }
}

function setupNavigationOnce() {
  if (navReady) return;
  document.addEventListener('click', onNavClick);  // Delegation → funktioniert auch nach HTML-Injection
  window.addEventListener('popstate', onPopState);
  navReady = true;
}


// --- MAIN ---
async function main() {
  if (loading) return;     // einfache Sperre
  loading = true;
  try {
    const response = await fetch(jsonSource, { cache: "no-cache", credentials: "omit" });
    if (!response.ok) throw new Error("Failed to load " + jsonSource);

    const json = await response.json();

    // Expect: { fieldTypes: {...}, records: [...] }
    // If fieldTypes missing, infer types + order from first record.
    fieldTypes = json.fieldTypes || inferFieldTypes(json.records?.[0] || {});
    allData = json.records || [];

    resetCharts();
    initializeCharts(fieldTypes);
    setupEventListenersOnce();
    buildGeoMetricSelect(allData, fieldTypes);

    // Initial KPI render on full dataset.
    updateKpiCards(allData, document.getElementById("geo-metric-filter")?.value);

    // Default timeframe
    const tf = document.getElementById("timeframe-filter");
    if (tf) tf.value = "7d";

    updateAllDetails();
    setActiveNav(jsonSource);   
    
  } catch (err) {
    console.error("Init failed:", err);
  } finally {
    loading = false;
  }
}

// --- INFERRING FIELD TYPES (fallback) ---
function inferFieldTypes(sample) {
  // Keeps key order from the sample object.
  const types = {};
  for (const k of Object.keys(sample)) {
    if (["date", "pageTitle", "country"].includes(k)) {
      types[k] = "meta";
      continue;
    }
    const v = sample[k];
    if (typeof v === "boolean") {
      types[k] = "bool";
    } else if (typeof v === "number") {
      // naive: ratios likely avg if key hints
      const kl = k.toLowerCase();
      if (kl.includes("ctr") || kl.includes("ratio") || kl.endsWith("rate")) {
        types[k] = "avg";
      } else {
        types[k] = "sum";
      }
    } else {
      types[k] = "sum";
    }
  }
  return types;
}

// --- BOOT ---
//document.addEventListener("DOMContentLoaded", main);
//document.addEventListener("DOMContentLoaded", () => {
//  setupNavigationOnce();
//  setActiveNav(jsonSource); // initial
//  main();
//});


document.addEventListener("DOMContentLoaded", async () => {
  setupNavigationOnce();

  // jsonSource wurde oben via resolveJsonSource() gesetzt
  ensureInitialHistoryState(jsonSource);

  await main(); // lädt Daten, baut Charts, baut Selects etc.

  // Jetzt Sidebar-Aktivierung nachreichen, sobald die Links existieren
  await waitForSidebarAndActivate(jsonSource);
});

