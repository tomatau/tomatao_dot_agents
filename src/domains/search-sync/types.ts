export interface SearchIndex {
  name: string
  /** Vault-relative globs; only what they match can be indexed. */
  sources: string[]
  /** Vault-relative globs kept out, even where a source matches them. */
  unindexed: string[]
}

export interface SearchConfig {
  version: number
  indexes: SearchIndex[]
}

export interface IndexPlan {
  index: SearchIndex
  /** Vault-relative paths, sorted, deduplicated. */
  files: string[]
}
