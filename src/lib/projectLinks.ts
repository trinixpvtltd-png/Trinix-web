const EXTERNAL_PATTERN = /^(https?:)?\/\//i;
const SPECIAL_SCHEME_PATTERN = /^(mailto:|tel:)/i;

export function buildComingSoonHref(name?: string) {
  const trimmed = name?.trim() ?? "";
  return `/coming-soon${trimmed ? `?name=${encodeURIComponent(trimmed)}` : ""}`;
}

export function resolveProjectHref(rawHref: string | undefined, projectName?: string) {
  if (!rawHref) return buildComingSoonHref(projectName);
  const href = rawHref.trim();
  if (!href) return buildComingSoonHref(projectName);
  if (EXTERNAL_PATTERN.test(href) || SPECIAL_SCHEME_PATTERN.test(href)) {
    return href;
  }
  return buildComingSoonHref(projectName);
}
