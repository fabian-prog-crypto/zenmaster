export interface FakeRegistration {
  id: string;
  matches: string[];
  js: string[];
  runAt: "document_start";
  world: "ISOLATED" | "MAIN";
  allFrames: boolean;
  persistAcrossSessions: boolean;
}

export function createChromeFake(options: { permissionGranted?: boolean } = {}) {
  let stored: unknown = { schemaVersion: 1, customSites: [] };
  const registrations = new Map<string, FakeRegistration>();
  const granted = new Set<string>();
  const calls: string[] = [];
  return {
    calls,
    registrations,
    granted,
    setStored(value: unknown) {
      stored = value;
    },
    async storageGet() {
      calls.push("storage.get");
      return stored;
    },
    async storageSet(value: unknown) {
      calls.push("storage.set");
      stored = value;
    },
    permissionsRequest(pattern: string) {
      calls.push(`permissions.request:${pattern}`);
      const allowed = options.permissionGranted ?? true;
      if (allowed) granted.add(pattern);
      return Promise.resolve(allowed);
    },
    async permissionsContains(pattern: string) {
      calls.push(`permissions.contains:${pattern}`);
      return granted.has(pattern);
    },
    async permissionsRemove(pattern: string) {
      calls.push(`permissions.remove:${pattern}`);
      return granted.delete(pattern);
    },
    async getRegisteredContentScripts() {
      calls.push("scripting.get");
      return [...registrations.values()];
    },
    async registerContentScripts(scripts: FakeRegistration[]) {
      calls.push("scripting.register");
      for (const script of scripts) registrations.set(script.id, script);
    },
    async updateContentScripts(scripts: FakeRegistration[]) {
      calls.push("scripting.update");
      for (const script of scripts) registrations.set(script.id, script);
    },
    async unregisterContentScripts(ids: string[]) {
      calls.push("scripting.unregister");
      for (const id of ids) registrations.delete(id);
    },
    async executeScript(_tabId: number, _file: string, world: "ISOLATED" | "MAIN") {
      calls.push(`scripting.execute:${world}`);
    }
  };
}
