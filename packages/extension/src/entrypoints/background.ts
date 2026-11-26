import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { checkTab, highlightInTab } from '../lib/check-tab.js';
import {
  isRequest,
  type CheckResponse,
  type HighlightResponse,
  type Request,
} from '../lib/messages.js';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function handle(request: Request): Promise<CheckResponse | HighlightResponse> {
  try {
    if (request.type === 'check') {
      return { ok: true, ...(await checkTab(request.tabId, request.config, request.engines)) };
    }
    return { ok: true, found: await highlightInTab(request.tabId, request.target) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    // Only accept requests from this extension's own pages (the DevTools panel), never
    // from scripts running in web pages.
    const fromExtensionPage =
      sender.id === browser.runtime.id && sender.url?.startsWith(browser.runtime.getURL('/'));
    if (!fromExtensionPage || !isRequest(message)) return false;
    void handle(message).then(sendResponse);
    return true; // keep the channel open for the async response
  });
});
