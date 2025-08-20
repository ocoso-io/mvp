/**
 * multi-table.js – readable version (v5)
 * ------------------------------------
 *  ▸ Erstellt beliebig viele interaktive Tabellen pro Seite.
 *  ▸ Jede Tabelle lädt ihre JSON-Quelle aus data‑attribute.
 *  ▸ Enthält Sortierung, Filter, Pagination und Hover‑Chart.
 *
 *  Abhängigkeit: Chart.js ≥ 4 (vor diesem Skript laden!)
 *  Lizenz: MIT – frei nutzbar, aber bitte Verweis belassen.
 */
(() => {
  /* -------------------------------------------------------------------- *
   * 1. Hilfsfunktionen                                                    *
   * -------------------------------------------------------------------- */

  /**
   * Formt die Roh‑JSON zu handlichen Asset‑Objekten.
   * Zusammenfassen nach (Asset_ID, Category, Monetization, Type).
   */
  function prepareData(rawRecords) {
    const grouped = {};

    rawRecords.forEach(rec => {
      const key = `${rec.Asset_ID}_${rec.Category}_${rec.Monetization}_${rec.Type || 'n/a'}`;
      const revCols = Object.keys(rec).filter(c => c.startsWith('Rev_')).sort();

      // Erstanlage des Aggregat‑Objekts
      if (!grouped[key]) {
        grouped[key] = {
          Asset_ID:      rec.Asset_ID,
          Topics:        rec.Category,
          Monetization:  rec.Monetization,
          Type:          rec.Type || 'n/a',
          Start_Date:    null,
          Volume:        0,
          revenueSeries: revCols.map(col => ({
            date:  col.slice(4),      // "Rev_2024-05" → "2024-05"
            value: Number(rec[col])
          }))
        };
      }

      // Aggregation: Volumen & Start‑Datum
      revCols.forEach(col => {
        const value = Number(rec[col]);
        const date  = col.slice(4);

        if (value > 0 && (!grouped[key].Start_Date || date < grouped[key].Start_Date)) {
          grouped[key].Start_Date = date;
        }
        grouped[key].Volume += value;
      });
    });

    return Object.values(grouped);
  }

  /** Füllt eine <select> mit Options (einfacher Helfer). */
  const fillSelect = (selectEl, values) => {
    values.forEach(v => selectEl.append(new Option(v, v)));
  };

  function computeField(row, col){
    const c = col.computed;
    if(!c) return row[col.field];            // nichts zu tun
  
    const re = new RegExp('^' + c.match.replace('*', '.*') + '$');
    const values = Object.keys(row)
          .filter(k => re.test(k))
          .map(k => Number(row[k]) || 0);
  
    switch(c.op){
      case 'sum'  : return values.reduce((a,b)=>a+b,0);
      case 'avg'  : return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
      case 'min'  : return Math.min(...values);
      case 'max'  : return Math.max(...values);
      case 'count': return values.length;
      default     : return 0;
    }
  }

  /* -------------------------------------------------------------------- *
   * 2. DataTable‑Klasse                                                   *
   * -------------------------------------------------------------------- */

  class DataTable {
    /**
     * @param {HTMLElement} wrapper  <div class="dt-wrapper"> mit einer Tabelle.
     */
    constructor(wrapper) {
      this.wrapper = wrapper;

      /* --- DOM-Referenzen -------------------------------- */
      this.table = wrapper.querySelector('table.data-table');
      this.tbody = this.table.querySelector('tbody');

      /* ––– Dom‑Cache ––– */
      const $ = sel => wrapper.querySelector(sel);
      this.dom = {
        tbody:            $('tbody'),
        filterTopic:      $('#filterTopic'),
        filterMonetization: $('#filterMonetization'),
        filterType:       $('#filterType'),
        pagerPrev:        $('#pagePrev'),
        pagerNext:        $('#pageNext'),
        pagerInfo:        $('#pageInfo'),
        rowsPerPage:      $('#rowsPerPage')
      };

      // State‐Objekt in der Klasse
      this.sortState = { key: null, dir: 0 };   // 0 = unsortiert, 1 = ↑, −1 = ↓

      /* ––– Daten‑State ––– */
      this.allData      = [];
      this.filteredData = [];
      this.sortState    = { key: null, dir: 0 };   // dir: 0 none | 1 asc | -1 desc
      this.pageIndex    = 0;
      this.rowsPerPage  = Number(this.dom.rowsPerPage.value);

      /* ––– Initialisierung ––– */
      //this.bindEvents();
      this.initOverlay();
      this.loadJSON();

      /* Für Debug zwecks direktem Zugriff im DevTools */
      wrapper.__dt = this;
    }


    buildTableSkeleton(){
      /* thead anlegen, falls noch nicht vorhanden */
      let thead = this.table.querySelector('thead');
      if(!thead){
        thead = document.createElement('thead');
        this.table.prepend(thead);
      }
      thead.innerHTML = '';              // reset
    
      /* Kopfzeile */
      const hr = document.createElement('tr');
      hr.className = 'header-row';
    
      /* pro Spalte ------------------------------------------------------------------ */
      this.columns.forEach(col=>{
        /* ---- Header-Cell ---------------------------------------------------------- */
        const th = document.createElement('th');
        th.className = 'header-cell';
        if (col.sortable)   th.dataset.sortKey = col.field;
        
        /* eindeutige ID, falls Select benötigt wird */
        const selId = `filter_${col.field}`;
        
        const sortIcons = col.sortable ? `
                          <span class="sort-icon-container">
                            <img src="img/sort-icons-white-inactive.png" class="sort-icon neutral"/>
                            <img src="img/sort-icons-white-down.png"      class="sort-icon up"   style="display:none"/>
                            <img src="img/sort-icons-white-up.png"        class="sort-icon down" style="display:none"/>
                          </span>` : '';
        
        /* Sort-Icon-Block (wie Vorlage) */
        let html = `
          <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;">
          ${sortIcons}
          <label for="${selId}"><span style="white-space:nowrap;">${col.label}</span></label>
          </span>`;
    
        /* Dropdown, falls filter.type==='select' */
        if (col.filter?.type === 'select'){
          html += `
            <div style="height:var(--px-10)">&nbsp;</div>
            <select class="selector" id="${selId}">
              <option value="">All</option>
            </select>`;
        }
    
        th.innerHTML = html;
        hr.appendChild(th);
    
        /* Dom-Map für späteres Befüllen + Event */
        if (col.filter?.type === 'select'){
          this.dom[selId] = th.querySelector(`#${selId}`);
        }
      });
    
      thead.append(hr);
      
      /* 2. ---------- FOOTER anlegen ------------------------- */
      let tfoot = this.table.querySelector('tfoot');
      if (!tfoot){
        tfoot = document.createElement('tfoot');
        tfoot.className = 'table-footer';
        this.table.appendChild(tfoot);        // hängt <tfoot> hinter <tbody> an
      }
    
      /* immer neu aufbauen – falls Spaltenzahl wechselte */
      tfoot.innerHTML = `
        <tr class="table-footer" >
          <td class="table-footer" colspan="${this.columns.length}"></td>
        </tr>`;
    }





    /* --------------------------------------------------- */
    /* 2.1 Daten laden & vorbereiten                       */
    /* --------------------------------------------------- */

    loadJSON() {
      const src = this.wrapper.dataset.source;

      if (!src) return console.error('data-source fehlt am Wrapper');

      fetch(src)
        .then(r => r.json())
        .then(json => {
          console.log('RAW', src, json);
          /* ---------- Spalten bestimmen ------------------------ */
          if (Array.isArray(json.columns) && json.columns.length) {
            // Normale Route
            this.columns = json.columns.slice();
          } else {
            // Fallback → Keys des ersten Datensatzes
            const first = json.data?.[0] || {};
            this.columns = Object.keys(first)
              .filter(k => !k.startsWith('Rev_'))       // Messreihen ausblenden
              .map(k => ({
                field: k,
                label: k.replace(/_/g, ' ').toUpperCase(),
                sortable: true
              }));
            console.warn('⚠️  columns fehlten – automatisch generiert:', this.columns);
          }
        
          this.tools   = json.tools || [          // Fallback auf Standard-Icons
            {src:'img/icon-eye.png',   cls:'chart-trigger', alt:'chart'},
            {src:'img/icon-edit.png',  cls:'',              alt:'edit' },
            {src:'img/icon-trash.png', cls:'',              alt:'delete'}
          ];        
        
          //this.columns = json.columns.slice();
          this.buildTableSkeleton();        // Header einsetzen
          
          /* 2 – Daten übernehmen */
          this.allData = (json.data || []).map((o, i) => ({ ...o, __seq: i }));
          this.filteredData = this.allData.slice();
        
          /* 3 – Filter-Optionen erzeugen */
          this.buildFilters();
        
          /* 4 – Events binden (Selects existieren jetzt & sind befüllt) */
          this.bindEvents();
        
          /* 5 – Erste Ansicht */
          this.renderTable();
        })
        .catch(err => console.error('JSON‑Load‑Fehler:', err));
    }

    /* --------------------------------------------------- */
    /* 2.2 Filter‑Dropdowns                                */
    /* --------------------------------------------------- 
    buildFilters() {
      const uniq = key => [...new Set(this.allData.map(o => o[key]))].sort();

      fillSelect(this.dom.filterTopic,         uniq('Topics'));
      fillSelect(this.dom.filterMonetization,  uniq('Monetization'));
      fillSelect(this.dom.filterType,          uniq('Type'));
    }*/


    buildFilters () {
      this.columns.forEach(col => {
        if (col.filter?.type !== 'select') return;            // nur Select-Felder
    
        const sel = this.dom[`filter_${col.field}`];
        if (!sel) return;                                     // Sicherheits-Check
    
        /* einzigartige Werte dieser Spalte zusammensammeln */
        const uniqVals = [...new Set(this.allData.map(r => r[col.field]))]
                         .filter(v => v !== undefined && v !== null)
                         .sort();
    
        /* Optionen anhängen */
        uniqVals.forEach(v => sel.add(new Option(v, v)));
      });
    }


    /* --------------------------------------------------- */
    /* 2.3 Event‑Binding                                   */
    /* --------------------------------------------------- */
    bindEvents() {
      /* Sortier‑Icons */
      this.wrapper.querySelectorAll('th[data-sort-key] .sort-icon-container')
        .forEach(iconWrap => {
          iconWrap.addEventListener('click', () => {
            const key = iconWrap.closest('th').dataset.sortKey;
            this.toggleSort(key);
          });
        });


      /* Filter – dynamisch über columns */
      this.columns.forEach(col=>{
        if(col.filter?.type !== 'select') return;
        const sel = this.dom[`filter_${col.field}`];
        if (sel) sel.addEventListener('change', () => this.applyFilter());
      });


      /* Pagination */
      this.dom.rowsPerPage.addEventListener('change', e => {
        this.rowsPerPage = +e.target.value;
        this.pageIndex   = 0;
        this.renderTable();
      });
      this.dom.pagerPrev.addEventListener('click', () => { this.pageIndex--; this.renderTable(); });
      this.dom.pagerNext.addEventListener('click', () => { this.pageIndex++; this.renderTable(); });
    }


    /* --------------------------------------------------- */
    /* 2.4 Sortierung                                      */
    /* --------------------------------------------------- */
    toggleSort(key) {
      if (this.sortState.key === key) {
        // 0 → 1 → −1 → 0 …
        this.sortState.dir = this.sortState.dir === 1 ? -1
                         : this.sortState.dir === -1 ? 0 : 1;
        if (this.sortState.dir === 0) this.sortState.key = null;
      } else {
        // neues Feld startet mit ↑
        this.sortState.key = key;
        this.sortState.dir = 1;
      }
    
      this.updateSortIcons();  // ⇐ neu
      this.sortData();
      this.renderTable();
    }
    
    updateSortIcons() {
        this.wrapper.querySelectorAll('th[data-sort-key]').forEach(th => {
          const icons = th.querySelectorAll('img.sort-icon');
          if (icons.length !== 3) return;               // → Tools-Spalte überspringen
          const [neutral, up, down] = icons;
    
        if (this.sortState.key === th.dataset.sortKey) {
          neutral.style.display = this.sortState.dir === 0 ? 'inline' : 'none';
          up     .style.display = this.sortState.dir === 1 ? 'inline' : 'none';
          down   .style.display = this.sortState.dir === -1? 'inline' : 'none';
        } else {
          // alle anderen Spalten auf neutral
          neutral.style.display = 'inline';
          up     .style.display = 'none';
          down   .style.display = 'none';
        }
      });
    }

    sortData() {
      const { key, dir } = this.sortState;

      /* unsortiert → nach __seq zurücksetzen */
      if (!key || dir === 0) {
        this.filteredData.sort((a, b) => a.__seq - b.__seq);
        return;
      }

      const colDef = this.columns.find(c => c.field === key);

    
      this.filteredData.sort((a,b)=>{
        let vA = a[key], vB = b[key];
    
        /* berechnete Spalte? → on the fly neu ermitteln */
        if (colDef?.computed){
          vA = a[`__${key}`] ?? (a[`__${key}`] = computeField(a,colDef));
          vB = b[`__${key}`] ?? (b[`__${key}`] = computeField(b,colDef));
        }
    
        /* Zahl vs. Text unterscheiden */
        if (typeof vA === 'number' && typeof vB === 'number')
          return dir * (vA - vB);
    
        return dir * ((''+vA).localeCompare(''+vB));
      });
    }

    /* --------------------------------------------------- */
    /* 2.5 Filtern                                         */
    /* --------------------------------------------------- */
    applyFilter() {
      this.filteredData = this.allData.filter(rec=>{
        return this.columns.every(col=>{
          if(col.filter?.type !== 'select') return true;
          const selVal = this.dom[`filter_${col.field}`].value;
          return !selVal || rec[col.field] === selVal;
        });
      });


      /* 2. Neue Ursprungs-Reihenfolge für neutral sort festhalten */
      this.filteredData.forEach((row, idx) => (row.__seq = idx));


      this.pageIndex = 0;
      this.sortData();
      this.renderTable();
    }

    /* --------------------------------------------------- */
    /* 2.6 Rendering                                       */
    /* --------------------------------------------------- */
    renderTable() {
      const { tbody } = this.dom;
      tbody.innerHTML = '';

      /* Paging‑Parameter */
      const total  = this.filteredData.length;
      const pages  = Math.max(1, Math.ceil(total / this.rowsPerPage));
      this.pageIndex = Math.min(Math.max(this.pageIndex, 0), pages - 1);

      const start = this.pageIndex * this.rowsPerPage;
      const slice = this.filteredData.slice(start, start + this.rowsPerPage);

      /* Zeilen mit dezentem Verlauf einfärben */
      const cStart = [60, 60, 60];
      const cEnd   = [25, 25, 25];
      const lerp   = (a, b, t) => Math.round(a + (b - a) * t);

      slice.forEach((item, idx) => {
        const tr  = document.createElement('tr');
        tr.className = 'tr-data';
        tr.__asset = item; 
    
        tr.innerHTML = this.columns.map(col=>{
          if (col.template === 'tools'  || col.isTools) {
            const iconsHtml = this.tools.map((t, i) => {
              const cls = t.cls || (i === 0 ? 'chart-trigger' : ''); // Fallback: 1. Icon bekommt Trigger
              return `<img src="${t.src}" class="action-icon ${cls}" alt="${t.alt}">`;
            }).join('');
            return `<td class="td-data tools-cell">${iconsHtml}</td>`;
          }
          
          const raw = computeField(item, col);
          const v   = (raw==='' || raw===null || raw===undefined)  ? '—'
                       : (typeof raw==='number' && raw.toFixed)      ? raw.toFixed(2)
                       : raw;
          return `<td class="td-data">${v}</td>`;
        }).join('');
        tbody.appendChild(tr);
      });

      /* Pager aktualisieren */
      const info = `${start + 1}–${Math.min(start + this.rowsPerPage, total)} / ${total}`;
      this.dom.pagerInfo.textContent = info;
      this.dom.pagerPrev.disabled = pages === 1 || this.pageIndex === 0;
      this.dom.pagerNext.disabled = pages === 1 || this.pageIndex === pages - 1;

      /* Hover‑Events neu binden */
      this.attachChartEvents();
      
      // nach dem Tabellenaufbau
      this.updateSortIcons();
    }

    /* --------------------------------------------------- */
    /* 2.7 Chart‑Overlay                                   */
    /* --------------------------------------------------- */

    /** Legt (einmalig) ein globales Overlay an oder greift das vorhandene. */
    initOverlay() {
      const existing = document.querySelector('.chartOverlayStyle.__global');
      
      if (existing) {
        this.overlay = existing;
        this.canvas  = existing.querySelector('canvas');
        return;
      }

      this.overlay = document.createElement('div');
      this.overlay.className = 'chartOverlayStyle __global';
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = '<canvas></canvas>';
      document.body.append(this.overlay);

      this.canvas = this.overlay.querySelector('canvas');

      /* Overlay selbst ausblenden bei Mouseleave */
      this.overlay.addEventListener('mouseenter', () => clearTimeout(this.hideTimeout));
      this.overlay.addEventListener('mouseleave', () => this.scheduleHide());
    }

    attachChartEvents() {
      this.wrapper.querySelectorAll('.chart-trigger').forEach(icon => {
        icon.addEventListener('mouseover', e => this.showChart(e));
        icon.addEventListener('mouseleave', () => this.scheduleHide());
      });
    }

    /**
     * Zeigt das Overlay und zeichnet das Chart.
     * @param {MouseEvent} e
     */
    showChart(e) {
      const asset = e.target.closest('tr').__asset;
      if (!asset) return;

      /* Chart-Daten vorbereiten */
      let series = asset.revenueSeries;

      /* 1. Falls nicht vorhanden → aus Rev_-Spalten bauen */
      if (!series){
        series = Object.keys(asset)
                 .filter(k => k.startsWith('Rev_'))
                 .sort()                                 // chronologisch
                 .map(k => ({
                   date : k.slice(4),                    // "Rev_2025-01-12" → "2025-01-12"
                   value: Number(asset[k])
                 }));
      }

      /* Position & Größe */
      const rect = e.target.getBoundingClientRect();
      const width = 460;

      /* Chart Layout einrichten -> jedes Chart wird einzeln neu erzeugt */
      Object.assign(this.overlay.style, {
        display:        'block',
        position:       'absolute',
        top:            `${rect.top - 10 + window.scrollY}px`,
        left:           `${Math.min(rect.left - width + 20, window.innerWidth - width - 10)}px`,
        width:          '400px',
        height:         '300px',
        background:     'radial-gradient(ellipse farthest-corner at 80% 80%, rgba(56,64,72,.5) 0%, rgba(56,64,72,.4) 20%, rgba(56,64,72,.35) 30%, rgba(56,64,72,.1) 50%, rgba(86,97,108,.8) 100%), rgba(20,22,24,.1)',
        borderTop:      '1px solid rgba(255,255,255,0.8)',
        borderLeft:     '1px solid rgba(255,255,255,0.6)',
        borderRight:    '1px solid rgba(255,255,255,0.3)',
        borderBottom:   '1px solid rgba(255,255,255,0.2)',
        padding:        '10px',
        zIndex:         9999,            // Zahl genügt
        boxShadow:      '4px 4px 24px rgba(0,0,0,0.9)',
        backdropFilter: 'blur(1rem)',
        WebkitBackdropFilter: 'blur(1rem)',
        borderRadius:   '20px'
      });

      /* Canvas‑Größe an Container anpassen */
      this.canvas.width  = this.overlay.clientWidth;
      this.canvas.height = this.overlay.clientHeight;

      /* 2. Labels und Werte ableiten */
      const labels = series.map(r => r.date);
      const daily  = series.map(r => r.value);
      let cumSum = 0;
      const cum  = daily.map(v => cumSum += v);

      /* Alte Instanz entsorgen 
      if (this.chart) this.chart.destroy();*/

      const ctx = this.canvas.getContext('2d');
    
      // Vorhandene Instanz sicher entsorgen
      Chart.getChart(ctx)?.destroy(); 

      /* Neues Chart zeichnen */
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Daily',
              data: daily,
              tension: 0.25,
                                      yAxisID: 'y',
                        backgroundColor: 'rgba(75,192,192,0.7)',
                        borderColor: 'rgba(75,192,192,1)',
                        borderWidth: 1,
                        pointRadius: 2
            },
            {
              label: 'Cumulative',
              data: cum,
                        yAxisID: 'y1',
                        backgroundColor: 'rgba(192,75,192,0.7)',
                        borderColor: 'rgba(192,75,192,1)',
                        borderWidth: 1,
                        pointRadius: 2
            }
          ]
        },
            options: {
                plugins: {
                    title: {
                      display: true,
                      text: asset.Asset_ID  // ← IP‑NFT als Diagramm‑Name
                    }
                },
                scales: {
                    x : {
                      type : 'category',                       //  Zeit-Achse
                      grid : { color: 'rgba(255,255,255,0.25)' },
                      ticks: { color: 'rgba(255,255,255, 1)', callback : (index) => labels[index] }
                    },
                    y: { 
                      position: 'left', 
                      beginAtZero: true, 
                      title: {display: true, 
                      text: 'Tageswert' },
                      grid : { color: 'rgba(255,255,255,0.25)' },
                      ticks: { color: 'rgba(255,255,255, 1)' }
                    },
                    y1: {
                      position: 'right',
                      beginAtZero: true,
                      grid: {drawOnChartArea: false},
                      title: {display: true, text: 'Kumuliert'},
                      ticks: { color: 'rgba(255,255,255, 1)' }
                    }
                },
                responsive: true, 
                maintainAspectRatio: false
            }
      });
      console.log('e:', e);
      console.log('Chart:', this.chart);
      const ov = document.querySelector('.chartOverlayStyle.__global');
      console.log('display  :', getComputedStyle(ov).display);
      console.log('z-index  :', getComputedStyle(ov).zIndex);
      console.log('rect     :', ov.getBoundingClientRect());
    }

scheduleHide() {
  // globalen Timer abbrechen
  if (this.overlay._hideT) clearTimeout(this.overlay._hideT);

  // neuen Timer auf dem Overlay merken
  this.overlay._hideT = setTimeout(() => {
    this.overlay.style.display = 'none';
    this.overlay._hideT = null;
  }, 0);
}

cancelHide() {
  if (this.overlay._hideT) {
    clearTimeout(this.overlay._hideT);
    this.overlay._hideT = null;
  }
}
  }


  /* -------------------------------------------------------------------- *
   * 3. Automatische Initialisierung                                      *
   * -------------------------------------------------------------------- */

  function init() {
    document.querySelectorAll('.dt-wrapper').forEach(w => new DataTable(w));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
