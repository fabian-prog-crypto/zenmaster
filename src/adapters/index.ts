import { createAdapterRegistry } from "./registry.js";
import { siteAdapters } from "./sites/index.js";

export const adapterRegistry = createAdapterRegistry(siteAdapters);
