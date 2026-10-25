// The web preview prints the page instead of making a file.
export async function shareSummaryPdf(html: string): Promise<void> {
  const w = globalThis.open?.('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}
