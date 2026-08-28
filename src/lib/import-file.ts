/**
 * Turns an uploaded roster file into CSV text that the parsers in `@/lib/csv`
 * understand. Supports CSV/TSV/TXT, Excel workbooks (.xlsx/.xls) and Word
 * documents (.docx) that contain a table.
 */
function toCsv(rows: string[][]) {
  return rows
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) =>
      r
        .map((c) => {
          const v = String(c ?? "").trim();
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    )
    .join("\n");
}

export async function readTabularFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const first = wb.SheetNames[0];
    if (!first) throw new Error("That workbook has no sheets.");
    const sheet = wb.Sheets[first];
    if (!sheet) throw new Error("That workbook has no sheets.");
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, raw: false });
    return toCsv(rows.map((r) => (Array.isArray(r) ? r : [])));
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) throw new Error("That Word file has no table. Put the roster in a table first.");
    const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th,td")).map((c) => c.textContent ?? ""),
    );
    return toCsv(rows);
  }

  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files aren't supported — save as .docx, .xlsx or .csv.");
  }

  return file.text();
}

export const IMPORT_FILE_ACCEPT =
  ".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.docx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
