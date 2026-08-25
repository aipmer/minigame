/**
 * @fileoverview 测试脚本共享工具：起浏览器、监听 pageerror、等待 __game 就绪。
 */
import { chromium } from 'playwright';

export const BASE_URL = 'http://127.0.0.1:8086';

/**
 * 启动浏览器并打开游戏页面，返回 { browser, page, errors }。
 * errors 数组会实时收集 page.on('pageerror')，测试结束前应断言其为空。
 */
export async function openGame() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/index.html`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined');
  return { browser, page, errors };
}

/** 简单断言，失败时抛出带描述的错误 */
export function assert(cond, message) {
  if (!cond) {
    throw new Error(`断言失败: ${message}`);
  }
}
