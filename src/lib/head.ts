/** Consistent metadata for LightGrab Office's private, non-indexed staff pages. */
export function officeHead(title: string, description: string) {
  const fullTitle = `${title} — LightGrab Office`;
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
