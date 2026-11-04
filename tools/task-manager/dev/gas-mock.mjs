// A small in-memory stand-in for the Google Apps Script services the task manager uses, so the real Code.gs can run
// and be tested in Node. Only what Code.gs calls is implemented; formatting calls are accepted and ignored.
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const signed = buf => [...buf].map(b => (b > 127 ? b - 256 : b));
const chain = () => new Proxy({}, { get: (_, k) => (k === 'build' ? () => ({}) : () => chain()) });

class Range {
  constructor(sheet, row, col, rows = 1, cols = 1) { Object.assign(this, { sheet, row, col, rows, cols }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      const line = this.sheet.data[this.row - 1 + r] || [];
      out.push(Array.from({ length: this.cols }, (_, c) => line[this.col - 1 + c] ?? ''));
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.rows || values[0].length !== this.cols) throw new Error(`setValues: ${values.length}x${values[0].length} into ${this.rows}x${this.cols}`);
    values.forEach((line, r) => line.forEach((v, c) => this.sheet.set(this.row + r, this.col + c, v)));
    return this;
  }
  setValue(v) { this.sheet.set(this.row, this.col, v); return this; }
  getValue() { return this.getValues()[0][0]; }
}
for (const m of ['setFontWeight', 'setBackground', 'setFontColor', 'setNumberFormat', 'setDataValidation', 'setWrap']) {
  Range.prototype[m] = function () { return this; };
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; }
  // Like Sheets: a text cell starting with ' keeps the apostrophe out of the value.
  set(row, col, v) {
    while (this.data.length < row) this.data.push([]);
    const line = this.data[row - 1];
    while (line.length < col) line.push('');
    line[col - 1] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
  }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) if (this.data[r - 1].some(v => v !== '' && v !== null && v !== undefined)) return r;
    return 0;
  }
  getLastColumn() { return this.data.reduce((n, line) => Math.max(n, line.reduce((m, v, i) => (v !== '' ? i + 1 : m), 0)), 0); }
  getMaxRows() { return Math.max(this.maxRows, this.data.length); }
  insertRowsAfter(after, n) { this.maxRows = this.getMaxRows() + n; return this; }
  getRange(row, col, rows = 1, cols = 1) {
    if (rows < 1 || cols < 1) throw new Error('The number of rows/columns in the range must be at least 1.');
    return new Range(this, row, col, rows, cols);
  }
  appendRow(values) { const r = this.getLastRow() + 1; values.forEach((v, i) => this.set(r, i + 1, v)); return this; }
  deleteRow(row) { this.data.splice(row - 1, 1); return this; }
  setFrozenRows() { return this; }
  hideColumns() { return this; }
}

class Spreadsheet {
  constructor() { this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  getId() { return 'TEST_SHEET'; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/TEST_SHEET/edit'; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.set(n, s); return s; }
}

/** Loads Config.gs + Code.gs into a sandbox with mock services. Returns { call, ctx, ss, mail, triggers }. */
export function loadApp({ srcDir, sheetId = 'TEST_SHEET' }) {
  const ss = new Spreadsheet();
  const mail = [];
  const triggers = [];
  const props = new Map();
  const cache = new Map();
  const ctx = {
    console,
    SpreadsheetApp: {
      openById: id => { if (id !== sheetId) throw new Error('No spreadsheet ' + id); return ss; },
      getActiveSpreadsheet: () => ss, // the script is attached to the sheet (the normal setup)
      newDataValidation: () => chain(),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    CacheService: {
      getScriptCache: () => ({
        get: k => { const e = cache.get(k); return e && e.until > Date.now() ? e.v : null; },
        put: (k, v, ttl = 600) => cache.set(k, { v, until: Date.now() + ttl * 1000 }),
        remove: k => cache.delete(k),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => signed(createHash(alg).update(String(s), 'utf8').digest()),
      computeHmacSha256Signature: (v, key) => signed(createHmac('sha256', key).update(String(v), 'utf8').digest()),
      getUuid: () => randomUUID(),
      formatDate: (d, tz, fmt) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
          .formatToParts(d).map(x => [x.type, x.value]));
        return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
      },
      sleep() {},
    },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mail.push(m) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: fn => { const t = { fn, getHandlerFunction: () => fn }; const b = { timeBased: () => b, atHour: h => ((t.hour = h), b), everyDays: () => b, inTimezone: () => b, create: () => (triggers.push(t), t) }; return b; },
    },
    HtmlService: {},
    Logger: { log: (...a) => ctx.__log.push(a.join(' ')) },
    __log: [],
  };
  vm.createContext(ctx);
  const config = readFileSync(new URL('Config.gs', srcDir), 'utf8');
  // const/let at the top of a script are not properties of the sandbox; expose CONFIG explicitly.
  vm.runInContext(config + '\nthis.CONFIG = CONFIG;', ctx);
  vm.runInContext(readFileSync(new URL('Code.gs', srcDir), 'utf8'), ctx);

  /** Calls a server function the way google.script.run does: a fresh execution, JSON-safe arguments and result. */
  function call(fn, ...args) {
    ctx.MEMO_ = {};
    if (typeof ctx[fn] !== 'function' || !/^api_|^dailyDigest$|^setupFirstAdmin$/.test(fn)) throw new Error('Not callable: ' + fn);
    const result = ctx[fn](...JSON.parse(JSON.stringify(args)));
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  }
  return { call, ctx, ss, mail, triggers, cache };
}

/** Same hashing as Code.gs, to seed members with a known code (also used for the real sheet's first admin). */
export function codeHash(salt, code) {
  const norm = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(`${salt}:${norm}`, 'utf8').digest('hex');
}
