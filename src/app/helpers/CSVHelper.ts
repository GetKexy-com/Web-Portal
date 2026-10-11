import Papa from 'papaparse';

export class CsvHelper {
  static download(name: string, data: string) {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    if (navigator["msSaveBlob"]) {
      // IE 10+
      navigator["msSaveBlob"](blob, name);
    } else {
      CsvHelper._downloadOnHtml5(name, blob);
    }
  }

  private static _downloadOnHtml5(name: string, blob) {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", name);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * The contacts export (Contacts page and Manage Lists). The standard columns come
   * first, then one column per custom property: the CSV columns saved under their own
   * header at import time, so a contact exports with everything it was imported with.
   * Custom columns are the union across all contacts, in first-seen order; a contact
   * without one leaves it blank.
   */
  static contactsToCsv(contacts: any[], getListNames: (contact: any) => string[]): string {
    const standard: [string, (d: any, c: any) => any][] = [
      ['First Name', (d) => d.firstName],
      ['Last Name', (d) => d.lastName],
      ['Linkedin', (d) => d.linkedinUrl],
      ['Website', (d) => d.organization?.websiteUrl],
      ['Email', (d) => d.email],
      ['Email Status', (d) => d.emailStatus],
      ['Job Title', (d) => d.title],
      ['Company Name', (d) => d.organization?.name],
      ['Phone Number', (d) => d.organization?.phone],
      ['City', (d) => d.city],
      ['State', (d) => d.state],
      ['Country', (d) => d.country],
      ['Marketing Status', (_, c) => c.marketingStatus],
      ['List', (_, c) => getListNames(c).join('/')],
    ];

    const rows = (contacts || []).map((contact) => {
      const details = CsvHelper._parseDetails(contact.details);
      // Written to both the `custom_properties` column and the `details` blob; the
      // column wins, the blob covers contacts saved before the column existed.
      const custom = contact.customProperties || details.customProperties || {};
      return { contact, details, custom };
    });

    // Custom keys are the CSV's own headers, so one can repeat a standard header
    // (e.g. an unmapped "Email" column). Suffix it rather than emit a duplicate.
    const standardNames = new Set(standard.map(([name]) => name.toLowerCase()));
    const customKeys: string[] = [];
    rows.forEach(({ custom }) =>
      Object.keys(custom).forEach((key) => {
        if (!customKeys.includes(key)) customKeys.push(key);
      }),
    );
    const customHeaders = customKeys.map((key) =>
      standardNames.has(key.trim().toLowerCase()) ? `${key} (Custom)` : key,
    );

    const data = rows.map(({ contact, details, custom }) => [
      ...standard.map(([, get]) => CsvHelper._cell(get(details, contact))),
      ...customKeys.map((key) => CsvHelper._cell(custom[key])),
    ]);

    // Papa quotes values with commas, quotes or line breaks, so they survive intact.
    // The BOM makes Excel read the file as UTF-8 (accented names, etc.).
    return '﻿' + Papa.unparse({ fields: [...standard.map(([name]) => name), ...customHeaders], data });
  }

  private static _parseDetails(details: any): any {
    if (typeof details !== 'string') return details || {};
    try {
      return JSON.parse(details) || {};
    } catch {
      return {};
    }
  }

  private static _cell(value: any): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  /**
   * The text of a CSV given as a base64 data URL, decoded properly. `atob` alone yields one
   * character per BYTE, so a UTF-8 file's BOM showed up as "ï»¿" on the first header and every
   * accented letter was garbled ("José" → "JosÃ©"). Read as UTF-8 (the BOM is dropped); a file
   * that isn't valid UTF-8 is Excel's legacy "CSV (Comma delimited)", which is Windows-1252.
   */
  static decodeCsvDataUrl(dataUrl: string): string {
    const binary = atob(dataUrl.split(',')[1] ?? '');
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder('windows-1252').decode(bytes);
    }
    return text.replace(/^\uFEFF/, '');
  }

  /**
   * What kind of contacts file this is, by EXTENSION. `file.type` is unreliable for
   * this: Windows reports a .csv as `application/vnd.ms-excel` when Excel is installed,
   * and some browsers leave it empty.
   */
  static importFileKind(name: string): 'csv' | 'xlsx' | 'xls' | null {
    const ext = (name || '').toLowerCase().split('.').pop();
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls' ? ext : null;
  }

  /**
   * An Excel (.xlsx) file, in EXACTLY the shape `getCsvFileData` returns, so column
   * mapping, preview and import need no Excel branch. The first sheet is used, as a
   * CSV export of the workbook would.
   *
   * Cells go through Papa as text: numbers as written in the sheet (a phone stays
   * "4087289800", not 4087289800.0), dates as YYYY-MM-DD. The reader is loaded on
   * demand so it only ships to people who import a spreadsheet.
   */
  static async getSpreadsheetFileData(file: Blob): Promise<Papa.ParseResult<any>> {
    const { readSheet } = await import('read-excel-file/browser');
    const rows = await readSheet<string>(file, { parseNumber: (n) => n });
    return CsvHelper.rowsToParseResult(rows);
  }

  /** Spreadsheet rows (first row = headers) → the same result `getCsvFileData` gives. */
  static rowsToParseResult(rows: unknown[][]): Papa.ParseResult<any> {
    // Blank rows (formatting, a gap between blocks) would become empty contacts:
    // Papa's `skipEmptyLines` keeps a ",,," line.
    const text = (rows || [])
      .map((row) => (row || []).map(CsvHelper._sheetCell))
      .filter((row) => row.some((cell) => cell !== ''));
    return Papa.parse(Papa.unparse(text), { header: true, skipEmptyLines: true });
  }

  private static _sheetCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      // Excel stores a date-only cell as UTC midnight; read it in UTC so it can't shift a day.
      return isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
    }
    return String(value).trim();
  }

  static getCsvFileData = (file) => {
    const decodedString = CsvHelper.decodeCsvDataUrl(file);
    return Papa.parse(decodedString, {
      header: true,  // Set to true if the first contact contains headers
      skipEmptyLines: true,  // Skip empty lines in the CSV
      complete: (results) => {
        return results.data;
      },
    });
  };

}
