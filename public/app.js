const T = window.AstraKit;

// ---------- 导航与工具切换 ----------
const sections = Array.from(document.querySelectorAll(".tool"));
const nav = document.getElementById("nav");

function renderNav() {
  sections.forEach((sec, i) => {
    const btn = document.createElement("button");
    btn.textContent = sec.dataset.title;
    btn.addEventListener("click", () => activate(i));
    nav.appendChild(btn);
  });
}

function activate(index) {
  sections.forEach((s, i) => s.classList.toggle("active", i === index));
  Array.from(nav.children).forEach((b, i) => b.classList.toggle("active", i === index));
  hit(sections[index].dataset.title);
}

// 命中计数（fire-and-forget）
function hit(tool) {
  fetch("/api/hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool }),
  }).catch(() => {});
}

// ---------- 工具 1：JSON ↔ CSV ----------
document.querySelector('[data-json="toCsv"]').addEventListener("click", () => {
  const out = document.getElementById("jsonOutput");
  try {
    const data = JSON.parse(document.getElementById("jsonInput").value);
    out.value = T.jsonToCsv(data);
  } catch {
    out.value = "【错误】JSON 解析失败，请检查输入。";
  }
});

document.querySelector('[data-json="toJson"]').addEventListener("click", () => {
  const out = document.getElementById("jsonOutput");
  try {
    const data = T.csvToJson(document.getElementById("jsonInput").value);
    out.value = JSON.stringify(data, null, 2);
  } catch {
    out.value = "【错误】CSV 解析失败，请检查输入。";
  }
});

// ---------- 工具 2：时间戳 ----------
document.getElementById("tsToDate").addEventListener("click", () => {
  const out = document.getElementById("tsOutput");
  const r = T.tsToDateString(document.getElementById("tsInput").value);
  out.textContent = r
    ? `ISO : ${r.iso}\n本地: ${r.local}\n毫秒: ${r.ms}`
    : "【错误】无法识别的时间戳，请输入秒（10 位）或毫秒（13 位）数字。";
});

document.getElementById("dtToTs").addEventListener("click", () => {
  const out = document.getElementById("tsOutput");
  const r = T.dtToTimestamp(document.getElementById("dtInput").value);
  out.textContent = r
    ? `秒 : ${r.seconds}\n毫秒: ${r.ms}`
    : "【错误】请选择一个有效的日期时间。";
});

// ---------- 工具 3：正则测试 ----------
document.getElementById("rxPattern").addEventListener("input", runRegex);
document.getElementById("rxFlags").addEventListener("input", runRegex);
document.getElementById("rxText").addEventListener("input", runRegex);

function runRegex() {
  const out = document.getElementById("rxOutput");
  const pattern = document.getElementById("rxPattern").value;
  const flags = document.getElementById("rxFlags").value;
  const text = document.getElementById("rxText").value;
  if (!pattern) { out.textContent = ""; return; }
  try {
    const re = new RegExp(pattern, flags);
    const matches = [...text.matchAll(re)];
    if (!re.global) out.textContent = matches.length ? `首处匹配: ${matches[0][0]}` : "无匹配";
    else {
      out.textContent = `共 ${matches.length} 处匹配\n` + matches
        .map((m, i) => `[${i}] @${m.index}: ${JSON.stringify(m[0])}`)
        .join("\n");
    }
  } catch (e) {
    out.textContent = "【错误】正则无效：" + e.message;
  }
}

// ---------- 工具 4：身份证 ----------
document.getElementById("idInput").addEventListener("input", () => {
  const out = document.getElementById("idOutput");
  const r = T.idCardInfo(document.getElementById("idInput").value);
  out.textContent = r.valid
    ? `✓ 校验通过\n地区码: ${r.region}\n出生日期: ${r.birth}\n性别: ${r.gender}`
    : `✗ ${r.reason}`;
});

// ---------- 工具 5：Luhn ----------
document.getElementById("luhnInput").addEventListener("input", () => {
  const out = document.getElementById("luhnOutput");
  const r = T.luhnValidate(document.getElementById("luhnInput").value);
  out.textContent = r.valid
    ? `✓ 校验通过（${r.digits} 位，满足 Luhn 算法）`
    : `✗ ${r.reason}`;
});

