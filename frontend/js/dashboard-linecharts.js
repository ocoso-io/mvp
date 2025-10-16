window.addEventListener('load', () => {
  (async () => {
  	
   	/* ------ Chart.js-Palette (Dark UI) ------ */
    Chart.defaults.font.family     = "'Avenir Next', -apple-system, Roboto, Helvetica, sans-serif";
    Chart.defaults.font.size       = 16;
    Chart.defaults.font.weight     = 400;
    Chart.defaults.font.lineHeight = 1.2;
    
    Chart.defaults.color           = '#ffffff';                     // Text
    Chart.defaults.backgroundColor = 'rgba(20,22,24,0)';            // Flächen
    Chart.defaults.borderColor     = 'rgba(255,255,255,.25)';       // Linien / Balken


    /**
     * Wandelt ein Excel-Datum „DD.MM.YY“ in das ISO-Format
     * „YYYY-MM-DDT00:00:00“, wie es Chart.js (time-/timeseries-Scale) erwartet.
     *    "01.09.25"   →   "2025-09-01T00:00:00"
     *    "31.12.99"   →   "1999-12-31T00:00:00"
     *
     * @param {string} d  z. B. "01.09.25"
     * @returns {string}  z. B. "2025-09-01T00:00:00"
     */
    function excelDateToISO(raw) {
      if (!raw) return null;                 // leere / undef. Zelle
    
      const clean = raw.trim();              // evtl. Leerzeichen
      const parts = clean.split('.');
    
      if (parts.length !== 3) return null;   // falsches Format
    
      const [dd, mm, yy] = parts.map(Number);
    
      if (Number.isNaN(dd) || Number.isNaN(mm) || Number.isNaN(yy)) return null;
    
      const year = yy < 70 ? 2000 + yy : 1900 + yy;
    
      return `${year.toString().padStart(4,'0')}-` +
             `${mm  .toString().padStart(2,'0')}-` +
             `${dd  .toString().padStart(2,'0')}T00:00:00`;
    }


  
    /* ───────── CSV-Parser für einfache Werte in Reihen und Zeilen ───────── */
    async function csvToSeries(path) {
      const txt  = await fetch(path).then(r => r.text());
      const rows = Papa.parse(txt, { delimiter:';', skipEmptyLines:true }).data;
    
      /* Auto-Erkennung ------------------------------------------------ */
      const isRow = rows[0].length > rows.length;   // mehr Spalten als Zeilen?
    
      if (isRow) {                                  // ► bisheriger Fall
        /*const labels  = rows[0].slice(1).map(excelDateToISO).filter(Boolean);*/
        const labels  = rows[0].slice(1);
        const numbers = rows[1].slice(1)
                         .map(s => parseFloat(s.replace(',', '.')));
        return { labels, numbers };
      } else {                                      // ► spaltenorientiert
        const labels  = [];
        const numbers = [];
        for (let i = 1; i < rows.length; i++) {     // ab Zeile 1 → Daten
          /*const iso = excelDateToISO(rows[i][0]);
          if (!iso) continue;                          // ungültige Zeile überspringen
          labels.push(iso);*/
          labels.push(rows[i][0]);
          numbers.push(parseFloat(rows[i][1].replace(',', '.')));
        }
        return { labels, numbers };
      }
    }
  
    function cssVar(name) {
      return getComputedStyle(document.documentElement)
             .getPropertyValue(name).trim();
    }
    
    /* ───────── Original-Daten sichern ───────── */
    function keepOriginal(chart, labels, data) {
      /* Kopien anlegen, damit slice() später nichts zerstört */
      chart.$full = {
        labels : [...labels],
        data   : [...data]
      };
    }
    
    /* ───────── Daten beschneiden ───────── */
    function sliceData(chart, days, dir=0) {
      
        /*  chart.$full.labels  – komplette Achse
      chart.$range.size   – Fenstergröße  (7 | 30 | null=all)
      chart.$range.start  – Index des 1. sichtbaren Labels          */
      
      
      /* -------- Voll­daten & Range anlegen (einmalig) -------- */
      const total = chart.$full.labels.length;
      if (!chart.$range) chart.$range = { start: 0, size: total };
    
      /* -------- 1. Fenster­größe ändern (dir === 0) ----------- */
      if (dir === 0) {
        if (days === 'all') {
          chart.$range.start = 0;
          chart.$range.size  = total;
        } else {
          const newSize = Number(days);
          /* Ende des bisherigen Fensters beibehalten ------------- */
          const endIdx  = chart.$range.start + chart.$range.size - 1;
          chart.$range.size  = newSize;
          chart.$range.start = Math.max(0, endIdx - newSize + 1);
        }
      }
    
      /* -------- 2. Fenster verschieben (dir ±1) --------------- */
      if (dir !== 0) {
        const step = chart.$range.size;                 // um eine Seite springen
        chart.$range.start += dir * step;
        chart.$range.start  = Math.max(
                               0,
                               Math.min(chart.$range.start, total - step)
                             );
      }
    
      /* -------- 3. Ausschnitt auf das Chart anwenden ---------- */
      const { start, size } = chart.$range;
      chart.data.labels        = chart.$full.labels.slice(start, start + size);
      chart.data.datasets[0].data = chart.$full.data.slice(start, start + size);
      

      /* +++ NEU: Tick-Callback jetzt auf die *aktuellen* Labels zeigen lassen +++ */
      chart.options.scales.x.ticks.callback = (_, i) => chart.data.labels[i];
      
      /*const n = Number(days);
      chart.data.labels  = chart.$full.labels.slice(-n);
      chart.data.datasets[0].data = chart.$full.data.slice(-n);*/
    }  
  
  
    /* ───────── Buttons + Pfeil-Navi registrieren ───────── */
    function addLocalFilter(chart){
      const box  = chart.canvas.closest('.dashboard-element-one-two');
    
      /* 1 · Perioden-Buttons (7 / 30 / all) */
      box.querySelectorAll('.tf-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          box.querySelectorAll('.tf-btn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
    
          sliceData(chart, btn.dataset.days, 0);   // Fenster neu setzen
          fitPoints(chart);
          updateInfo();            // ← ruft nichts, falls Pfeile fehlen
          chart.update();
        });
      });
    
      /* 2 · Pfeile + Info — nur wenn vorhanden */
      const prev = box.querySelector('#ppPrev');   // oder '.tr-prev'
      const next = box.querySelector('#ppNext');
      const info = box.querySelector('#ppInfo');
    
      if (prev && next && info) {                  // <<< Schutz
        prev.addEventListener('click', ()=>{
          sliceData(chart, chart.$range.size, -1); // zurück
          fitPoints(chart);
          updateInfo();
          chart.update();
        });
        next.addEventListener('click', ()=>{
          sliceData(chart, chart.$range.size, +1); // vor
          fitPoints(chart);
          updateInfo();
          chart.update();
        });
      }
    
      /* ── Helper ─────────────────────────── */
      function fitPoints(c){
        const r = (c.$range.size && c.$range.size <= 30) ? 8 : 0;
        c.data.datasets.forEach(ds=>{
          ds.pointRadius      = r;
          ds.pointHoverRadius = r*1.5;
          ds.pointBorderWidth = r ? 2 : 0;
        });
      }
    
      function updateInfo(){
        if (!info) return;                         // kein Info-Span → raus
        const { start, size } = chart.$range;     // von sliceData gesetzt
        const win = Math.floor(start / size) + 1; // aktuelle Seite
        const max = Math.max(1,Math.ceil(chart.$full.labels.length / size - 1)); // Gesamt
    
        info.textContent = `${win} / ${max}`;     // z. B.  "2 / 14"
    
        /* Pfeile aktiv/deaktivieren */
        prev.disabled = (start === 0);
        next.disabled = (start + size >= chart.$full.labels.length);
      }
    
      /* 3 · Initial‐Aufruf */
      sliceData(chart, 'all', 0);   // alles zeigen
      updateInfo();
    }
      
  
    /* ───────── neue Helper: Buttons registrieren ───────── 
      function addLocalFilter(chart){
      const box   = chart.canvas.closest('.dashboard-element-one-two');
      const btns  = box.querySelectorAll('.tf-btn');
    
      btns.forEach(btn=>{
        btn.addEventListener('click', ()=>{*/
          /* Optik */
         /* btns.forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
    
          /* Daten beschneiden */
          /*const days = btn.dataset.days;
          sliceData(chart, btn.dataset.days);*/
          
          /* Punkte nur für 7 oder 30 Tage */
          /*const radius = (days === '7' || days === '30') ? 8 : 0;
          chart.data.datasets.forEach(ds => {
            ds.pointRadius      = radius;
            ds.pointHoverRadius = radius * 1.5;
            ds.pointBorderWidth = radius ? 2 : 0;
          });

          chart.update();
        });
      });
    } */



  
    function withAlpha(col, alpha) {
      col = col.trim();
    
      /*  #RRGGBB  →  rgb */
      if (col.startsWith('#')) {
        const int = parseInt(col.slice(1), 16);
        const r = int >> 16 & 255,
              g = int >>  8 & 255,
              b = int       & 255;
        return `rgba(${r},${g},${b},${alpha})`;
      }
    
      /*  rgb() - oder  rgba()  →  neue alpha einsetzen */
      return col.replace(
        /rgba?\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)(?:,[^)]+)?\)/,
        `rgba($1,$2,$3,${alpha})`
      );
    }
  
    /* ───────── Factory für Liniencharts ───────── */
    async function createLineChart(cfg) {
      const { labels, numbers } = await csvToSeries(cfg.csv);

      const ctx   = document.getElementById(cfg.id);
      const chart = new Chart(ctx, {
        type : 'line',
        data : {
          labels,
          datasets: [{
            label           : cfg.label,
            data            : numbers,
            borderWidth     : 4,
            borderColor     : cssVar(cfg.color),
            backgroundColor : withAlpha(cssVar(cfg.color), 1),
            tension         : .25,
            pointRadius     : 0,               // initial unsichtbar
            pointHoverRadius : 0,
            pointBorderColor : '#141618',       // Outline-Farbe
            pointBorderWidth : 2,               // Outline-Stärke
            fill            : cfg.fill ? 'origin' : false          //  ◄◄  Magie
          }]
        },
        options: {
          scales: {
            x: {
              type : 'category',                       //  Zeit-Achse
              grid: {
                color: 'rgba(255,255,255,0.1)',   // neue Farbe
                lineWidth: 2,                     // neue Linienstärke
                drawBorder: true                 // Randlinie ausblenden
              },
              ticks: { 
                autoSkip: true, 
                //maxTicksLimit: 8,
                minRotation: 45,
                maxRotation: 45,
                callback : (index) => labels[index]
              }
            },
            y: {
              grid: {
                color: 'rgba(255,255,255,0.1)',
                lineWidth: 2
              },
              beginAtZero: true, ticks: { precision: 2 } 
            }
          },
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: false
        }
      });
  
      /* Originaldaten sichern + Buttons aktivieren */
      keepOriginal(chart, labels, numbers);
      addLocalFilter(chart);
    
      /* Resize-Observer wie zuvor */
      new ResizeObserver(()=>chart.resize())
        .observe(ctx.closest('.dashboard-element-one-two'));
    
      return chart;
    }
  
    /* ───────── Factory für Halb-Doughnuts ───────── */
    async function createRingChart(cfg) {
      const { labels, numbers } = await csvToSeries(cfg.csv);
    
      const ctx = document.getElementById(cfg.id);
      const clr = cfg.colors.map(v => cssVar(v));
    
      const chart = new Chart(ctx, {
        type : 'doughnut',
        data : { 
          labels, 
          datasets: [
          { 
            data:numbers, 
            backgroundColor: clr,
            borderColor : 'transparent',  // ◄ hier transparent
            borderWidth : 0,
        spacing        : 8   
          }] 
        },
        options: {
          plugins: { legend:{ position:'bottom', labels:{ boxWidth:18 } } },
          cutout       : cfg.cutout,
          rotation     : -90,          // Start oben
          circumference: 180,          // nur halber Kreis
          responsive   : true,
          maintainAspectRatio:false
        }
      });
    
      new ResizeObserver(() => chart.resize())
        .observe(ctx.closest('.dashboard-element-one-one'));
    }
    
  
    /* ───────── Aufrufe ───────── */
    createLineChart({
      id   : 'lineChart',              // bestehende Kachel
      csv  : 'data/Revenue-per-CNFT.csv',
      label: 'Revenue',
      color: '--Gruen',
      fill : false
    });
  
    createLineChart({
      id   : 'lineChartPages',         // neue Kachel
      csv  : 'data/Mintet-Pages.csv',
      label: 'Minted Pages',
      color: '--Gelb',
      fill : false   
    });
    
    createLineChart({
      id   : 'lineChartPagesTotal',         // neue Kachel
      csv  : 'data/Mintet-Pages-Total.csv',
      label: 'Existing Pages',
      color: '--Gelb',
      fill : true  
    });
    
    /* ───────── Ring-Chart anlegen ───────── */
    createRingChart({
      id   : 'ringChart',
      csv  : 'data/TIer-Volume.csv',   // Pfad anpassen
      colors: [
        '--Gelb', '--Gruen',
        '--Tuerkis', '--Cyan', '--Blau',
        '--Violett', '--Pink', '--Rot'
      ],
      cutout: '55%'                    // Loch-Größe
    });
    
    createLineChart({
      id   : 'lineChartCreator',         // neue Kachel
      csv  : 'data/Creator-Count.csv',
      label: 'Publishers',
      color: '--Cyan',
      fill : true    
    });
  })();
});