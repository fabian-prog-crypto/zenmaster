export interface RegisteredScriptConfig {
  id: string;
  matches: string[];
  js: string[];
  runAt: "document_start";
  world: "ISOLATED" | "MAIN";
  allFrames: boolean;
  persistAcrossSessions: boolean;
}

export interface ChromeApi {
  storageGet(): Promise<unknown>;
  storageSet(value: unknown): Promise<void>;
  permissionsRequest(pattern: string): Promise<boolean>;
  permissionsContains(pattern: string): Promise<boolean>;
  permissionsRemove(pattern: string): Promise<boolean>;
  getRegisteredContentScripts(): Promise<RegisteredScriptConfig[]>;
  registerContentScripts(scripts: RegisteredScriptConfig[]): Promise<void>;
  updateContentScripts(scripts: RegisteredScriptConfig[]): Promise<void>;
  unregisterContentScripts(ids: string[]): Promise<void>;
  executeScript(tabId: number, file: string, world: "ISOLATED" | "MAIN"): Promise<void>;
}

export function createChromeApi(): ChromeApi {
  return {
    async storageGet() {
      const result = await chrome.storage.local.get("state");
      return result.state;
    },
    async storageSet(value) {
      await chrome.storage.local.set({ state: value });
    },
    permissionsRequest(pattern) {
      return chrome.permissions.request({ origins: [pattern] });
    },
    permissionsContains(pattern) {
      return chrome.permissions.contains({ origins: [pattern] });
    },
    permissionsRemove(pattern) {
      return chrome.permissions.remove({ origins: [pattern] });
    },
    async getRegisteredContentScripts() {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      return scripts.map((script) => ({
        id: script.id,
        matches: script.matches ?? [],
        js: script.js ?? [],
        runAt: "document_start",
        world: script.world === "MAIN" ? "MAIN" : "ISOLATED",
        allFrames: script.allFrames ?? false,
        persistAcrossSessions: script.persistAcrossSessions ?? true
      }));
    },
    async registerContentScripts(scripts) {
      await chrome.scripting.registerContentScripts(scripts);
    },
    async updateContentScripts(scripts) {
      await chrome.scripting.updateContentScripts(scripts);
    },
    async unregisterContentScripts(ids) {
      if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
    },
    async executeScript(tabId, file, world) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [file],
        world,
        injectImmediately: true
      });
    }
  };
}
