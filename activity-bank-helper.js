/* ESL English - helper central del banco de palabras.
   Uso básico:
   const bank = await ESLBank.getActivityBank("mi-actividad");
   ESLBank.saveActivityBank("mi-actividad", activityData);
   ESLBank.downloadFullBank();

   PRIORIDAD DEL BANCO:
   - "github": solo se usa cuando index.html sincroniza explícitamente con GitHub/servidor.
   - "localStorage": las actividades leen el banco guardado en el navegador.

   El modo de sincronización se controla desde el menú inicial:
  - ON  = index.html descarga GitHub al abrir la página inicial y actualiza el banco local.
  - OFF = index.html no sincroniza; las actividades usan el banco local existente.
*/
(function () {
  const SYNC_SETTING_KEY = "ESL_SYNC_BANK_ON";

  function isGitHubSyncEnabled() {
    try {
      return localStorage.getItem(SYNC_SETTING_KEY) !== "0"; // por defecto ON
    } catch (error) {
      return true;
    }
  }

  function setGitHubSyncEnabled(enabled) {
    try {
      localStorage.setItem(SYNC_SETTING_KEY, enabled ? "1" : "0");
    } catch (error) {}
    clearSessionBank();
    return isGitHubSyncEnabled();
  }

  function getBankPriority() {
    // Las actividades no deben consultar GitHub cada vez que se abren.
    // GitHub se usa únicamente cuando index.html llama loadFullBank({ priority:"github" }).
    return "localStorage";
  }

  const BANK_PRIORITY = getBankPriority(); // compatibilidad: valor al cargar el helper

  // Si está activo, el banco se descarga una sola vez por pestaña/sesión.
  // Al cerrar la pestaña y abrir de nuevo, se vuelve a consultar GitHub.
  const USE_SESSION_CACHE = true;

  // Misma clave usada por las actividades actuales.
  const STORAGE_KEY = "ESL_ENGLISH_WORD_BANKS_V1";

  // Clave antigua del helper, se mantiene como respaldo por compatibilidad.
  const LEGACY_STORAGE_KEY = "ESL_ENGLISH_WORD_BANK";

  // Claves usadas por las actividades antiguas/nuevas para guardar snapshots por actividad.
  // Si estas claves quedan viejas, ganan sobre el banco central y por eso en navegador normal
  // se ven datos antiguos aunque index.html haya sincronizado GitHub.
  const PLATFORM_SNAPSHOT_KEY = "ESL_WORD_BANK_PLATFORM_SNAPSHOT";
  const PLATFORM_FULL_KEY = "ESL_WORD_BANK_FULL";
  const ACTIVITY_STORAGE_PREFIX = "ESL_ACTIVITY_BANK_";

  // Claves privadas antiguas de actividades que también deben actualizarse al sincronizar.
  const ACTIVITY_PRIVATE_STORAGE_KEYS = {
    hangman: "hangman_arena_75_bank_v2"
  };

  // Copia rápida mientras la pestaña esté abierta.
  const SESSION_STORAGE_KEY = "ESL_SESSION_WORD_BANK";
  const SESSION_VERSION_KEY = "ESL_BANK_SESSION_VERSION";

  const BANK_FILE = "word-bank-esl-english.json";
  const VALID_SCHEMA = /^esl-word-bank-v\d+$/;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getSessionVersion() {
    try {
      let version = sessionStorage.getItem(SESSION_VERSION_KEY);
      if (!version) {
        version = String(Date.now());
        sessionStorage.setItem(SESSION_VERSION_KEY, version);
      }
      return version;
    } catch (error) {
      return String(Date.now());
    }
  }

  function cacheBustedUrl(path, forceRefresh = false) {
    const separator = path.includes("?") ? "&" : "?";
    const version = forceRefresh
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      : getSessionVersion();
    return `${path}${separator}v=${encodeURIComponent(version)}`;
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(cacheBustedUrl(path, !!options.forceRefresh), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" }
    });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  function isValidBank(bank) {
    return bank && VALID_SCHEMA.test(String(bank.schema || "")) && bank.activities && typeof bank.activities === "object";
  }

  function readBankFromKey(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return isValidBank(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function readLocalBank() {
    return readBankFromKey(STORAGE_KEY) || readBankFromKey(LEGACY_STORAGE_KEY);
  }

  function readSessionBank() {
    if (!USE_SESSION_CACHE) return null;
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || "null");
      return isValidBank(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeSessionBank(bank) {
    if (!USE_SESSION_CACHE || !isValidBank(bank)) return;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(bank));
    } catch (error) {}
  }

  function clearSessionBank() {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_VERSION_KEY);
    } catch (error) {}
  }

  function listActivitySnapshotKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(ACTIVITY_STORAGE_PREFIX)) keys.push(key);
      }
    } catch (error) {}
    return keys;
  }

  function mirrorPlatformStorage(bank) {
    if (!isValidBank(bank)) return;
    const full = clone(bank);
    const activities = full.activities || {};

    // 1) Borra snapshots por actividad que pudieron quedar viejos en el navegador normal.
    listActivitySnapshotKeys().forEach(key => {
      try { localStorage.removeItem(key); } catch (error) {}
    });

    // 2) Reescribe los snapshots por actividad con la misma versión sincronizada desde GitHub.
    Object.entries(activities).forEach(([id, activity]) => {
      try { localStorage.setItem(ACTIVITY_STORAGE_PREFIX + id, JSON.stringify(activity)); } catch (error) {}
    });

    // 3) Actualiza las claves heredadas que varias actividades todavía consultan.
    try { localStorage.setItem(PLATFORM_SNAPSHOT_KEY, JSON.stringify(full)); } catch (error) {}
    try { localStorage.setItem(PLATFORM_FULL_KEY, JSON.stringify(full)); } catch (error) {}

    // 4) Actualiza claves privadas antiguas. Hangman lee esta clave antes de reconstruir el banco.
    Object.entries(ACTIVITY_PRIVATE_STORAGE_KEYS).forEach(([id, key]) => {
      try {
        const activity = activities[id];
        if (activity && activity.levels) localStorage.setItem(key, JSON.stringify(activity.levels));
      } catch (error) {}
    });

    // 5) Limpia la copia en memoria para que no mantenga snapshots anteriores.
    try {
      const memory = { activities: clone(activities) };
      Object.entries(activities).forEach(([id, activity]) => { memory[id] = clone(activity); });
      window.ESL_ACTIVITY_BANKS = memory;
    } catch (error) {}
  }

  function clearPlatformStorageSnapshots() {
    listActivitySnapshotKeys().forEach(key => {
      try { localStorage.removeItem(key); } catch (error) {}
    });
    try { localStorage.removeItem(PLATFORM_SNAPSHOT_KEY); } catch (error) {}
    try { localStorage.removeItem(PLATFORM_FULL_KEY); } catch (error) {}
    Object.values(ACTIVITY_PRIVATE_STORAGE_KEYS).forEach(key => {
      try { localStorage.removeItem(key); } catch (error) {}
    });
    try { window.ESL_ACTIVITY_BANKS = { activities: {} }; } catch (error) {}
  }

  function writeLocalBank(bank, options = {}) {
    if (!isValidBank(bank)) throw new Error("El Word Bank no tiene un formato válido.");
    const next = clone(bank);
    if (!options.preserveUpdatedAt) {
      next.updatedAt = new Date().toISOString();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch (error) {}
    mirrorPlatformStorage(next);
    writeSessionBank(next);
    return next;
  }

  async function loadExternalBank(options = {}) {
    if (!options.forceRefresh) {
      const sessionBank = readSessionBank();
      if (sessionBank) return clone(sessionBank);
    }

    const external = await fetchJson(BANK_FILE, { forceRefresh: !!options.forceRefresh });
    if (!isValidBank(external)) throw new Error("El Word Bank externo no tiene un formato válido.");
    return writeLocalBank(external, { preserveUpdatedAt: true });
  }

  async function loadFullBank(options = {}) {
    const priority = options.priority || "localStorage";
    const preferLocal = priority === "localStorage";

    if (!preferLocal) {
      const sessionBank = readSessionBank();
      if (sessionBank && !options.forceRefresh) return clone(sessionBank);
    }

    if (preferLocal) {
      const local = readLocalBank();
      if (local) {
        writeSessionBank(local);
        return clone(local);
      }
      return loadExternalBank(options);
    }

    try {
      return await loadExternalBank(options);
    } catch (externalError) {
      const local = readLocalBank();
      if (local) {
        writeSessionBank(local);
        return clone(local);
      }
      throw externalError;
    }
  }

  async function getActivityBank(activityId, options = {}) {
    const fullBank = await loadFullBank(options);
    return clone(fullBank.activities[activityId] || null);
  }

  async function ensureActivity(activityConfig) {
    const fullBank = await loadFullBank();
    const id = activityConfig.id;
    if (!id) throw new Error("La actividad necesita un id.");
    fullBank.activities[id] = fullBank.activities[id] || {
      title: activityConfig.title || id,
      file: activityConfig.file || `${id}.html`,
      bankType: activityConfig.bankType || "words",
      usesTranslation: !!activityConfig.usesTranslation,
      entryFormat: activityConfig.usesTranslation ? "word_translation" : "word",
      levels: {}
    };
    fullBank.levels = fullBank.levels || ["Inglés I", "Inglés II", "Inglés III", "Inglés IV"];
    fullBank.levels.forEach(level => {
      fullBank.activities[id].levels[level] = fullBank.activities[id].levels[level] || {};
    });
    return writeLocalBank(fullBank).activities[id];
  }

  async function saveActivityBank(activityId, activityData) {
    const fullBank = readLocalBank() || await loadFullBank({ priority: "localStorage" });
    fullBank.activities = fullBank.activities || {};
    fullBank.activities[activityId] = clone(activityData);
    return writeLocalBank(fullBank);
  }

  function parseCodeToCategories(codeText, usesTranslation) {
    const result = {};
    let currentCategory = "General";
    String(codeText || "").split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) return;
      const categoryMatch = line.match(/^Categor(?:ía|ia)\s*:\s*(.+)$/i);
      if (categoryMatch) {
        currentCategory = categoryMatch[1].trim() || "General";
        result[currentCategory] = result[currentCategory] || [];
        return;
      }
      result[currentCategory] = result[currentCategory] || [];
      if (usesTranslation) {
        const parts = line.split(/\s*=\s*|\s*:\s*/);
        const word = (parts[0] || "").trim();
        const translation = (parts.slice(1).join(" = ") || "").trim();
        if (word) result[currentCategory].push({ word, translation });
      } else {
        result[currentCategory].push(line);
      }
    });
    Object.keys(result).forEach(category => {
      if (!result[category].length) delete result[category];
    });
    return result;
  }

  async function applyCodeToActivityLevel(activityId, levelName, codeText) {
    const fullBank = readLocalBank() || await loadFullBank({ priority: "localStorage" });
    const activity = fullBank.activities[activityId];
    if (!activity) throw new Error(`No existe la actividad ${activityId} en el Word Bank.`);
    activity.levels = activity.levels || {};
    activity.levels[levelName] = parseCodeToCategories(codeText, !!activity.usesTranslation);
    return writeLocalBank(fullBank);
  }

  function downloadFullBank(filename = BANK_FILE) {
    const fullBank = readLocalBank();
    if (!fullBank) throw new Error("Primero carga o guarda el Word Bank.");
    const blob = new Blob([JSON.stringify(fullBank, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.ESLBank = {
    get BANK_PRIORITY() { return getBankPriority(); },
    getBankPriority,
    SYNC_SETTING_KEY,
    isGitHubSyncEnabled,
    setGitHubSyncEnabled,
    USE_SESSION_CACHE,
    STORAGE_KEY,
    SESSION_STORAGE_KEY,
    PLATFORM_SNAPSHOT_KEY,
    PLATFORM_FULL_KEY,
    ACTIVITY_STORAGE_PREFIX,
    BANK_FILE,
    loadFullBank,
    getFullWordBank: loadFullBank,
    getAllActivityBanks: async function(options = {}) { const bank = await loadFullBank(options); return clone(bank.activities || {}); },
    getActivityBank,
    ensureActivity,
    saveActivityBank,
    applyCodeToActivityLevel,
    parseCodeToCategories,
    downloadFullBank,
    readLocalBank,
    writeLocalBank,
    readSessionBank,
    clearSessionBank,
    mirrorPlatformStorage,
    clearPlatformStorageSnapshots
  };
})();
