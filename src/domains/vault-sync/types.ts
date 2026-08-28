export interface SyncSource {
  path: string;
  tags: Record<string, string>;
}

export interface SyncConfig {
  version: number;
  defaults: {
    exclude: string[];
    promote_frontmatter: string[];
  };
  sources: SyncSource[];
}

export interface VaultDocument {
  vaultRelative: string;
  documentId: string;
  body: string;
  tags: string[];
  hash: string;
  frontmatter: Record<string, unknown>;
}

export interface SyncCache {
  version: number;
  entries: Record<string, string>;
}

export interface SyncPlan {
  desired: Map<string, VaultDocument>;
  cache: SyncCache;
  toAdd: VaultDocument[];
  toUpdate: VaultDocument[];
  unchanged: VaultDocument[];
  toPurge: string[];
}
