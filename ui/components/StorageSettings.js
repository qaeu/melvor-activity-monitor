"use strict";
/// <reference path="../../../types/melvor.d.ts" />
/// <reference path="../globals.d.ts" />
/**
 * Activity Monitor - Storage Settings Components
 * Custom settings with lit-html for conditional visibility
 */
/**
 * Storage Mode Setting with conditional sub-settings
 * Uses lit-html to render sub-settings conditionally
 */
function StorageModeSetting() {
    const [storageMode, setStorageMode] = useState('local-storage');
    const [characterSaveType, setCharacterSaveType] = useState('percentage');
    const [characterSavePercentage, setCharacterSavePercentage] = useState(20);
    const [characterSaveLineCount, setCharacterSaveLineCount] = useState(100);
    const [localStorageLineCount, setLocalStorageLineCount] = useState(500);
    // Load initial values from settings
    useEffect(() => {
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            setStorageMode(settings.getSetting('storageMode') || 'local-storage');
            setCharacterSaveType(settings.getSetting('characterSaveType') || 'percentage');
            setCharacterSavePercentage(settings.getSetting('characterSavePercentage') || 20);
            setCharacterSaveLineCount(settings.getSetting('characterSaveLineCount') || 100);
            setLocalStorageLineCount(settings.getSetting('localStorageLineCount') || 500);
        }
    }, []);
    // Handle storage mode change
    const handleStorageModeChange = (e) => {
        const value = e.target.value;
        setStorageMode(value);
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            settings.setSetting('storageMode', value);
        }
        // Dispatch event for storage system
        document.dispatchEvent(new CustomEvent('activity-monitor-storage-mode-changed', {
            detail: { mode: value }
        }));
    };
    // Handle character save type change
    const handleCharacterSaveTypeChange = (e) => {
        const value = e.target.value;
        setCharacterSaveType(value);
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            settings.setSetting('characterSaveType', value);
        }
    };
    // Handle percentage change
    const handlePercentageChange = (e) => {
        const value = parseInt(e.target.value);
        setCharacterSavePercentage(value);
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            settings.setSetting('characterSavePercentage', value);
        }
    };
    // Handle character save line count change
    const handleCharacterSaveLineCountChange = (e) => {
        const value = parseInt(e.target.value);
        setCharacterSaveLineCount(value);
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            settings.setSetting('characterSaveLineCount', value);
        }
    };
    // Handle local storage line count change
    const handleLocalStorageLineCountChange = (e) => {
        const value = parseInt(e.target.value);
        setLocalStorageLineCount(value);
        const settings = globalThis.ActivityMonitorMod?.settings;
        if (settings) {
            settings.setSetting('localStorageLineCount', value);
        }
    };
    return html `
    <div class="mb-4">
      <label class="form-label">Storage Mode</label>
      <small class="form-text text-muted d-block mb-2">Where to store notification history</small>
      <select class="form-control" .value=${storageMode} @change=${handleStorageModeChange}>
        <option value="local-storage">Browser Local Storage</option>
        <option value="character-save">Character Save (Cloud Sync, 8KB limit)</option>
        <option value="memory-only">Memory Only (Lost on reload)</option>
      </select>
    </div>
    
    ${storageMode === 'character-save' ? html `
      <div class="mb-4">
        <label class="form-label">Limit Type</label>
        <small class="form-text text-muted d-block mb-2">How to limit notifications (only for Character Save mode)</small>
        <select class="form-control" .value=${characterSaveType} @change=${handleCharacterSaveTypeChange}>
          <option value="percentage">Percentage of 8KB Max</option>
          <option value="line-count">Fixed Line Count</option>
        </select>
      </div>
      
      ${characterSaveType === 'percentage' ? html `
        <div class="mb-4">
          <label class="form-label">Percentage of Storage</label>
          <small class="form-text text-muted d-block mb-2">Percentage of 8KB to use (1-100%). 20% ≈ 25-30 notifications</small>
          <input 
            type="number" 
            class="form-control" 
            min="1" 
            max="100" 
            .value=${characterSavePercentage.toString()}
            @input=${handlePercentageChange}
          />
        </div>
      ` : html `
        <div class="mb-4">
          <label class="form-label">Line Count Limit</label>
          <small class="form-text text-muted d-block mb-2">Maximum notifications to store</small>
          <select class="form-control" .value=${characterSaveLineCount.toString()} @change=${handleCharacterSaveLineCountChange}>
            <option value="50">50 notifications</option>
            <option value="100">100 notifications</option>
            <option value="250">250 notifications</option>
            <option value="500">500 notifications</option>
            <option value="1000">1000 notifications</option>
          </select>
        </div>
      `}
    ` : ''}
    
    ${storageMode === 'local-storage' ? html `
      <div class="mb-4">
        <label class="form-label">Max Notifications</label>
        <small class="form-text text-muted d-block mb-2">Maximum notifications to store (only for Local Storage mode)</small>
        <select class="form-control" .value=${localStorageLineCount.toString()} @change=${handleLocalStorageLineCountChange}>
          <option value="100">100 notifications</option>
          <option value="250">250 notifications</option>
          <option value="500">500 notifications</option>
          <option value="1000">1000 notifications</option>
          <option value="2500">2500 notifications</option>
          <option value="5000">5000 notifications</option>
        </select>
      </div>
    ` : ''}
  `;
}
// Define custom element (disable shadow DOM to allow global CSS)
customElements.define('storage-mode-setting', component(StorageModeSetting, { useShadowDOM: false }));
//# sourceMappingURL=StorageSettings.js.map