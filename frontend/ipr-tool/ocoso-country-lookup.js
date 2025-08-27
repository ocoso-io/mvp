
/**
 * ocoso-country-lookup.js (CSS externalized)
 * - Loads styles from external CSS via <link> inside Shadow DOM
 * - English UI texts
 * - Robust matching and link extraction
 * Attributes:
 *   - data-json-src | data-json-id | data | data-src
 *   - country-key="Country" | "Land" | "Staat"
 *   - region-key="Region"
 *   - css-href="path/to/ocoso-country-lookup.css"  (optional, default: "ocoso-country-lookup.css")
 *   - rec-mode="text|list"   (default: text)
 *   - src-mode="text|links"  (default: text)
 */
(function(){
  class OcosoCountryLookup extends HTMLElement {
    constructor(){
      super();
      this.attachShadow({ mode: 'open' });
      this.state = {
        data: [],
        countryKey: this.getAttribute('country-key') || 'Country',
        regionKey: this.getAttribute('region-key') || 'Region',
        countries: [],
        selected: null,
        recMode: this.getAttribute('rec-mode') || 'text',
        srcMode: this.getAttribute('src-mode') || 'text',
        cssHref: this.getAttribute('css-href') || 'ipr-tool/ocoso-country-lookup.css'
      };
    }

    connectedCallback(){
      this.renderSkeleton();
      this.loadData().then(()=>{
        this.preprocessData();
        this.postLoad();
        this.applyViewModes();
        const params = new URLSearchParams(location.search);
        const qs = params.get('country');
        if (qs) {
          const input = this.shadowRoot.getElementById('country');
          input.value = qs;
          this.onPickCountry();
        }
      }).catch(err => {
        console.error(err);
        this.setStatus('Error loading data.');
      });
    }

    setStatus(txt){ this.shadowRoot.getElementById('status').textContent = txt; }

    renderSkeleton(){
      const tpl = document.createElement('template');
      tpl.innerHTML = `
        <div class="wrap">
          <div class="grid">
            <div class="row">
              <div>
                <label for="country">Destination country</label>
                <div style="height: 1rem">&nbsp;</div>
                <input id="country" type="text" list="country-list" placeholder="e.g. United States" autocomplete="off" aria-label="Search country"/>
                <datalist id="country-list"></datalist>
              </div>
              <div class="flex">
                <button id="pick" class="btn">Accept</button>
                <button id="clear" class="btn">Reset</button>
                <div id="status" class="muted">Choose a country.</div>
              </div>
            </div>

            <div class="two">
              <div class="lookup-card">
                <h4>Machine‑readable opt‑out protects against commercial TDM?</h4>
                <div style="height: 1rem">&nbsp;</div>
                <textarea id="field-optout" readonly placeholder="–"></textarea>
              </div>
              <div class="lookup-card">
                <h4>Specific limitation</h4>
                <div style="height: 1rem">&nbsp;</div>
                <textarea id="field-specific" readonly placeholder="–"></textarea>
              </div>
            </div>

            <div class="lookup-card">
              <h4>Recommended countermeasures</h4>
              <div style="height: 1rem">&nbsp;</div>
              <textarea id="field-countermeasures" readonly placeholder="–"></textarea>
              <ul id="list-countermeasures" class="list"></ul>
            </div>

            <div class="lookup-card">
              <h4>Sources</h4>
              <div style="height: 1rem">&nbsp;</div>
              <textarea id="field-sources" readonly placeholder="–"></textarea>
              <div class="linkarea">
                <div id="links-sources" class="linklist"></div>
              <div>
            </div>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(tpl.content.cloneNode(true));

      // Attach external CSS inside shadow root
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = this.state.cssHref;
      this.shadowRoot.prepend(link);

      const input = this.shadowRoot.getElementById('country');
      let t;
      input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(()=> this.onTypeAhead(), 80); });
      input.addEventListener('change', () => this.onTypeAhead());
      input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); this.onPickCountry(); } });
      this.shadowRoot.getElementById('pick').addEventListener('click', () => this.onPickCountry());
      this.shadowRoot.getElementById('clear').addEventListener('click', () => {
        input.value = '';
        this.state.selected = null;
        this.renderDetails(null);
        this.setStatus('Choose a country.');
        history.replaceState(null, '', location.pathname);
      });
    }

    applyViewModes(){
      const recText = this.shadowRoot.getElementById('field-countermeasures');
      const recList = this.shadowRoot.getElementById('list-countermeasures');
      const srcText = this.shadowRoot.getElementById('field-sources');
      const srcLinks = this.shadowRoot.getElementById('links-sources');

      if ((this.state.recMode || 'text') === 'list'){
        recText.style.display = 'none';
        recList.style.display = '';
      } else {
        recText.style.display = '';
        recList.style.display = 'none';
      }

      if ((this.state.srcMode || 'text') === 'links'){
        srcText.style.display = 'none';
        srcLinks.style.display = '';
      } else {
        srcText.style.display = '';
        srcLinks.style.display = 'none';
      }
    }

    async loadData(){
      const jsonId = this.getAttribute('data-json-id');
      if (jsonId){
        const el = document.getElementById(jsonId);
        if (!el) throw new Error('JSON script with data-json-id not found: ' + jsonId);
        this.state.data = JSON.parse(el.textContent || '[]');
        return;
      }
      const jsonSrc = this.getAttribute('data-json-src');
      if (jsonSrc){
        const res = await fetch(jsonSrc, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + jsonSrc);
        this.state.data = await res.json();
        return;
      }
      const dataAttr = this.getAttribute('data');
      if (dataAttr){
        this.state.data = JSON.parse(dataAttr);
        return;
      }
      const src = this.getAttribute('data-src');
      if (src){
        const res = await fetch(src, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + src);
        const text = await res.text();
        this.state.data = this.csvToJson(text);
        return;
      }
      throw new Error('No data source provided.');
    }

    preprocessData(){
      this.state.data = (this.state.data || []).map(row => {
        const out = {};
        for (const [k,v] of Object.entries(row)){
          if (typeof v === 'string'){
            out[k] = v.replace(/\u00A0/g, ' ').trim();
          } else {
            out[k] = v;
          }
        }
        return out;
      });
    }

    csvToJson(text){
      const rows = [];
      let i=0, field="", row=[], inQuotes=false;
      const pushField = ()=>{ row.push(field); field=""; };
      while(i < text.length){
        const c = text[i];
        if (inQuotes){
          if (c === '"'){
            if (text[i+1] === '"'){ field += '"'; i++; }
            else inQuotes = false;
          } else field += c;
        } else {
          if (c === '"') inQuotes = true;
          else if (c === ',') pushField();
          else if (c === '\n'){ pushField(); rows.push(row); row=[]; }
          else if (c === '\r'){ /* ignore */ }
          else field += c;
        }
        i++;
      }
      pushField(); rows.push(row);
      if (!rows.length) return [];
      let headers = rows.shift().map(h => String(h||'').replace(/\uFEFF/g,'').replace(/\s+/g,' ').trim());
      return rows
        .filter(r => r.length && r.some(x => String(x).trim() !== ''))
        .map(r => {
          const obj = {};
          headers.forEach((h, idx) => obj[h] = (r[idx] ?? '').trim());
          return obj;
        });
    }

    normalize(s){
      return String(s || '')
        .replace(/\u00A0/g,' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .trim();
    }

    postLoad(){
      const cols = Object.keys(this.state.data[0] || {});
      const keyLike = (names) => cols.find(c => names.some(n => this.normalize(c) === this.normalize(n)));
      this.state.countryKey = this.getAttribute('country-key') || keyLike(['Country','Land','Staat']) || 'Country';
      this.state.regionKey  = this.getAttribute('region-key')  || keyLike(['Region']) || 'Region';

      const countries = Array.from(new Set(this.state.data.map(d => d[this.state.countryKey]).filter(Boolean)))
        .sort((a,b)=> String(a).localeCompare(String(b),'en',{sensitivity:'base'}));
      this.state.countries = countries;
      const dl = this.shadowRoot.getElementById('country-list');
      countries.forEach(c => { const o=document.createElement('option'); o.value=c; dl.appendChild(o); });
      this.setStatus('Choose your country and click “Accept”.');
    }

    onTypeAhead(){
      const v = this.shadowRoot.getElementById('country').value.trim();
      if (!v) { this.setStatus('Choose a country.'); return; }
      const hit = this.findBestCountry(v);
      if (hit) this.setStatus('Found: ' + hit);
      else this.setStatus('No exact match.');
    }

    findBestCountry(q){
      const n = this.normalize(q);
      const norm = x => this.normalize(x);
      let hit = this.state.countries.find(c => norm(c) === n);
      if (hit) return hit;
      hit = this.state.countries.find(c => norm(c).startsWith(n));
      if (hit) return hit;
      hit = this.state.countries.find(c => norm(c).includes(n));
      return hit || null;
    }

    onPickCountry(){
      const input = this.shadowRoot.getElementById('country');
      const raw = input.value;
      const pick = this.findBestCountry(raw) || raw;
      const row = this.findRowByCountry(pick);
      if (!row){
        this.setStatus('Country not found in data.');
        this.renderDetails(null);
        return;
      }
      this.state.selected = { country: row[this.state.countryKey], row };
      this.renderDetails(row);
      this.setStatus('Results for: ' + row[this.state.countryKey]);
      const url = new URL(location.href);
      url.searchParams.set('country', row[this.state.countryKey]);
      history.replaceState(null, '', url.toString());
    }

    findRowByCountry(value){
      const nval = this.normalize(value);
      const key = this.state.countryKey;
      const norm = v => this.normalize(v);
      let row = this.state.data.find(r => norm(r[key]) === nval);
      if (row) return row;
      row = this.state.data.find(r => norm(r[key]).startsWith(nval));
      if (row) return row;
      row = this.state.data.find(r => norm(r[key]).includes(nval));
      return row || null;
    }

    collectMulti(row, base){
      const out = [];
      const nb = this.normalize(base);
      for (const k of Object.keys(row)){
        const nk = this.normalize(k);
        if (nk === nb || nk.startsWith(nb)) {
          const v = row[k];
          if (v !== null && v !== undefined) {
            const s = String(v).replace(/\u00A0/g,' ').trim();
            if (s) out.push(s);
          }
        }
      }
      return Array.from(new Set(out));
    }

    extractLinksFromSrcs(srcs){
      const out = [];
      const push = (u)=>{
        if (!u) return;
        let href = String(u).trim();
        const re = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
        let m;
        while ((m = re.exec(href)) !== null){
          let url = m[1];
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/\//,'').replace(/^www\./i,'www.');
          out.push(url);
        }
        if (out.length === 0 && /\.[a-z]{2,}(?:\/\S*)?$/i.test(href) && !/\s/.test(href)){
          let url = href;
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/\//,'').replace(/^www\./i,'www.');
          out.push(url);
        }
      };
      for (const s of srcs){
        if (typeof s === 'string' && s.trim()){
          const parts = s.split(/[\n;,|]+/g).map(x => x.trim()).filter(Boolean);
          if (parts.length){
            parts.forEach(push);
          } else {
            push(s);
          }
        }
      }
      const seen = new Set();
      const dedup = [];
      for (const u of out){
        if (!seen.has(u)){ seen.add(u); dedup.push(u); }
      }
      return dedup;
    }

    renderDetails(row){
      const tOpt = this.shadowRoot.getElementById('field-optout');
      const tSpec = this.shadowRoot.getElementById('field-specific');
      const tReco = this.shadowRoot.getElementById('field-countermeasures');
      const tSrcs = this.shadowRoot.getElementById('field-sources');
      const listReco = this.shadowRoot.getElementById('list-countermeasures');
      const links = this.shadowRoot.getElementById('links-sources');
      if (!row){
        [tOpt,tSpec,tReco,tSrcs].forEach(el => el.value = '');
        listReco.innerHTML = '';
        links.innerHTML = '';
        return;
      }
      const optKey = this.findCol(['Machine‑readable opt‑out protects against commercial TDM?','Machine-readable opt-out protects against commercial TDM?']);
      const specKey = this.findCol(['Specific limitation']);
      tOpt.value = row[optKey] ?? '';
      tSpec.value = row[specKey] ?? '';

      const recos = this.collectMulti(row, 'Recommended countermeasures');
      if ((this.state.recMode || 'text') === 'list'){
        tReco.value = '';
        listReco.innerHTML = recos.map(r => `<li>${this.escapeHTML(r)}</li>`).join('');
      } else {
        tReco.value = recos.length ? '• ' + recos.join('\n• ') : '';
        listReco.innerHTML = '';
      }

      const srcsRaw = this.collectMulti(row, 'Sources (URLs)');
      const urls = this.extractLinksFromSrcs(srcsRaw);
      if ((this.state.srcMode || 'text') === 'links'){
        tSrcs.value = '';
        if (urls.length){
          links.innerHTML = urls.map(u => {
            const safe = this.escapeHTML(u);
            const label = safe.length > 88 ? safe.slice(0,88) + '…' : safe;
            return `<div><a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a></div>`;
          }).join('');
        } else {
          links.innerHTML = srcsRaw.map(s => `<div>${this.escapeHTML(String(s))}</div>`).join('');
        }
      } else {
        tSrcs.value = srcsRaw.join('\n');
        links.innerHTML = '';
      }
    }

    escapeHTML(s){
      const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
      return String(s).replace(/[&<>"']/g, (m) => map[m]);
    }

    findCol(candidates){
      const cols = Object.keys(this.state.data[0] || {});
      const norm = s => this.normalize(s);
      const hit = (c1,c2) => norm(c1) === norm(c2);
      const byEq = candidates.find(name => cols.some(c => hit(c,name)));
      if (byEq) return cols.find(c => hit(c,byEq));
      const byStart = candidates.find(name => cols.some(c => norm(c).startsWith(norm(name))));
      if (byStart) return cols.find(c => norm(c).startsWith(norm(byStart)));
      return candidates[0];
    }
  }
  customElements.define('ocoso-country-lookup', OcosoCountryLookup);
})();
