/**
 * Resource Bundle for offline asset loading
 * Allows packing assets into a single JSON file with base64 data.
 */
export interface ResourceBundle {
  /** Get resource data by name (base64-encoded) */
  get(name: string): string | undefined;
  /** Check if resource exists */
  has(name: string): boolean;
  /** List all resource names */
  names(): string[];
}

class SimpleResourceBundle implements ResourceBundle {
  constructor(private resources: Map<string, string>) {}
  get(name: string): string | undefined { return this.resources.get(name); }
  has(name: string): boolean { return this.resources.has(name); }
  names(): string[] { return Array.from(this.resources.keys()); }
}

/**
 * Load a resource bundle from a JSON file.
 * The file should have the shape: { "resources": { "path/to/image.png": "base64...", ... } }
 */
export async function loadBundleFromFile(filePath: string): Promise<ResourceBundle> {
  const fs = await import('fs');
  const data = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(data);
  const resources = json.resources || json;
  const map = new Map<string, string>();
  for (const [name, content] of Object.entries(resources)) {
    map.set(name, content as string);
  }
  return new SimpleResourceBundle(map);
}

/**
 * Create a resource bundle from a list of URLs (fetches them).
 * Useful for preloading assets for offline use.
 */
export async function createBundleFromUrls(urls: string[]): Promise<ResourceBundle> {
  const map = new Map<string, string>();
  for (const url of urls) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.statusText}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const base64 = buf.toString('base64');
    map.set(url, base64);
  }
  return new SimpleResourceBundle(map);
}

/**
 * Save a resource bundle to a JSON file.
 */
export async function saveBundle(bundle: ResourceBundle, filePath: string): Promise<void> {
  const fs = await import('fs');
  const resources: Record<string, string> = {};
  for (const name of bundle.names()) {
    const data = bundle.get(name);
    if (data) resources[name] = data;
  }
  const json = JSON.stringify({ resources }, null, 2);
  fs.writeFileSync(filePath, json);
}
