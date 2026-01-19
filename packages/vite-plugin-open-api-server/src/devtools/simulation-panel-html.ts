/**
 * Simulation Panel HTML Generator for Vue DevTools
 *
 * ## What
 * Generates an HTML page as a data URL for the DevTools custom tab iframe.
 * This provides the simulation panel UI for configuring API mock responses.
 *
 * ## How
 * Creates a self-contained HTML page with embedded CSS and JavaScript that:
 * - Fetches endpoints from the registry API
 * - Allows selecting an endpoint and configuring simulation parameters
 * - Generates simulation URLs with query parameters
 * - Provides copy-to-clipboard functionality
 *
 * ## Why
 * The Vue DevTools SFC view type doesn't work reliably, so we use an iframe
 * with a data URL containing the complete HTML application.
 *
 * @module
 */

import { BUILT_IN_PRESETS } from './simulation-types.js';

/**
 * Generates the HTML content for the simulation panel.
 *
 * @param proxyPath - The proxy path for the API (e.g., '/api/v3')
 * @returns Complete HTML page as a string
 */
export function generateSimulationPanelHtml(proxyPath: string): string {
  const presetsJson = JSON.stringify(BUILT_IN_PRESETS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulation Panel</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #e5e5e5;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
    }

    h2 {
      color: #4ade80;
      font-size: 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: #a3a3a3;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    label {
      display: block;
      font-size: 12px;
      color: #a3a3a3;
      margin-bottom: 4px;
    }

    select, input[type="number"] {
      width: 100%;
      padding: 8px 12px;
      background: #262626;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e5e5e5;
      font-size: 13px;
      margin-bottom: 12px;
      outline: none;
      transition: border-color 0.2s;
    }

    select:focus, input[type="number"]:focus {
      border-color: #4ade80;
    }

    select:hover, input[type="number"]:hover {
      border-color: #525252;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .grid-2 > div {
      margin-bottom: 0;
    }

    .grid-2 select, .grid-2 input {
      margin-bottom: 0;
    }

    .url-box {
      background: #262626;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .url-label {
      font-size: 11px;
      color: #737373;
      margin-bottom: 4px;
    }

    .url-text {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 12px;
      color: #60a5fa;
      word-break: break-all;
      line-height: 1.6;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #4ade80;
      color: #052e16;
    }

    .btn-primary:hover {
      background: #22c55e;
    }

    .btn-secondary {
      background: #404040;
      color: #e5e5e5;
    }

    .btn-secondary:hover {
      background: #525252;
    }

    .btn-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 16px;
    }

    .preset-btn {
      padding: 10px 12px;
      background: #262626;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e5e5e5;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      border-color: #4ade80;
      background: #2d2d2d;
    }

    .preset-btn.active {
      border-color: #4ade80;
      background: #052e16;
    }

    .preset-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .preset-desc {
      font-size: 11px;
      color: #737373;
    }

    .endpoint-info {
      background: #262626;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .endpoint-method {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 8px;
    }

    .method-get { background: #065f46; color: #6ee7b7; }
    .method-post { background: #1e40af; color: #93c5fd; }
    .method-put { background: #c2410c; color: #fdba74; }
    .method-patch { background: #6b21a8; color: #d8b4fe; }
    .method-delete { background: #991b1b; color: #fca5a5; }

    .endpoint-path {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #737373;
    }

    .error {
      background: #450a0a;
      border: 1px solid #dc2626;
      border-radius: 6px;
      padding: 12px;
      color: #fca5a5;
      margin-bottom: 16px;
    }

    .success-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #052e16;
      border: 1px solid #4ade80;
      color: #4ade80;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 13px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s;
      pointer-events: none;
    }

    .success-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .divider {
      height: 1px;
      background: #404040;
      margin: 20px 0;
    }

    .help-text {
      font-size: 11px;
      color: #737373;
      margin-top: 4px;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      margin-left: 6px;
    }

    .badge-handler { background: #1e40af; color: #93c5fd; }
    .badge-seed { background: #065f46; color: #6ee7b7; }
  </style>
</head>
<body>
  <h2>🧪 Simulation Panel</h2>

  <div id="app">
    <div class="loading" id="loading">Loading endpoints...</div>
    <div id="error" class="error" style="display: none;"></div>
    <div id="content" style="display: none;">

      <!-- Endpoint Selection -->
      <div class="section">
        <div class="section-title">Select Endpoint</div>
        <select id="endpoint-select">
          <option value="">-- Select an endpoint --</option>
        </select>
        <div id="endpoint-info" class="endpoint-info" style="display: none;"></div>
      </div>

      <!-- Quick Presets -->
      <div class="section">
        <div class="section-title">Quick Presets</div>
        <div class="preset-grid" id="preset-grid"></div>
      </div>

      <div class="divider"></div>

      <!-- Simulation Parameters -->
      <div class="section">
        <div class="section-title">Parameters</div>

        <div class="grid-2">
          <div>
            <label for="status-code">Status Code</label>
            <select id="status-code">
              <option value="">Default (from spec)</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="204">204 No Content</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="404">404 Not Found</option>
              <option value="422">422 Unprocessable</option>
              <option value="429">429 Too Many Requests</option>
              <option value="500">500 Server Error</option>
              <option value="502">502 Bad Gateway</option>
              <option value="503">503 Unavailable</option>
            </select>
          </div>
          <div>
            <label for="delay">Delay (ms)</label>
            <input type="number" id="delay" value="0" min="0" step="100" placeholder="0">
          </div>
        </div>

        <div class="grid-2">
          <div>
            <label for="error-type">Error Type</label>
            <select id="error-type">
              <option value="none">None</option>
              <option value="timeout">Timeout</option>
              <option value="network-error">Network Error</option>
              <option value="server-error">Server Error</option>
              <option value="rate-limit">Rate Limited (429)</option>
              <option value="service-unavailable">Unavailable (503)</option>
            </select>
          </div>
          <div>
            <label for="edge-case">Edge Case</label>
            <select id="edge-case">
              <option value="normal">Normal Response</option>
              <option value="empty-response">Empty Body</option>
              <option value="empty-array">Empty Array []</option>
              <option value="null-values">Null Values</option>
              <option value="malformed-json">Malformed JSON</option>
              <option value="large-response">Large Response</option>
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <label for="network-preset">Network Condition</label>
            <select id="network-preset">
              <option value="none">None</option>
              <option value="3g-slow">3G Slow (2000ms)</option>
              <option value="3g-fast">3G Fast (750ms)</option>
              <option value="4g">4G (100ms)</option>
              <option value="slow-connection">Slow (5000ms)</option>
            </select>
          </div>
          <div>
            <label for="connection-type">Connection</label>
            <select id="connection-type">
              <option value="normal">Normal</option>
              <option value="drop">Drop Connection</option>
              <option value="reset">Reset Connection</option>
              <option value="partial">Partial Response</option>
            </select>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Generated URL -->
      <div class="section">
        <div class="section-title">Generated URL</div>
        <div class="url-box">
          <div class="url-label">Use this URL to test the simulated response:</div>
          <div class="url-text" id="generated-url">Select an endpoint to generate URL</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" id="copy-btn" disabled>📋 Copy URL</button>
          <button class="btn btn-secondary" id="reset-btn">🔄 Reset</button>
        </div>
      </div>

    </div>
  </div>

  <div class="success-toast" id="toast">✓ URL copied to clipboard!</div>

  <script>
    const PROXY_PATH = '${proxyPath}';
    const PRESETS = ${presetsJson};

    // State
    let endpoints = [];
    let selectedEndpoint = null;

    // DOM Elements
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('content');
    const endpointSelect = document.getElementById('endpoint-select');
    const endpointInfo = document.getElementById('endpoint-info');
    const presetGrid = document.getElementById('preset-grid');
    const statusCode = document.getElementById('status-code');
    const delay = document.getElementById('delay');
    const errorType = document.getElementById('error-type');
    const edgeCase = document.getElementById('edge-case');
    const networkPreset = document.getElementById('network-preset');
    const connectionType = document.getElementById('connection-type');
    const generatedUrl = document.getElementById('generated-url');
    const copyBtn = document.getElementById('copy-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toast = document.getElementById('toast');

    // Initialize
    async function init() {
      try {
        await fetchEndpoints();
        renderPresets();
        setupEventListeners();
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
      } catch (err) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Failed to load endpoints: ' + err.message;
        errorEl.style.display = 'block';
      }
    }

    async function fetchEndpoints() {
      // Fetch from registry API (iframe can't access parent window due to cross-origin)
      const response = await fetch(PROXY_PATH + '/_openapiserver/registry');
      if (!response.ok) throw new Error('Registry not available');
      const data = await response.json();
      endpoints = Object.values(data.endpoints || {});
      renderEndpoints();
    }

    function renderEndpoints() {
      endpoints.forEach(ep => {
        const option = document.createElement('option');
        option.value = ep.operationId;
        option.textContent = ep.method.toUpperCase() + ' ' + ep.path + ' (' + ep.operationId + ')';
        endpointSelect.appendChild(option);
      });
    }

    function renderPresets() {
      PRESETS.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.dataset.presetId = preset.id;
        btn.innerHTML = '<div class="preset-name">' + (preset.icon || '') + ' ' + preset.name + '</div>' +
                        '<div class="preset-desc">' + preset.description + '</div>';
        btn.onclick = () => applyPreset(preset);
        presetGrid.appendChild(btn);
      });
    }

    function applyPreset(preset) {
      // Update UI
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-preset-id="' + preset.id + '"]').classList.add('active');

      // Apply params
      if (preset.params.statusCode) statusCode.value = preset.params.statusCode;
      if (preset.params.delay !== undefined) delay.value = preset.params.delay;
      if (preset.params.errorType) errorType.value = preset.params.errorType;
      if (preset.params.edgeCase) edgeCase.value = preset.params.edgeCase;
      if (preset.params.networkPreset) networkPreset.value = preset.params.networkPreset;
      if (preset.params.connectionType) connectionType.value = preset.params.connectionType;

      updateUrl();
    }

    function setupEventListeners() {
      endpointSelect.onchange = () => {
        const opId = endpointSelect.value;
        selectedEndpoint = endpoints.find(ep => ep.operationId === opId) || null;

        if (selectedEndpoint) {
          const methodClass = 'method-' + selectedEndpoint.method.toLowerCase();
          let badges = '';
          if (selectedEndpoint.hasHandler) badges += '<span class="badge badge-handler">Handler</span>';
          if (selectedEndpoint.hasSeed) badges += '<span class="badge badge-seed">Seed</span>';

          endpointInfo.innerHTML =
            '<span class="endpoint-method ' + methodClass + '">' + selectedEndpoint.method.toUpperCase() + '</span>' +
            '<span class="endpoint-path">' + selectedEndpoint.path + '</span>' +
            badges;
          endpointInfo.style.display = 'block';
          copyBtn.disabled = false;
        } else {
          endpointInfo.style.display = 'none';
          copyBtn.disabled = true;
        }
        updateUrl();
      };

      [statusCode, delay, errorType, edgeCase, networkPreset, connectionType].forEach(el => {
        el.onchange = updateUrl;
        el.oninput = updateUrl;
      });

      copyBtn.onclick = copyUrl;
      resetBtn.onclick = resetForm;
    }

    function updateUrl() {
      if (!selectedEndpoint) {
        generatedUrl.textContent = 'Select an endpoint to generate URL';
        return;
      }

      const params = new URLSearchParams();

      if (statusCode.value) params.set('_status', statusCode.value);
      if (parseInt(delay.value) > 0) params.set('_delay', delay.value);
      if (errorType.value && errorType.value !== 'none') params.set('_error', errorType.value);
      if (edgeCase.value && edgeCase.value !== 'normal') params.set('_edge', edgeCase.value);
      if (networkPreset.value && networkPreset.value !== 'none') params.set('_network', networkPreset.value);
      if (connectionType.value && connectionType.value !== 'normal') params.set('_connection', connectionType.value);

      const queryString = params.toString();
      const url = window.location.origin + PROXY_PATH + selectedEndpoint.path +
                  (queryString ? '?' + queryString : '');

      generatedUrl.textContent = url;
    }

    async function copyUrl() {
      const url = generatedUrl.textContent;
      if (!url || url.startsWith('Select')) return;

      try {
        await navigator.clipboard.writeText(url);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    }

    function resetForm() {
      statusCode.value = '';
      delay.value = '0';
      errorType.value = 'none';
      edgeCase.value = 'normal';
      networkPreset.value = 'none';
      connectionType.value = 'normal';
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      updateUrl();
    }

    // Start
    init();
  </script>
</body>
</html>`;
}

/**
 * Generates a data URL containing the simulation panel HTML.
 *
 * @param proxyPath - The proxy path for the API (e.g., '/api/v3')
 * @returns Data URL that can be used as iframe src
 */
export function generateSimulationPanelDataUrl(proxyPath: string): string {
  const html = generateSimulationPanelHtml(proxyPath);
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}
