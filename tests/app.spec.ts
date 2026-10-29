import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const open = async (page: any, name: string) => {
  await page.mouse.move(12, 12);
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(name) })
    .click();
};
test("home, mobile portrait art, menu-only breath and accessibility", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".landscape-image").last()).toBeVisible();
  await expect(page.getByRole("button", { name: /호흡/ })).toHaveCount(0);
  expect(
    await page.locator(".landscape-image").last().getAttribute("src"),
  ).toContain(info.project.name === "mobile" ? "mobile" : "desktop");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await open(page, "호흡 가이드");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await expect(page.getByText("들이마셔요")).toBeVisible();
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await expect(page.getByText("잠시 쉬어요")).toBeVisible();
  await page.getByRole("button", { name: "재개", exact: true }).click();
  await page.getByRole("button", { name: "종료", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a.violations).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/${info.project.name}-home.png` });
});
test("mixer plays real files and presets persist", async ({ page }) => {
  await page.goto("/");
  await open(page, "힐링 사운드");
  await page.getByRole("button", { name: "소리 재생", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await page.getByLabel("프리셋 이름").fill("나의 저녁");
  await page
    .getByRole("button", { name: "현재 믹스 저장", exact: true })
    .click();
  await page.reload();
  await open(page, "힐링 사운드");
  await expect(
    page.getByRole("button", { name: "나의 저녁", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "나의 저녁 삭제", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "나의 저녁", exact: true }),
  ).toHaveCount(0);
});
test("worries never persist and cancel clears content", async ({ page }) => {
  await page.goto("/");
  await open(page, "고민 흘려보내기");
  await page.getByLabel("흘려보낼 고민").fill("PRIVATE_WORRY_123");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "PRIVATE_WORRY",
  );
  await page.getByRole("button", { name: "취소하고 돌아가기" }).click();
  await open(page, "고민 흘려보내기");
  await expect(page.getByLabel("흘려보낼 고민")).toHaveValue("");
  await page.getByLabel("흘려보낼 고민").fill("release");
  await page.getByRole("button", { name: "흘려보내기", exact: true }).click();
  await expect(page.getByText("조금은 가벼워지셨나요?")).toBeVisible({
    timeout: 7000,
  });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "release",
  );
});
test("timer deadline restores, pauses, and completes after background time", async ({
  page,
}) => {
  await page.goto("/");
  await open(page, "휴식 타이머");
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.reload();
  await open(page, "휴식 타이머");
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await expect(page.getByText("잠시 멈췄어요")).toBeVisible();
  await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem("still.timer.v1")!);
    t.status = "running";
    t.deadline = Date.now() - 1000;
    localStorage.setItem("still.timer.v1", JSON.stringify(t));
  });
  await page.reload();
  await expect(page.locator(".toast")).toContainText("휴식 시간이 끝났어요");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("still.timer.v1")!).status,
    ),
  ).toBe("idle");
});
test("image failure retains previous background and settings persist", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".landscape-image").last()).toBeVisible();
  const old = await page.locator(".landscape-image").last().getAttribute("src");
  await context.route("**/05-*.webp", (route) => route.abort());
  await page.getByRole("button", { name: "배경", exact: true }).click();
  await page.getByRole("button", { name: "안개 낀 해안", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("이전 풍경");
  expect(
    await page.locator(".landscape-image").last().getAttribute("src"),
  ).toBe(old);
  await page.getByRole("button", { name: "창 닫기" }).click();
  await open(page, "설정");
  await page.getByLabel("고대비 패널").check();
  await page.reload();
  await expect(page.locator("main")).toHaveClass(/contrast/);
});
test("offline shell and explicitly saved artwork survive reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator(".landscape-image").last()).toBeVisible();
  await page.getByRole("button", { name: "배경", exact: true }).click();
  await page.getByRole("button", { name: "현재 풍경 오프라인 저장" }).click();
  await expect(page.locator(".toast")).toContainText("저장했어요");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".landscape-image").last()).toBeVisible();
  await expect(
    page.getByText("오프라인 · 저장한 콘텐츠를 이용하세요"),
  ).toBeVisible();
  expect(
    await page
      .locator(".landscape-image")
      .last()
      .evaluate((i: HTMLImageElement) => i.naturalWidth),
  ).toBeGreaterThan(0);
});

test("panel accessibility, focus trap, and keyboard escape", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("m");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest("[role=dialog]"),
    ),
  ).toBe(true);
  for (const name of [
    "힐링 사운드",
    "호흡 가이드",
    "고민 흘려보내기",
    "휴식 타이머",
    "배경 라이브러리",
    "설정",
  ]) {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    const results = await new AxeBuilder({ page })
      .include("[role=dialog]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole("button", { name: "메뉴로 돌아가기" }).click();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("saved single track can play offline with other tracks disabled", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await open(page, "힐링 사운드");
  await page
    .getByRole("button", { name: "파도 오프라인 저장", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("저장했어요");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("still.settings.v1")!);
    s.levels = [0.7, 0, 0, 0, 0, 0];
    localStorage.setItem("still.settings.v1", JSON.stringify(s));
  });
  await context.setOffline(true);
  await page.reload();
  await open(page, "힐링 사운드");
  await page.getByRole("button", { name: "소리 재생", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
});
test("invalid settings import is rejected, local reset removes private presets", async ({
  page,
}) => {
  await page.goto("/");
  await open(page, "설정");
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(page.locator(".toast")).toBeVisible();
  await page
    .getByRole("button", { name: "모든 로컬 데이터 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "모두 삭제", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("삭제했어요");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("still.settings.v1")!).presets,
    ),
  ).toEqual([]);
});

test("all 32 backgrounds decode and all six audio files decode", async ({
  page,
}, info) => {
  await page.goto("/");
  const failures = await page.evaluate(async (mobile) => {
    const failed: string[] = [];
    await Promise.all(
      Array.from({ length: 32 }, async (_, i) => {
        const url = `/media/${String(i + 1).padStart(2, "0")}-${mobile ? "mobile" : "desktop"}.webp`;
        try {
          const img = new Image();
          img.src = url;
          await img.decode();
          if (!img.naturalWidth) failed.push(url);
        } catch {
          failed.push(url);
        }
      }),
    );
    const context = new AudioContext();
    for (const name of ["ocean", "rain", "wind", "fire", "piano", "night"]) {
      try {
        const r = await fetch(`/audio/${name}.mp3`);
        const b = await context.decodeAudioData(await r.arrayBuffer());
        if (
          b.duration < 47 ||
          b.numberOfChannels !== 2 ||
          !b.getChannelData(0).some((x) => Math.abs(x) > 0.001)
        )
          failed.push(name);
      } catch {
        failed.push(name);
      }
    }
    await context.close();
    return failed;
  }, info.project.name === "mobile");
  expect(failures).toEqual([]);
});
