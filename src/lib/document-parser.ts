// Client-side document parsing + chunking.
// PDF via pdfjs-dist, DOCX via mammoth, TXT/MD as-is.
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
// Vite serves the worker as an ES module URL.
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = pdfWorker;
}

export type ParsedDoc = { text: string };

export async function parseFile(file: File): Promise<ParsedDoc> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ");
      text += pageText + "\n\n";
    }
    return { text: cleanText(text) };
  }
  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: cleanText(value) };
  }
  // txt, md, plain fallback
  const text = await file.text();
  return { text: cleanText(text) };
}

function cleanText(s: string): string {
  return s
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Recursive character splitter — sentence/paragraph aware.
export function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  if (text.length <= chunkSize) return [text];
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (current.length + p.length + 2 <= chunkSize) {
      current = current ? `${current}\n\n${p}` : p;
    } else {
      if (current) chunks.push(current);
      if (p.length > chunkSize) {
        // hard split long paragraph
        for (let i = 0; i < p.length; i += chunkSize - overlap) {
          chunks.push(p.slice(i, i + chunkSize));
        }
        current = "";
      } else {
        // start new chunk with tail-overlap from previous
        const tail = current.slice(-overlap);
        current = tail ? `${tail}\n\n${p}` : p;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 0);
}
