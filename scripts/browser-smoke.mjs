import { webkit, firefox } from "@playwright/test";
for (const [name, type] of [
  ["WebKit", webkit],
  ["Firefox", firefox],
]) {
  const browser = await type.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4175");
  await page.locator(".landscape-image").last().waitFor();
  await page.keyboard.press("m");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /힐링 사운드/ })
    .click();
  await page.getByRole("button", { name: "소리 재생", exact: true }).click();
  await page.getByRole("button", { name: "일시정지", exact: true }).waitFor();
  await page.getByRole("button", { name: "창 닫기" }).click();
  await page.keyboard.press("m");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /호흡 가이드/ })
    .click();
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.getByText("들이마셔요", { exact: true }).waitFor();
  console.log(
    JSON.stringify({
      browser: name,
      version: browser.version(),
      image: await page
        .locator(".landscape-image")
        .last()
        .evaluate((i) => [i.naturalWidth, i.naturalHeight]),
      audio: "started",
      breath: "started",
      errors,
    }),
  );
  await browser.close();
  if (errors.length) process.exitCode = 1;
}
