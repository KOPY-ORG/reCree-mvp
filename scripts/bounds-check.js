// 경계 검사 — lg 화면의 보이는 요소가 모두 상단 바 안쪽 좌우선(로고 왼쪽 ~ 오른쪽 끝) 사이에 있는지 본다.
// 실행: pnpm dev(3000)를 띄운 뒤 Claude Code 의 playwright MCP 도구 browser_run_code_unsafe 에
//       filename: "scripts/bounds-check.js" 로 넘긴다. BASE · ROUTES · WIDTHS 만 바꿔 쓴다.
// 결과: 폭 · 경로마다 벗어난 요소(바깥 것만)와 화면 끝까지 깔리는 띠 목록. "벗어남 0" 이면 통과.
/* eslint-disable-next-line @typescript-eslint/no-unused-expressions -- MCP 가 이 함수 식을 그대로 실행한다 */
async (page) => {
  const BASE = "http://localhost:3000";
  const ROUTES = [
    "/feed", "/discover", "/recreeshot", "/recreeshot/18434d91-8a58-42ad-a996-238dc307238b",
    "/journeys", "/journeys/001caf67-3d3d-42d0-a518-c7aa20d6723c", "/saved", "/shop", "/topics",
    "/topics/itaewon-class", "/profile/following", "/login", "/policy/terms",
    "/posts/kdrama-itaewon-class-i-need-you-filming-location-itaewon-overpass-yongsan-recree",
  ];
  const WIDTHS = [1280, 1440, 1920];

  const inPage = () => {
    const nav = document.querySelector("[data-desktop-header] > div");
    if (!nav || nav.getBoundingClientRect().height === 0) return { skipped: "no top bar" };
    const ncs = getComputedStyle(nav), nr = nav.getBoundingClientRect();
    const L = nr.left + parseFloat(ncs.paddingLeft), R = nr.right - parseFloat(ncs.paddingRight);
    // scrollbar-gutter: stable 이라 스크롤바 자리는 늘 비어 있다 — body 폭이 실제 화면 폭이다
    const vw = document.body.getBoundingClientRect().width;

    const isVisible = (el, cs) => cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0;
    const hasSurface = (cs) =>
      (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") ||
      cs.backgroundImage !== "none" || parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0 ||
      cs.boxShadow !== "none";
    const isContent = (el, cs) => {
      if (["IMG", "SVG", "VIDEO", "IFRAME", "CANVAS", "INPUT", "BUTTON", "A", "TEXTAREA", "SELECT"].includes(el.tagName.toUpperCase())) return true;
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return true;
      return hasSurface(cs);
    };
    // 가로로 잘라내는 조상들과 겹치는 부분만 보이는 영역으로 친다 (스크롤 밖 카드는 제외)
    const visibleX = (el, r) => {
      let left = r.left, right = r.right;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflowX !== "visible") {
          const ar = a.getBoundingClientRect();
          left = Math.max(left, ar.left); right = Math.min(right, ar.right);
        }
        if (acs.position === "fixed") break;
      }
      return right - left > 0.5 ? [left, right] : null;
    };
    const label = (el) => {
      const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 6).join(".");
      const txt = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${txt ? ` "${txt}"` : ""}`;
    };

    const bad = new Set(), bleed = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("[data-desktop-header]") || el.closest("svg") !== null && el.tagName.toUpperCase() !== "SVG") continue;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (!isContent(el, cs)) continue;
      // 바탕 없는 글자 요소는 padding 을 뺀 내용 상자로 본다 (px-4 로 들여 쓴 글은 글자가 선 안에 있다)
      const box = hasSurface(cs) ? r : { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
      const vx = visibleX(el, box);
      if (!vx) continue;
      // 화면 끝에서 끝까지 깔리는 띠(바탕 · 지도 · 히어로)는 따로 센다
      if (vx[0] <= 1 && vx[1] >= vw - 1) { if (hasSurface(cs) || ["IFRAME", "CANVAS"].includes(el.tagName)) bleed.push(label(el)); continue; }
      if (vx[0] < L - 0.5 || vx[1] > R + 0.5) bad.add(el);
    }
    // 바깥 요소만 남긴다 (조상도 벗어났으면 자식은 생략)
    const out = [...bad].filter((el) => { for (let a = el.parentElement; a; a = a.parentElement) if (bad.has(a)) return false; return true; })
      .map((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const box = hasSurface(cs) ? r : { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
        const vx = visibleX(el, box); return { el: label(el), x: [Math.round(vx[0]), Math.round(vx[1])] }; });
    return { L: Math.round(L), R: Math.round(R), offenders: out, fullBleed: [...new Set(bleed)].slice(0, 6) };
  };

  const report = [];
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      await page.waitForTimeout(2500);
      const res = await page.evaluate(inPage);
      report.push({ w, route, ...res });
    }
  }
  return report.map((r) => r.skipped
    ? `${r.w} ${r.route}: SKIP (${r.skipped})`
    : `${r.w} ${r.route}: L=${r.L} R=${r.R} · 벗어남 ${r.offenders.length}` +
      r.offenders.slice(0, 12).map((o) => `\n    - [${o.x}] ${o.el}`).join("") +
      (r.offenders.length > 12 ? `\n    … +${r.offenders.length - 12}` : "") +
      (r.fullBleed.length ? `\n    (전폭 띠: ${r.fullBleed.join(" | ")})` : "")
  ).join("\n");
}
