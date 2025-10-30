/*
  File: app.js
  Purpose: Client-side logic for the War Recommender frontend. Handles input,
           builds the API request URL with proper encoding, fetches data,
           parses the response safely, and renders a responsive, sortable table.
  Notes:
    - The API response body is a stringified JSON array inside a "body" field.
      This script gracefully handles variations (array vs string vs object).
    - Extensive comments included for clarity and future maintenance.
*/

(() => {
  // ============================
  // Configuration constants
  // ============================
  const API_BASE_URL = 'https://13hfp225yh.execute-api.us-east-1.amazonaws.com/prod/war-recommender';

  // ============================
  // DOM references
  // ============================
  const form = document.getElementById('search-form');
  const clanTagInput = document.getElementById('clanTag');
  const useSampleBtn = document.getElementById('use-sample');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const resultsCard = document.getElementById('results');
  const tableBody = document.getElementById('table-body');
  const summaryEl = document.getElementById('summary');

  // Sort state stored globally within this closure.
  let sortState = { key: 'townHall', dir: 'desc' }; // default sort by TH desc
  let currentData = []; // holds the last fetched data for re-rendering (sorting, etc.)

  // ============================
  // Utility helpers
  // ============================

  /**
   * Coerce a value to number if possible; otherwise return NaN.
   * Many API fields are strings – this normalizes them for sorting/math.
   */
  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  /**
   * Build the full API URL by ensuring '#'(hash) is preserved and encoded as %23.
   * Accepts user input with or without '#'.
   */
  function buildApiUrl(rawTag) {
    // Trim and early return if empty
    let tag = (rawTag || '').trim();
    if (!tag) return null;

    // Ensure it starts with '#'; add it if missing
    if (!tag.startsWith('#')) tag = '#' + tag;

    // Encode the entire value; this will convert '#' to '%23'
    const encoded = encodeURIComponent(tag);

    // Produce a final URL with the correct query param
    const url = `${API_BASE_URL}?clanTag=${encoded}`;
    return { url, normalizedTag: tag };
  }

  /**
   * Parse the API JSON payload into a normalized array of member objects.
   * Handles the case where data.body is a string (stringified JSON) or already parsed.
   */
  function parseApiPayload(data) {
    // Some API Gateway setups return an object like { statusCode, headers, body: '...string...' }
    // where body is a JSON string of an array. Handle a few possibilities.
    let body = data;

    // If top-level is an object with a 'body' key, use it.
    if (data && typeof data === 'object' && 'body' in data) {
      body = data.body;
    }

    // If body is a string, try to JSON.parse it.
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err) {
        throw new Error('Received body as string but failed to parse JSON.');
      }
    }

    // If body is now an object with 'body' again (double-wrapped), unwrap once more.
    if (body && typeof body === 'object' && 'body' in body) {
      body = body.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }
    }

    // Finally, ensure we have an array
    if (!Array.isArray(body)) {
      throw new Error('Unexpected response shape. Expected an array of members.');
    }

    // Normalize each record, ensuring numeric fields are numbers for sorting/rendering
    return body.map((item) => {
      // Defensive cloning and normalization
      const o = { ...item };
      o.townHall = toNumber(o.townHall);
      o.cumAttacksUsed = toNumber(o.cumAttacksUsed);
      o.cumAttacksPossible = toNumber(o.cumAttacksPossible);
      o.cumDestructionPct = toNumber(o.cumDestructionPct);
      // Compute attacks left as a convenience
      o.attacksLeft = Number.isFinite(o.cumAttacksPossible) && Number.isFinite(o.cumAttacksUsed)
        ? Math.max(0, o.cumAttacksPossible - o.cumAttacksUsed)
        : NaN;
      return o;
    });
  }

  /** Format ISO timestamp to a short, local-friendly string. */
  function formatDateTime(iso) {
    if (!iso) return '-';
    try {
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return iso; // Fallback to raw if invalid
      return dt.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  /** Show or hide loading state. */
  function setLoading(isLoading) {
    loadingEl.classList.toggle('hidden', !isLoading);
    // Optionally disable the submit button while loading
    const btn = document.getElementById('submit-btn');
    if (btn) btn.disabled = !!isLoading;
  }

  /** Display an error banner with a friendly message. */
  function showError(message) {
    if (!message) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  /** Render summary line above the table. */
  function renderSummary(data, clanTag) {
    if (!Array.isArray(data)) return;
    const total = data.length;
    const totalAttacks = data.reduce((acc, x) => acc + (Number.isFinite(x.cumAttacksUsed) ? x.cumAttacksUsed : 0), 0);
    const totalPossible = data.reduce((acc, x) => acc + (Number.isFinite(x.cumAttacksPossible) ? x.cumAttacksPossible : 0), 0);
    const avgDestruction = data.length
      ? (data.reduce((acc, x) => acc + (Number.isFinite(x.cumDestructionPct) ? x.cumDestructionPct : 0), 0) / data.length)
      : 0;

    summaryEl.innerHTML = `
      Showing <strong>${total}</strong> members for <strong>${clanTag}</strong>
      • Attacks used: <strong>${totalAttacks}</strong> / ${totalPossible}
      • Avg destruction: <strong>${Math.round(avgDestruction)}</strong>%
    `;

    summaryEl.classList.remove('hidden');
  }

  /** Render the table rows using the provided data. */
  function renderTableRows(data) {
    const rowsHtml = data.map((m) => {
      // Choose badge color for attacks left
      let attacksClass = 'success';
      if (Number.isFinite(m.attacksLeft)) {
        if (m.attacksLeft === 0) attacksClass = 'danger';
        else if (m.attacksLeft === 1) attacksClass = 'warn';
        else attacksClass = 'success';
      }

      return `
        <tr>
          <td>${escapeHtml(m.playerName || '-')}</td>
          <td>${Number.isFinite(m.townHall) ? m.townHall : '-'}</td>
          <td>${Number.isFinite(m.cumAttacksUsed) ? m.cumAttacksUsed : '-'}</td>
          <td>${Number.isFinite(m.cumAttacksPossible) ? m.cumAttacksPossible : '-'}</td>
          <td><span class="badge ${attacksClass}">${Number.isFinite(m.attacksLeft) ? m.attacksLeft : '-'}</span></td>
          <td>${Number.isFinite(m.cumDestructionPct) ? m.cumDestructionPct : '-'}</td>
          <td title="${escapeHtml(m.lastUpdated || '')}">${escapeHtml(formatDateTime(m.lastUpdated))}</td>
          <td>${escapeHtml(m.playerID || '-')}</td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = rowsHtml || `<tr><td colspan="8" style="text-align:center; color: var(--muted); padding: 16px;">No results to display.</td></tr>`;
  }

  /** Basic HTML escape to prevent injection in text content. */
  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Sort an array of objects by the provided key and direction.
   * Numeric keys are sorted numerically; others lexicographically.
   */
  function sortData(data, key, dir) {
    const isAsc = dir === 'asc';
    const sorted = [...data].sort((a, b) => {
      const va = a[key];
      const vb = b[key];

      const aNum = toNumber(va);
      const bNum = toNumber(vb);
      const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

      if (bothNumeric) {
        return isAsc ? aNum - bNum : bNum - aNum;
      }

      // Fallback to string comparison
      const sa = String(va ?? '').toLowerCase();
      const sb = String(vb ?? '').toLowerCase();
      if (sa < sb) return isAsc ? -1 : 1;
      if (sa > sb) return isAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  /** Update sorting header UI (optional minimal cue via title) */
  function updateSortHeaderUI() {
    const ths = document.querySelectorAll('#results-table thead th');
    ths.forEach((th) => {
      const key = th.getAttribute('data-sort');
      if (!key) return;
      if (key === sortState.key) {
        th.title = `Sorted by ${key} (${sortState.dir})`;
      } else {
        th.title = 'Click to sort';
      }
    });
  }

  /** Attach click listeners for sorting table columns. */
  function initSorting() {
    const thead = document.querySelector('#results-table thead');
    if (!thead) return;
    thead.addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      const key = th.getAttribute('data-sort');
      if (!key) return;

      // Toggle direction if same key, otherwise default to desc for numbers
      let dir = 'desc';
      if (sortState.key === key) dir = sortState.dir === 'desc' ? 'asc' : 'desc';
      sortState = { key, dir };

      // Re-render with new sort
      const sorted = sortData(currentData, sortState.key, sortState.dir);
      renderTableRows(sorted);
      updateSortHeaderUI();
    });
  }

  // ============================
  // Fetch and render pipeline
  // ============================

  /** Fetch data from the API and render it. */
  async function fetchAndRender(clanTag) {
    // Build URL (with encoding for '#')
    const built = buildApiUrl(clanTag);
    if (!built) {
      showError('Please enter a clan tag.');
      return;
    }

    // Update URL query param for shareable links
    syncUrlQuery(built.normalizedTag);

    setLoading(true);
    showError('');
    resultsCard.classList.add('hidden');
    summaryEl.classList.add('hidden');

    try {
      // Perform the fetch with CORS mode; note CORS must be enabled server-side
      const resp = await fetch(built.url, { method: 'GET', mode: 'cors' });
      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
      }
      const json = await resp.json();
      const data = parseApiPayload(json);

      // Keep in memory for re-sorting
      currentData = data;

      // Default sorting: TH desc, then destruction desc, then player name asc
      const primarySorted = sortData(currentData, sortState.key, sortState.dir);

      // Render summary and table
      renderSummary(primarySorted, built.normalizedTag);
      renderTableRows(primarySorted);
      resultsCard.classList.remove('hidden');
      updateSortHeaderUI();
    } catch (err) {
      // Common pitfall: CORS. Provide a helpful hint in the error message.
      const hint = `If this is a CORS error, ensure the API allows browser requests (Access-Control-Allow-Origin).`;
      showError(`${err.message || err}. ${hint}`);
      console.error(err);
      tableBody.innerHTML = '';
    } finally {
      setLoading(false);
    }
  }

  /** Update the browser URL with the current clanTag for easy sharing/bookmarks. */
  function syncUrlQuery(clanTag) {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('clanTag', clanTag);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    } catch {}
  }

  /** On load, if a clanTag is present in the URL, prefill and auto-fetch. */
  function initFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tag = params.get('clanTag');
      if (tag) {
        clanTagInput.value = decodeURIComponent(tag);
        // Auto fetch on load
        fetchAndRender(clanTagInput.value);
      }
    } catch {}
  }

  // ============================
  // Event wiring
  // ============================

  function initEvents() {
    // Form submission handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = clanTagInput.value;
      fetchAndRender(value);
    });

    // Provide a quick sample button for convenience
    useSampleBtn.addEventListener('click', () => {
      clanTagInput.value = '#2R999VL92';
      fetchAndRender(clanTagInput.value);
    });

    // Optional: submit on Enter key press in the input explicitly
    clanTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }

  // ============================
  // Initialize app
  // ============================

  function init() {
    initEvents();
    initSorting();
    initFromUrl();
  }

  // Kick off when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
