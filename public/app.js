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