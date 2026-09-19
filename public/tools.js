// 纯逻辑工具函数（无任何外部依赖）

// ---------- CSV 解析（RFC4180 近似） ----------
function csvToArray(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  row.push(field); rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvToJson(text) {
  const rows = csvToArray(text.trim());
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

function jsonToCsv(data) {
  const arr = Array.isArray(data) ? data : [data];
  if (!arr.length) return "";
  const headers = Object.keys(arr[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  for (const row of arr) lines.push(headers.map((h) => esc(row[h])).join(","));
  return lines.join("\n");
}

// ---------- 时间戳 ----------
function tsToDateString(raw) {
  const s = String(raw).trim();
  const n = Number(s);
  if (s === "" || !isFinite(n)) return null;
  const ms = s.length <= 10 ? n * 1000 : n;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return { ms: d.getTime(), iso: d.toISOString(), local: d.toString() };
}

function dtToTimestamp(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime();
  return { seconds: Math.floor(ms / 1000), ms };
}

// ---------- 身份证校验 ----------
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const ID_CODES = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

function idCardInfo(id) {
  const s = String(id).trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(s)) {
    return { valid: false, reason: "格式错误：需 18 位，前 17 位数字 + 末位数字或 X" };
  }
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(s[i], 10) * ID_WEIGHTS[i];
  if (ID_CODES[sum % 11] !== s[17]) {
    return { valid: false, reason: "校验位不匹配（可能是输入有误）" };
  }
  return {
    valid: true,
    region: s.slice(0, 6),
    birth: s.slice(6, 10) + "-" + s.slice(10, 12) + "-" + s.slice(12, 14),
    gender: parseInt(s[16], 10) % 2 === 1 ? "男" : "女",
  };
}

// ---------- Luhn 校验 ----------
function luhnValidate(num) {
  const s = String(num).replace(/[\s-]/g, "");
  if (!/^\d+$/.test(s) || s.length < 2) {
    return { valid: false, reason: "需为纯数字（长度至少 2 位，空格/连字符已忽略）" };
  }
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return { valid: sum % 10 === 0, digits: s.length };
}

// 暴露到全局（无模块打包，直接页内引用）
window.AstraKit = { csvToArray, csvToJson, jsonToCsv, tsToDateString, dtToTimestamp, idCardInfo, luhnValidate };