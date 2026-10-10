// web/js/adapters/download-dom.js — DownloadPort: saves a Blob as a file through a temporary link.
export function createDomDownload(doc, urls = globalThis.URL) {
  return {
    save(name, blob) {
      const href = urls.createObjectURL(blob);
      const a = doc.createElement("a");
      a.href = href; a.download = name;
      doc.body.appendChild(a); a.click(); a.remove();
      urls.revokeObjectURL(href);
    },
  };
}
