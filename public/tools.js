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

// ---------- Base64 / URL 编解码 ----------
function base64Encode(str) {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return null; }
}
function base64Decode(str) {
  try { return decodeURIComponent(escape(atob(String(str).trim()))); } catch { return null; }
}
function urlEncode(str) { return encodeURIComponent(str); }
function urlDecode(str) { try { return decodeURIComponent(str); } catch { return null; } }

// ---------- 散列（Web Crypto，支持 SHA-1/256/384/512） ----------
async function hashText(algorithm, text) {
  const buf = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- UUID v4 ----------
function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const h = Array.from(a).map((b) => b.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}

// ---------- JWT 解码 ----------
function b64urlDecode(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}
function jwtDecode(token) {
  const parts = String(token).trim().split(".");
  if (parts.length < 2 || parts.length > 3) return { error: "JWT 应为 2~3 段（header.payload.signature），用点号分隔" };
  try {
    return {
      header: JSON.parse(b64urlDecode(parts[0])),
      payload: JSON.parse(b64urlDecode(parts[1])),
      hasSignature: parts.length === 3 && parts[2] !== "",
    };
  } catch (e) {
    return { error: "解码失败（内容可能不是合法 Base64Url JSON）：" + e.message };
  }
}

// ---------- 颜色转换 ----------
function hexToRgb(hex) {
  let s = String(hex).trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const to = (x) => Math.max(0, Math.min(255, Math.round(+x || 0))).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ---------- 进制转换（2~36 进制） ----------
function convertBase(value, fromBase, toBase) {
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  const from = parseInt(fromBase, 10), to = parseInt(toBase, 10);
  if (from < 2 || from > 36 || to < 2 || to > 36) return null;
  const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
  for (const c of s) {
    const idx = digits.indexOf(c);
    if (idx < 0 || idx >= from) return null;
  }
  const n = parseInt(s, from);
  return isNaN(n) ? null : n.toString(to);
}

// 暴露到全局（无模块打包，直接页内引用）
window.AstraKit = {
  csvToArray, csvToJson, jsonToCsv, tsToDateString, dtToTimestamp, idCardInfo, luhnValidate,
  base64Encode, base64Decode, urlEncode, urlDecode, hashText, uuidV4, jwtDecode,
  hexToRgb, rgbToHex, rgbToHsl, convertBase,
};