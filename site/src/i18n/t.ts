import { en, type MessageKey } from './en';
import type { EntryKind } from '../types';

type Params = Record<string, string | number>;

type PluralBase<K extends string> = K extends `${infer B}.one` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

export function t(key: MessageKey, params?: Params): string {
  const text: string = en[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Plural form: picks "<base>.one" or "<base>.other" and passes the count as {n}. */
export function tn(base: PluralKey, n: number, params?: Params): string {
  const key = `${base}.${n === 1 ? 'one' : 'other'}` as MessageKey;
  return t(key, { n, ...params });
}

export const kindLabel = (kind: EntryKind, n = 1): string => tn(`kind.${kind}`, n);
