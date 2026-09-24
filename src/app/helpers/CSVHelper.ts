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

  static getCsvFileData = (file) => {
    const base64Data = file.split(',')[1];
    const decodedString = atob(base64Data);
    return Papa.parse(decodedString, {
      header: true,  // Set to true if the first contact contains headers
      skipEmptyLines: true,  // Skip empty lines in the CSV
      complete: (results) => {
        return results.data;
      },
    });
  };

}
