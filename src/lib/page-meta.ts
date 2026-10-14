export function pageMeta(title: string, description: string) {
  return { meta: [
    { title: `${title} — A4MP RAG SYSTEMS` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — A4MP RAG SYSTEMS` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}