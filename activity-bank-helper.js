/* ESL English - helper central del banco de palabras.
   Uso básico:
   const bank = await ESLBank.getActivityBank("mi-actividad");
   ESLBank.saveActivityBank("mi-actividad", activityData);
   ESLBank.downloadFullBank();

   PRIORIDAD DEL BANCO:
   - "github": primero carga word-bank-esl-english.json desde GitHub/servidor.
   - "localStorage": primero carga el banco guardado en el navegador.

   Para cambiar el comportamiento en el futuro, cambia solo esta línea:
*/
(function () {
  const BANK_PRIORITY = "github"; // opciones: "github" o "localStorage"

  // Si está activo, el banco se descarga una sola vez por pestaña/sesión.
  // Al cerrar la pestaña y abrir de nuevo, se vuelve a consultar GitHub.
  const USE_SESSION_CACHE = true;

  // Misma clave usada por las actividades actuales.
  const STORAGE_KEY = "ESL_ENGLISH_WORD_BANKS_V1";

  // Clave antigua del helper, se mantiene como respaldo por compatibilidad.
  const LEGACY_STORAGE_KEY = "ESL_ENGLISH_WORD_BANK";

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

  function cacheBustedUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${encodeURIComponent(getSessionVersion())}`;
  }

  async function fetchJson(path) {
    const response = await fetch(cacheBustedUrl(path), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
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

  function writeLocalBank(bank, options = {}) {
    if (!isValidBank(bank)) throw new Error("El Word Bank no tiene un formato válido.");
    const next = clone(bank);
    if (!options.preserveUpdatedAt) {
      next.updatedAt = new Date().toISOString();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch (error) {}
    writeSessionBank(next);
    return next;
  }

  async function loadExternalBank(options = {}) {
    if (!options.forceRefresh) {
      const sessionBank = readSessionBank();
      if (sessionBank) return clone(sessionBank);
    }

    const external = await fetchJson(BANK_FILE);
    if (!isValidBank(external)) throw new Error("El Word Bank externo no tiene un formato válido.");
    return writeLocalBank(external, { preserveUpdatedAt: true });
  }

  async function loadFullBank(options = {}) {
    const priority = options.priority || BANK_PRIORITY;
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
    BANK_PRIORITY,
    USE_SESSION_CACHE,
    STORAGE_KEY,
    SESSION_STORAGE_KEY,
    BANK_FILE,
    loadFullBank,
    getActivityBank,
    ensureActivity,
    saveActivityBank,
    applyCodeToActivityLevel,
    parseCodeToCategories,
    downloadFullBank,
    readLocalBank,
    writeLocalBank,
    readSessionBank,
    clearSessionBank
  };
})();
