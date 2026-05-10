/* ESL English - helper para actividades futuras.
   Uso básico:
   const bank = await ESLBank.getActivityBank("mi-actividad");
   ESLBank.saveActivityBank("mi-actividad", activityData);
   ESLBank.downloadFullBank();
*/
(function () {
  const STORAGE_KEY = "ESL_ENGLISH_WORD_BANK";
  const BANK_FILE = "word-bank-esl-english.json";
  const VALID_SCHEMA = /^esl-word-bank-v\d+$/;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  function isValidBank(bank) {
    return bank && VALID_SCHEMA.test(String(bank.schema || "")) && bank.activities && typeof bank.activities === "object";
  }

  function readLocalBank() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return isValidBank(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeLocalBank(bank) {
    const next = clone(bank);
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  async function loadFullBank() {
    const local = readLocalBank();
    if (local) return local;
    const external = await fetchJson(BANK_FILE);
    if (!isValidBank(external)) throw new Error("El Word Bank no tiene un formato válido.");
    return writeLocalBank(external);
  }

  async function getActivityBank(activityId) {
    const fullBank = await loadFullBank();
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
    const fullBank = await loadFullBank();
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
    const fullBank = await loadFullBank();
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
    loadFullBank,
    getActivityBank,
    ensureActivity,
    saveActivityBank,
    applyCodeToActivityLevel,
    parseCodeToCategories,
    downloadFullBank
  };
})();
