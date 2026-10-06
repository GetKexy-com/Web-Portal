import { CsvHelper } from './CSVHelper';

/** A base64 data URL of these bytes, as the file-drop component hands it over. */
const dataUrl = (bytes: number[]) => 'data:text/csv;base64,' + btoa(String.fromCharCode(...bytes));
const utf8 = (s: string) => Array.from(new TextEncoder().encode(s));

describe('CsvHelper.decodeCsvDataUrl', () => {
  it('drops the UTF-8 BOM Excel writes, so the first header is clean', () => {
    const text = CsvHelper.decodeCsvDataUrl(dataUrl([0xef, 0xbb, 0xbf, ...utf8('First Name,Email\n')]));
    expect(text).toBe('First Name,Email\n');
  });

  it('keeps accented letters in a UTF-8 file', () => {
    expect(CsvHelper.decodeCsvDataUrl(dataUrl(utf8('José,Müller')))).toBe('José,Müller');
  });

  it('reads a non-UTF-8 file as Windows-1252 (Excel "CSV (Comma delimited)")', () => {
    // "José" in Windows-1252: é is the single byte 0xE9, which is invalid UTF-8 here.
    expect(CsvHelper.decodeCsvDataUrl(dataUrl([0x4a, 0x6f, 0x73, 0xe9]))).toBe('José');
  });

  it('parses the first column by its real name', () => {
    const parsed: any = CsvHelper.getCsvFileData(dataUrl([0xef, 0xbb, 0xbf, ...utf8('First Name,Email\nBrian,b@x.com\n')]));
    expect(parsed.meta.fields).toEqual(['First Name', 'Email']);
    expect(parsed.data[0]['First Name']).toBe('Brian');
  });
});