// ---------- 工具 6：Base64 / URL ----------
document.querySelectorAll("[data-b64]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const inp = document.getElementById("b64Input").value;
    const out = document.getElementById("b64Output");
    const op = btn.dataset.b64;
    let r;
    if (op === "encode") r = T.base64Encode(inp);
    else if (op === "decode") r = T.base64Decode(inp);
    else if (op === "urlenc") r = T.urlEncode(inp);
    else r = T.urlDecode(inp);
    out.value = r == null ? "【错误】解码失败，输入可能不是合法编码。请用对应编码方式。注意 URL 编码/解码与 Base64 编码/解码需分别成对使用。" : r;
  });
});

// ---------- 工具 7：散列 ----------
document.getElementById("hashGo").addEventListener("click", async () => {
  const out = document.getElementById("hashOutput");
  const algo = document.getElementById("hashAlgo").value;
  const text = document.getElementById("hashInput").value;
  out.textContent = "计算中…";
  try {
    const hex = await T.hashText(algo, text);
    out.textContent = `${algo} : ${hex}`;
  } catch (e) {
    out.textContent = "【错误】" + e.message;
  }
});

// ---------- 工具 8：UUID ----------
document.getElementById("uuidGo").addEventListener("click", () => {
  const out = document.getElementById("uuidOutput");
  let n = parseInt(document.getElementById("uuidCount").value, 10);
  n = Math.max(1, Math.min(100, isNaN(n) ? 1 : n));
  out.textContent = Array.from({ length: n }, () => T.uuidV4()).join("\n");
});

// ---------- 工具 9：JWT ----------
document.getElementById("jwtInput").addEventListener("input", () => {
  const out = document.getElementById("jwtOutput");
  const r = T.jwtDecode(document.getElementById("jwtInput").value);
  if (r.error) { out.textContent = "✗ " + r.error; return; }
  out.textContent =
    "【Header】\n" + JSON.stringify(r.header, null, 2) +
    "\n\n【Payload】\n" + JSON.stringify(r.payload, null, 2) +
    (r.hasSignature ? "" : "\n\n⚠ 无签名段（仅解码，未验证签名）");
});

// ---------- 工具 10：颜色转换 ----------
function renderColor() {
  const out = document.getElementById("colorOutput");
  const hexR = T.hexToRgb(document.getElementById("colorHex").value);
  const rgbParts = document.getElementById("colorRgb").value.split(",").map((x) => parseFloat(x.trim()));
  let rgb = null;
  if (rgbParts.length === 3 && rgbParts.every((x) => !isNaN(x))) rgb = { r: rgbParts[0], g: rgbParts[1], b: rgbParts[2] };
  if (hexR) {
    const hsl = T.rgbToHsl(hexR.r, hexR.g, hexR.b);
    out.textContent = `RGB: rgb(${hexR.r}, ${hexR.g}, ${hexR.b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  } else if (rgb) {
    out.textContent = `HEX: ${T.rgbToHex(rgb.r, rgb.g, rgb.b)}\nHSL: hsl(${T.rgbToHsl(rgb.r, rgb.g, rgb.b).h}, ${T.rgbToHsl(rgb.r, rgb.g, rgb.b).s}%, ${T.rgbToHsl(rgb.r, rgb.g, rgb.b).l}%)`;
  } else {
    out.textContent = "输入 HEX（如 #2563eb）或 RGB（如 37, 99, 235）";
  }
}
document.getElementById("colorHex").addEventListener("input", renderColor);
document.getElementById("colorRgb").addEventListener("input", renderColor);

// ---------- 工具 11：进制转换 ----------
function renderBase() {
  const out = document.getElementById("baseOutput");
  const v = document.getElementById("baseValue").value;
  if (!v.trim()) { out.textContent = ""; return; }
  const from = document.getElementById("baseFrom").value;
  const to = document.getElementById("baseTo").value;
  const r = T.convertBase(v, from, to);
  out.textContent = r == null ? "【错误】数值与进制不匹配（如 10 进制不能含字母，16 进制不能含 g 以上字母）" : r;
}
document.getElementById("baseValue").addEventListener("input", renderBase);
document.getElementById("baseFrom").addEventListener("input", renderBase);
document.getElementById("baseTo").addEventListener("input", renderBase);

// ---------- 统计 ----------
fetch("/api/stats")
  .then((r) => r.json())
  .then((d) => {
    document.getElementById("stats").textContent = `累计使用 ${d.total} 次`;
  })
  .catch(() => {
    document.getElementById("stats").textContent = "";
  });

// 启动
renderNav();
activate(0);