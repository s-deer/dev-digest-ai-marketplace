// Shapes of the generated files in site/public (written by scripts/build-index.mjs).

export const ARTIFACT_KINDS = ['skill', 'agent'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ENTRY_KINDS = ['plugin', ...ARTIFACT_KINDS] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export interface MarketplaceInfo {
  name: string;
  description: string;
  owner: string;
  repository: string | null;
  repositoryUrl: string | null;
  branch: string;
  generatedAt: string;
  commit: string | null;
}

export interface Dependency {
  name: string;
  range: string | null;
}

interface EntryBase {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  installCommand: string;
  sourcePath: string;
  githubUrl: string | null;
  body: string;
  searchText: string;
}

export interface Plugin extends EntryBase {
  kind: 'plugin';
  version: string;
  author: string;
  owners: string[];
  category: string | null;
  dependencies: Dependency[];
  dependents: string[];
  compatibility: { claudeCode: string | null; notes: string[] };
  updated: string | null;
  counts: Record<ArtifactKind, number>;
  components: string[];
}

export interface Artifact extends EntryBase {
  kind: ArtifactKind;
  plugin: string;
  pluginVersion: string;
  invocation: string | null;
  skill?: { argumentHint: string | null; manualOnly: boolean; userInvocable: boolean; allowedTools: string[] };
  agent?: { tools: string[]; skills: string[]; model: string | null };
  files: string[];
}

export type Entry = Plugin | Artifact;

export interface CatalogIndex {
  marketplace: MarketplaceInfo;
  plugins: Plugin[];
  artifacts: Artifact[];
}

export interface Release {
  plugin: string;
  version: string;
  date: string | null;
  sections: Record<string, string[]>;
  summary: string;
}

export interface Stats {
  totals: Record<EntryKind, number> & { dependencyEdges: number };
  perPlugin: Array<{
    name: string;
    version: string;
    skill: number;
    agent: number;
    dependsOn: string[];
    usedBy: string[];
    updated: string | null;
  }>;
  manualOnlySkills: number;
  agentModels: Record<string, number>;
  topAgentTools: Array<{ tool: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  minClaudeCode: string | null;
  latestRelease: string | null;
}

/** Plugin name of an entry: the plugin itself, or the plugin an artifact belongs to. */
export const pluginOf = (entry: Entry): string => (entry.kind === 'plugin' ? entry.name : entry.plugin);
