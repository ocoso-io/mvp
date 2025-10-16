document.addEventListener('DOMContentLoaded', function () {
  let sortState = {key: null, direction: 0};
  let globalData = [], filteredData = [];

  /* ---------- Pager-State & Elemente ---------- */
  const pager = {
      page: 0,
      perPage: 20,
      prev:  document.getElementById('pagePrev'),
      next:  document.getElementById('pageNext'),
      info:  document.getElementById('pageInfo'),
      sel:   document.getElementById('rowsPerPage')
  };

  pager.prev.addEventListener('click', () => { pager.page--; renderTable(filteredData); });
  pager.next.addEventListener('click', () => { pager.page++; renderTable(filteredData); });
  pager.sel .addEventListener('change', e => {
      pager.perPage = +e.target.value;
      pager.page = 0;
      renderTable(filteredData);
  });


  fetch('ipnft_einzelwerte.json')
      .then(r => r.json())
      .then(data => {
          globalData = prepareData(data);
          buildFilterOptions(globalData);
          filteredData = [...globalData];
          renderTable(filteredData);
      })
      .catch(e => console.error('Lade-Fehler:', e));


      function attachChartEvents() {
          document.querySelectorAll('.chart-trigger').forEach(icon => {
              icon.addEventListener('mouseover', showChartOverlay);
              icon.addEventListener('mouseleave', hideChartOverlay);
          });
      }


      function showChartOverlay(e) {
        const key = e.target.closest('tr').dataset.assetKey;
        
        const asset = globalData.find(it => `${it.Asset_ID}_${it.Topics}_${it.Monetization}_${it.Type}` === key);
        
        if (!asset) return console.warn('Kein Asset gefunden:', key);
        
        
        
        
				const ov = document.getElementById('chartOverlay');
			  const cn = document.getElementById('chartCanvas');
			
			  // 2) Messung vorbereiten
			  ov.style.position = 'absolute';
			  ov.style.display = 'block';
			  ov.style.visibility = 'hidden'; // messen ohne flackern
			
			  // 3) Koordinaten: Trigger (Viewport) → Host (Container)
			  const triggerRect = e.currentTarget.getBoundingClientRect();     // nicht e.target
			  const host = ov.offsetParent || ov.parentElement;                // relativer Bezug
			  const hostRect = host.getBoundingClientRect();
			
			  const GAP = 8;
			  const ow = ov.offsetWidth  || 470;
			  const oh = ov.offsetHeight || 260;
			
			  // 4) Basispunkte relativ zum Host (inkl. Host-Scroll, falls scrollbarer Container)
			  const hostScrollLeft = host === document.body ? window.scrollX : host.scrollLeft;
			  const hostScrollTop  = host === document.body ? window.scrollY : host.scrollTop;
			
			  let top  = (triggerRect.bottom - hostRect.top) + hostScrollTop + GAP;
			  let left = (triggerRect.left   - hostRect.left) + hostScrollLeft - ow - GAP;
			
			  // 5) Kollisionen innerhalb des Hosts abfangen
			  const maxLeft = (host.clientWidth  ?? hostRect.width)  - ow - GAP;
			  const maxTop  = (host.clientHeight ?? hostRect.height) - oh - GAP;
			
			  if (left < GAP) left = Math.min(triggerRect.right - hostRect.left + hostScrollLeft + GAP, maxLeft);
			  if (left > maxLeft) left = maxLeft;
			
			  if (top + oh > (host.clientHeight ?? hostRect.height) - GAP) {
			    top = (triggerRect.top - hostRect.top) + hostScrollTop - oh - GAP; // über dem Trigger
			  }
			  if (top < GAP) top = GAP;
			
			  // 6) Setzen
			  ov.style.left = `${left}px`;
			  ov.style.top  = `${top}px`;
			  ov.style.visibility = 'visible';        
        
        
        
        
        if (window.myChart) window.myChart.destroy();
        
        const labels = asset.revenueSeries.map(r => r.date),
            values = asset.revenueSeries.map(r => r.value);
            
        let cum = [], sum = 0;
        
        values.forEach(v => {
            sum += v;
            cum.push(sum);
        });

        window.myChart = new Chart(cn.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Tageswert',
                        data: values,
                        yAxisID: 'y',
                        backgroundColor: 'rgba(75,192,192,0.7)',
                        borderColor: 'rgba(75,192,192,1)',
                        borderWidth: 1,
                        pointRadius: 2
                    },
                    {
                        label: 'Kumuliert',
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
                      grid : { color: 'rgba(255,255,255,0.25)' },
                      ticks: { color: 'rgba(255,255,255, 1)' }
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
            },
        });
      }

      function hideChartOverlay() {
          const ov = document.getElementById('chartOverlay');
          ov.style.display = 'none';
          if (window.myChart) {
              window.myChart.destroy();
              window.myChart = null;
          }
      }

  function prepareData(data) {
      const grouped = {};
      data.forEach(record => {
          const typeValue = record.Type || 'n/a';
          const key = `${record.Asset_ID}_${record.Category}_${record.Monetization}_${typeValue}`;
          const revKeys = Object.keys(record).filter(k => k.startsWith('Rev_')).sort();
          if (!grouped[key]) {
              grouped[key] = {
                  Asset_ID: record.Asset_ID,
                  Topics: record.Category,
                  Monetization: record.Monetization,
                  Type: typeValue,
                  Start_Date: null,
                  Volume: 0,
                  revenueSeries: revKeys.map(k => ({
                      date: k.replace('Rev_', ''),
                      value: Number(record[k])
                  }))
              };
          }
          revKeys.forEach(k => {
              const v = Number(record[k]);
              const d = k.replace('Rev_', '');
              if (v > 0 && (!grouped[key].Start_Date || d < grouped[key].Start_Date)) {
                  grouped[key].Start_Date = d;
              }
              grouped[key].Volume += v;
          });
      });
      return Object.values(grouped);
  }

  function buildFilterOptions(data) {
      const topics = [...new Set(data.map(d => d.Topics))].sort();
      const monets = [...new Set(data.map(d => d.Monetization))].sort();
      const types = [...new Set(data.map(d => d.Type))].sort();
      const byId = id => document.getElementById(id);
      topics.forEach(t => byId('filterTopic').append(new Option(t, t)));
      monets.forEach(m => byId('filterMonetization').append(new Option(m, m)));
      types.forEach(tp => byId('filterType').append(new Option(tp, tp)));
      ['filterTopic', 'filterMonetization', 'filterType']
          .forEach(id => byId(id).addEventListener('change', filterAndRender));


      //document.querySelectorAll('th[data-sort-key]')
      //.forEach(th=> th.addEventListener('click', ()=>{ toggleSort(th.dataset.sortKey); applySort(); }));

      // Statt auf das ganze <th> nur auf das Icon-Container-Element lauschen:
      document.querySelectorAll('th[data-sort-key] .sort-icon-container')
          .forEach(iconWrap => {
              iconWrap.style.cursor = 'pointer';
              iconWrap.addEventListener('click', e => {
                  const th = iconWrap.closest('th[data-sort-key]');
                  toggleSort(th.dataset.sortKey);
                  applySort();
                  e.stopPropagation(); // verhindert andere Listener
              });
          });

  }

  function filterAndRender() {
      const v = id => document.getElementById(id).value;
      filteredData = globalData.filter(d =>
          (!v('filterTopic') || d.Topics === v('filterTopic')) &&
          (!v('filterMonetization') || d.Monetization === v('filterMonetization')) &&
          (!v('filterType') || d.Type === v('filterType'))
      );
      pager.page = 0;   // nach jedem Filter zurück auf Seite 1
      applySort();
  }

  function toggleSort(key) {
      if (sortState.key === key) {
          sortState.direction = sortState.direction === 1 ? -1 : 0;
          if (sortState.direction === 0) sortState.key = null;
      } else {
          sortState.key = key;
          sortState.direction = 1;
      }
      updateSortIcons();
  }

  function updateSortIcons() {
      document.querySelectorAll('th[data-sort-key]').forEach(th => {
          const [neutral, up, down] = th.querySelectorAll('img.sort-icon');
          if (sortState.key === th.dataset.sortKey) {
              neutral.style.display = 'none';
              up.style.display = sortState.direction === 1 ? 'inline' : 'none';
              down.style.display = sortState.direction === -1 ? 'inline' : 'none';
          } else {
              neutral.style.display = 'inline';
              up.style.display = down.style.display = 'none';
          }
      });
  }

  function applySort() {
      if (sortState.key && sortState.direction) {
          filteredData.sort((a, b) => {
              const A = a[sortState.key], B = b[sortState.key];
              if (sortState.key === 'Volume') return sortState.direction * (A - B);
              if (sortState.key === 'Start_Date') return sortState.direction * (A?.localeCompare(B) || 0);
              return sortState.direction * (('' + A).localeCompare('' + B));
          });
      }
      renderTable(filteredData);
  }      
  
  function renderTable(data) {
      const tbody = document.querySelector('.data-table tbody');
      tbody.innerHTML = '';

      /* --- Paging --- */
      const total  = data.length;
      const pages  = Math.max(1, Math.ceil(total / pager.perPage));
      pager.page   = Math.min(Math.max(pager.page, 0), pages - 1);

      const start  = pager.page * pager.perPage;
      const end    = Math.min(start + pager.perPage, total);
      const slice  = data.slice(start, end);

      /* --- Farbverlauf vorbereiten (hell → dunkel) --- */
      const colorStart = [60, 60, 60];   // RGB  (#3C3C3C)
      const colorEnd   = [20, 20, 20];   // RGB  (#141414)
      const lerp = (a,b,t)=> Math.round(a + (b-a)*t);


      slice.forEach( (item,rowIdx) => {
          /* Farbwert für diese Tabellenzeile */
          const t = slice.length>1 ? rowIdx/(slice.length-1) : 0;   // 0…1
          const rgb = colorStart.map( (c,i)=> lerp(c, colorEnd[i], t) );
          const bg  = `rgb(${rgb.join(',')})`;
      
          const tr = document.createElement('tr');
          tr.className = 'tr-data';
          
          tr.dataset.assetKey = `${item.Asset_ID}_${item.Topics}_${item.Monetization}_${item.Type}`;
          tr.innerHTML = `
            <td class="td-data">${item.Asset_ID}</td>
            <td class="td-data">${item.Type}</td>
            <td class="td-data">${item.Topics}</td>
            <td class="td-data">${item.Monetization}</td>
            <td class="td-data">${item.Start_Date || '---'}</td>
            <td class="td-data">${item.Volume.toFixed(2)}</td>
            <td class="td-data">
              <img src="img/icon-eye.png"  class="action-icon chart-trigger" />
              <img src="img/icon-edit.png" class="action-icon" />
              <img src="img/icon-trash.png"class="action-icon" />
            </td>`;
          tbody.append(tr);
      });

      /* --- Pager-UI aktualisieren --- */
      pager.info.textContent = `${start + 1}–${end} / ${total}`;
      pager.prev.disabled = pager.page === 0;
      pager.next.disabled = pager.page === pages - 1;

      attachChartEvents();
  }
});