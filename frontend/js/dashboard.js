window.addEventListener('load', () => {
  (async () => {
    const csv = await fetch('data/categories.csv').then(r => r.text());
    const rows = Papa.parse(csv, {
      header: true,
      delimiter: ';',          // CSV nutzt Semikolon
      skipEmptyLines: true
    }).data;
    
   	/* ------ Chart.js-Palette (Dark UI) ------ */
    Chart.defaults.font.family     = "'Avenir Next', -apple-system, Roboto, Helvetica, sans-serif";
    Chart.defaults.font.size       = 16;
    Chart.defaults.font.weight     = 400;
    Chart.defaults.font.lineHeight = 1.2;
    
    Chart.defaults.color           = '#ffffff';                     // Text
    Chart.defaults.backgroundColor = 'rgba(20,22,24,0)';            // Flächen
    Chart.defaults.borderColor     = 'rgba(255,255,255,.25)';       // Linien / Balken
    

  	
   
    /* ░░░ 2. Hierarchie & Flows vorbereiten ░░░ */
    
    // jetzt NUR die echten Hierarchie-Spalten
  	const tierKey = [
  	  'Tier 1 Name',
  	  'Tier 2 Name',  
  	  'Tier 3 Name',  
  	  'Tier 4 Name',  
  	  'Tier 5 Name',
  	  'Tier 6 Name'    
  	];
  	
    const maxTier = tierKey.length;
  
    /* ░░░ 1. Farben anlegen ░░░ */
    
    const tierActiveColors = {
      from: ['--Rot-Dunkel', '--Gelb-Dunkel', '--Gruen-Dunkel', '--Tuerkis-Dunkel', '--Cyan-Dunkel', '--Blau-Dunkel', '--Violett-Dunkel', '--Pink-Dunkel', '--Rot-Dunkel', '--Gelb-Dunkel', '--Gruen-Dunkel', '--Tuerkis-Dunkel', '--Cyan-Dunkel', '--Blau-Dunkel', '--Violett-Dunkel', '--Pink-Dunkel'],
      to  : ['--Gelb-Dunkel', '--Gruen-Dunkel', '--Tuerkis-Dunkel', '--Cyan-Dunkel', '--Blau-Dunkel', '--Violett-Dunkel', '--Pink-Dunkel', '--Rot-Dunkel', '--Gelb-Dunkel', '--Gruen-Dunkel', '--Tuerkis-Dunkel', '--Cyan-Dunkel', '--Blau-Dunkel', '--Violett-Dunkel', '--Pink-Dunkel', '--Rot-Dunkel']
    };
    
    const tierColors = {
      from: ['--Rot', '--Gelb', '--Gruen', '--Tuerkis', '--Cyan', '--Blau', '--Violett', '--Pink', '--Rot', '--Gelb', '--Gruen', '--Tuerkis', '--Cyan', '--Blau', '--Violett', '--Pink'],
      to  : ['--Gelb','--Gruen','--Tuerkis','--Cyan', '--Blau', '--Violett', '--Pink', '--Rot', '--Gelb', '--Gruen', '--Tuerkis', '--Cyan', '--Blau', '--Violett', '--Pink']
    };
    
    const nodeLevel = new Map();
    rows.forEach(r => {
      for (let n = 1; n <= maxTier; n++) {
        const node = r[`Tier ${n} Name`]?.trim();
        if (node) nodeLevel.set(node, n);
      }
    });
    
    // alle Header einmal aus dem ersten Datensatz holen
  	const cols = Object.keys(rows[0]);

  	/* ---------- NEU: Zwei-Ebenen-Flows berechnen ---------- */
  	const childMap  = Array.from({length:maxTier}, () => new Map()); // Index = Parent-Tier 1..4
  	const nodeTotal = new Map();                                     // Knotenbreiten
  	const parentOf  = new Map();                                     // Child → Parent
  	/* Self-Werte pro Parent-Tier akkumulieren */
  	const selfAcc = Array.from({length: maxTier}, () => new Map());
  	
  	
  	/* Self-Werte pro Parent-Tier aufaddieren  (Index = Tier)  *************************************/
  	const selfSum = Array.from({ length: maxTier }, () => new Map());
  	
  	/* ---------- 1. Self-Werte einsammeln ---------- *******************************************/
  	rows.forEach(r => {
  	  for (let n = 1; n <= maxTier; n++) {        // t = Tier-Nummer
  	    const node = r[`Tier ${n} Name`]?.trim();
  	    const sVal = +r[`self_${n}`] || 0;
  	    if (!node || sVal === 0) continue;
  	
  	    const m = selfSum[n-1];                   // Map für dieses Tier
  	    m.set(node, (m.get(node) || 0) + sVal);   // aufsummieren
  	  }
  	});
	
  	rows.forEach(r => {
  	  /* n = Child-Tier (2 … 5) */
  	  for (let n = 2; n <= maxTier; n++) {
  	    const parent = r[tierKey[n-2]]?.trim();
  	    const child  = r[tierKey[n-1]]?.trim();
  	    if (!parent || !child) continue;
  	
  	    const flow = +r[`flow_${n}`] || 0;   // Gesamtabfluss des Child
   	    const self = +r[`self_${n}`] || 0;   // davon intern erzeugt
  	    
  	    const test    = flow || self;     // ← Fallback
  
  			if (test === 0) {                       // weder flow noch self vorhanden
  			  continue;
  			}
  			
  	    /* --- Kante Parent ← Child -------------------------- */
        const m = childMap[n-2];                   // Map des Parent-Tiers
        if (!m.has(parent)) m.set(parent,new Map());
        const kids = m.get(parent);
        const cur = kids.get(child) || 0;
  			kids.set(child, Math.max(cur, flow));
  
  	    
        nodeTotal.set(child , flow); // bleibt im Child
        nodeTotal.set(parent, flow); // kommt von Child
  	

  	    /* --- Navigation (Back) ----------------------------- */
  	    parentOf.set(child, parent);
  	  }  
  	});

  	/* ---------- Self-Kanten anlegen --------------------------------- **********************************/
  	for (let t = 1; t <= maxTier; t++){
  	  const mSelf = selfSum[t-1];
  	  if (!mSelf.size) continue;
  	
  	  const pairIdx = (t < maxTier) ? t : 1;//(maxTier - 1);
    if (t === 1) continue;                       // Tier-1 hat keinen Zufluss von links
    const mEdge = childMap[t-2];   //pairIdx
  	
  	  for (const [par,val] of mSelf){
  	    const pseudo = 'Own reach ' + par;       // ❶ neue Quell-ID
  	    const colPseudo = t;               // <<< verschie­bende Spalte
  
  	    if (!mEdge.has(par)) mEdge.set(par,new Map());
  	    mEdge.get(par).set(pseudo, val);         // from ≠ to ✔️
  	
  	    if (!nodeTotal.has(pseudo)) nodeTotal.set(pseudo, val);
  	    nodeTotal.set(par, (nodeTotal.get(par)||0) + val);
  	  }
  	}

  	const rootTier1 = rows[0]['Tier 1 Name']?.trim() || null;   // "OCOSO"
  
    /* ░░░ 3. State + Helfer ░░░ */
    let currTier   = 1;           // aktuelles Level (1-maxTier)
    let currParent = rootTier1;        // aktueller Parent-Knoten
    const history  = [];          // Stack für Zurück-Navigation
            
    let currDepth = 1;  // Standardtiefe
    
    const depthSel = document.getElementById('depthSel');
    

    depthSel.addEventListener('change', () => {
      currDepth = Number(depthSel.value);
      console.log('Neue Tiefe:', currDepth);      // ← Kontrolle im DevTools-Log
      updateChartAndUI();
    });
    

  	function flowsFor(tier, parent){
  	  /* tier: Ebene des Parent-Tiers (1-basiert)          */
  	  /* parent: konkreter Node oder null (Root-Ansicht)   */
  	
  	  const edges   = [];
  	  const inMap  = (tier>1) ? childMap[tier-2] : new Map();
      const outMap = childMap[tier-1] ?? new Map();
  	
  	  /* ---------- Root-Ansicht: alle Nodes dieser Ebene ---------- */
  	  if (parent === null){
  	
  	    /* Erst alle Incoming-Kanten (Großeltern → Parent) */
  	    for (const [grand, mids] of inMap){
  	      for (const [mid, wIn] of mids){
  	
  	        edges.push({ from: grand, to: mid, flow: wIn });
  	
  	        /* Dann alle Outgoing-Kanten des gleichen Parent (Parent → Child) */
  	        const kids = outMap.get(mid) || new Map();
  	        for (const [child, wOut] of kids){
  	          edges.push({ from: mid, to: child, flow: wOut });
  	        }
  	      }
  	    }
  	    return edges;
  	  }
  	
  	  /* ---------- Drill-down: ein konkreter Parent-Node ---------- */
  	
  	  /* 1) Incoming (falls es einen Großeltern gibt) */
  	  const grand = parentOf.get(parent);          // Map <Child → Parent> existiert ja
  	  if (grand){
  	    const wIn = (inMap.get(grand) || new Map()).get(parent) || 0;
  	    if (wIn) edges.push({ from: grand, to: parent, flow: wIn });
  	  }
  	
  	  /* 2) Outgoing */
  	  const kids = outMap.get(parent) || new Map();
  	  for (const [child, wOut] of kids){
  	    edges.push({ from: parent, to: child, flow: wOut });
  	  }
  	
  	  return edges;
  	}
  	
  	
  	function flowsDeep(tier, parent, depth){
      const edges = [];
      // Startknoten: root-Ansicht oder single Parent
      let frontier = parent===null
        ? [...childMap[tier-1].keys()]
        : [parent];
    
      // für jede Tiefe 1…depth
      for(let d=1; d<=depth; d++){
        const lvl = tier-1 + d;       // childMap-Index
        const prev= lvl - 1;
        const nextFront = [];
        frontier.forEach(p => {
          const kids = childMap[prev].get(p) || new Map();
          for(const [c, w] of kids){
            edges.push({from:p, to:c, flow:w});
            nextFront.push(c);
          }
        });
        frontier = nextFront;
      }
      return edges;
    }
  	
  	
    const initialFlows = flowsDeep(currTier, currParent, currDepth);
    const initialNodes = makeNodes(initialFlows);
  
    
    function makeNodes(arrFlows){
      const seen  = new Set();
      const nodes = [];
    
      /* Wert NICHT aus der globalen Summe, sondern aus den sichtbaren Flows */
      const totals = new Map();
      arrFlows.forEach(({from, to, flow})=>{
        totals.set(from, (totals.get(from) || 0) + flow);
        totals.set(to  , (totals.get(to  ) || 0) + flow);
      });
    
      arrFlows.forEach(({from, to})=>{
        [from, to].forEach(id=>{
          if (seen.has(id)) return;
          seen.add(id);
          nodes.push({
            id,
            value: totals.get(id) || 0          // **kein column mehr!**
          });
        });
      });
      return nodes;
    }
		
    const chart = new Chart(
      document.getElementById('sankeyChart'),
      {
        type : 'sankey',
        data : {
      
          datasets: [{
            data           : initialFlows,    // ← hier statt 'data'
            nodes          : initialNodes,    // Optional für Node-Layout
            colorFrom      : ctx => {
                                const flow = ctx.raw ?? ctx.dataset.data[ctx.dataIndex];
                                if (flow && flow.from) {
                                  const rel = (nodeLevel.get(flow.from) || 1) - currTier; // relativ
                                  const idx = Math.max(0, Math.min(rel, tierColors.from.length-1));
                                  return cssVar(tierColors.from[idx]);
                                }
                                return cssVar('--Blau');  
                              },

            colorTo        : ctx => {
                                const flow = ctx.raw ?? ctx.dataset.data[ctx.dataIndex];
                                if (flow && flow.from) {
                                  const rel = (nodeLevel.get(flow.from) || 1) - currTier;
                                  const idx = Math.max(0, Math.min(rel, tierColors.to.length-1));
                                  return cssVar(tierColors.to[idx]);
                                }
                                return cssVar('--Gruen');
                              },
            colorMode      : 'gradient',
            
            hoverColorFrom : ctx => {
                                const flow = ctx.raw ?? ctx.dataset.data[ctx.dataIndex];
                                if (flow && flow.from) {
                                  const rel = (nodeLevel.get(flow.from) || 1) - currTier;
                                  const idx = Math.max(0, Math.min(rel, tierActiveColors.from.length-1));
                                  return cssVar(tierActiveColors.from[idx]);
                                }
                                return cssVar('--Blau-Dunkel');  
                              },
            
            hoverColorTo   : ctx => {
                                const flow = ctx.raw ?? ctx.dataset.data[ctx.dataIndex];
                                if (flow && flow.from) {
                                  const rel = (nodeLevel.get(flow.from) || 1) - currTier;
                                  const idx = Math.max(0, Math.min(rel, tierActiveColors.to.length-1));
                                  return cssVar(tierActiveColors.to[idx]);
                                }
                                return cssVar('--Gruen-Dunkel');
                              },
                        
            alpha          : 1,
            color          : 'white',
            borderWidth    : 5,
            borderColor    : '#141618'
          }]
        },
        
        options : {
          plugins:{ legend:{display:false} },
          scales :{ y:{ beginAtZero:true, ticks:{ precision:0 }}},
          onClick: handleClick,                 // <─ Neues Callback
          responsive: true,          // hört auf Resize-Events
          maintainAspectRatio: false, // übernimmt Container-Höhe
        }
      }
    );


    function renderChart(tier, parent){
      const flows = flowsDeep(tier, parent, currDepth);
      const nodes = makeNodes(flows);
      
      const ds    = chart.data.datasets[0];
      ds.data   = flows;
      ds.nodes  = nodes;
         
      chart.update();
    }
    renderChart(currTier, currParent);     // zeigt OCOSO → Tier-2


     /* ░░░ UI-/Drill-Down-Navigator ░░░ */
    const sel   = document.getElementById('tierSel');
    const backSankey  = document.getElementById('backSankey');
    const home  = document.getElementById('homeBtn');
    const ctx   = document.getElementById('sankeyChart').getContext('2d');
  
    /* ------- 3) Helfer --------------------------------------- */
    function childrenOf(parentTier, parent){
      /* gibt ein sortiertes Array ALLER direkten Children zurück */
    
      /* ---------- Root-Fall ---------- */
      if (parent === null){
        return [...childMap[parentTier-1].keys()]
               .sort((a,b)=>a.localeCompare(b));
      }
    
      /* ---------- innerhalb eines Parents ---------- */
      const map = childMap[parentTier-1].get(parent) || new Map();
      const nextTier = parentTier + 1;
    
      /* Wenn wir schon auf der letzten Ebene sind, NICHT mehr filtern */
      if (nextTier >= maxTier){
        return [...map.keys()].sort((a,b)=>a.localeCompare(b));
      }
    
      /* sonst: nur Children anzeigen, die selbst weitere Kinder haben */
      return [...map.keys()].filter(name => {
               const kids = childMap[nextTier-1]?.get(name);
               return kids && kids.size > 0;
             }).sort((a,b)=>a.localeCompare(b));
    }
  
    function fillSelect(options, preSelect = null){
      sel.innerHTML = '';
      
      /* ─ Platzhalter ─────────────────────────────── */
      const ph = document.createElement('option');
      ph.textContent = '— Please choose topic —';
      ph.value      = '';          // leerer Wert
      ph.disabled   = true;        // nicht anwählbar
      ph.selected   = (preSelect === null); // nur root-Ansicht auto-selected
      sel.appendChild(ph);  
      
      for (const txt of options){
        const o = document.createElement('option');
        o.value = o.textContent = txt;
        if (txt === preSelect) o.selected = true;
        sel.appendChild(o);
      }
    }
    
    function updateChartAndUI(){
      /* --- Chart -------------------------------------------- */
      renderChart(currTier, currParent);
        
      /* --- Dropdown -----------------------------------------*/
         const list = childrenOf(currTier, currParent);
      
      /* Dropdown ausblenden, wenn maxTier erreicht */
      if (currTier === maxTier) {
        sel.style.display = 'none';
      } else {
        sel.style.display = '';
        if (list.length === 0) {
          sel.style.display = 'none';       // kein weiteres Tier → Menü aus
        } else {
          sel.style.display = '';           // sonst einblenden
          fillSelect(list);
        }
      }
      
      /* --- Buttons ------------------------------------------ */
      backSankey.disabled = (currTier === 1 && currParent === null);
    }
        
    /* ------- 4) Initiales Rendering -------------------------- */
    fillSelect(childrenOf(currTier, currParent), null);
    updateChartAndUI();
  
    /* ------- 5) Dropdown-Auswahl (drill-down) ---------------- */
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      const chosen = sel.value;
    
      /* aktuellen Zustand sichern */
      history.push({ tier: currTier, parent: currParent });
    
      if (currParent === null) {
        /* Root → konkretes Tier-1 */
        currParent = chosen;
      	console.log('Parent auf Null', currParent);
      } else if (currTier < maxTier-1 ) {
        /* echter Drill-down (1→2 … 5→6) */
        currTier++;
        currParent = chosen;
      	console.log('Parent bei kleiner als maxTier-1', currParent);
      } else {
        /* wir sind bereits im letzten Paar (5→6)        */
        /* Tier-6 hat keine Kinder → nur Parent wechseln */
        currTier++;
        currParent = chosen;                // <<< NEU
        console.log('Parent bei maxTier-1', currParent);
      }
      console.log('Ermittletes Parent vor Update', currParent);
      updateChartAndUI();    updateChartAndUI(); // Doppelter Aufruf, damit Sankey die Balken korrekt einfärbt.
    });
        
    /* ------- 6) Zurück-Button ------------------------------- */
    backSankey.addEventListener('click', () => {
      if (history.length === 0) return;           // schon ganz oben
      const prev = history.pop();                 // letzten Zustand ziehen
      currTier   = prev.tier;
      currParent = prev.parent;
      updateChartAndUI();    updateChartAndUI(); // Doppelter Aufruf, damit Sankey die Balken korrekt einfärbt.
    });
        
    /* ------- 7) Home-Button (ganz nach oben) ---------------- */
    home.addEventListener('click', () => {
      history.length = 0;   // Stack reset
      currTier   = 1;
      currParent = rootTier1;
      updateChartAndUI();    updateChartAndUI(); // Doppelter Aufruf, damit Sankey die Balken korrekt einfärbt.
    });
  
    function handleClick(evt, _activeEls){
      // genau EIN Sankey-Element unter dem Mauszeiger holen
      const els = chart.getElementsAtEventForMode(
                    evt, 'nearest', { intersect:true }, true);
      if (!els.length) return;
    
      const flow = els[0].element.$context.raw;   // {from, to, flow}
    
      /* Beispiel-Logik:
         - Wenn das geklickte Element in der aktuellen Ebene liegt,
           wähle das Child (= flow.to) als neuen Parent
         - sonst nichts tun                              */
      if (flow.to && flow.from){
        history.push({ tier: currTier, parent: currParent });
    
        // steckt flow.to ein Tier tiefer?
        if (currTier < maxTier && childMap[currTier-1].get(flow.from)?.has(flow.to)){
          currTier++;                  // eine Ebene tiefer
          currParent = flow.to;        // neues Parent-Element
          updateChartAndUI();        updateChartAndUI();      // UI wie beim Dropdown aktualisieren / Doppelter Aufruf, damit Sankey die Balken korrekt einfärbt.
        }
      }
    
      const box = document.querySelector('.dashboard-element-one-two');
      const ro  = new ResizeObserver(() => chart.resize());
      ro.observe(box);                               // reagiert auf Grid-Änderungen
      
      window.addEventListener('load', initChart);   // wartet bis alles da ist
      function initChart(){
        /* dein kompletter Chart-Code */
        chart.resize();    // Sicherheits-Call
      }    
    }


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