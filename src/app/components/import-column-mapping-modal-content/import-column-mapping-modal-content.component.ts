import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

// Column-mapping step shown BEFORE the spreadsheet preview (see
// import-preview-modal-content). The user's CSV headers rarely match the exact
// column names `Contact.parseCsvDataToContact` reads (`Email`, `First Name`, …),
// so this lets them match "Column Header From File" -> one of our known fields
// (HubSpot-style "Import As"), with best-effort auto-matching pre-filled.
interface KexyField {
  key: string; // exact key parseCsvDataToContact() reads off each row
  label: string;
  required?: boolean;
}

interface MappingRow {
  column: string; // the CSV's own header text
  samples: string[]; // up to 3 sample values, for "Preview Information"
  mappedTo: string; // '' = Custom Property (kept under its own header), else a KexyField.key
}

@Component({
  selector: 'import-column-mapping-modal-content',
  imports: [CommonModule, FormsModule, KexyButtonComponent],
  templateUrl: './import-column-mapping-modal-content.component.html',
  styleUrl: './import-column-mapping-modal-content.component.scss',
})
export class ImportColumnMappingModalContentComponent implements OnInit {
  // The raw Papa-parse result ({ data, meta: { fields }, errors }).
  @Input() parsedData: any;
  @Input() closeModal: () => void = () => {};
  // Set when re-opening this step after "Back" from the preview modal, so the
  // user's earlier choices are restored instead of re-running the auto-guess.
  @Input() previousMapping?: { column: string; mappedTo: string }[];
  // Called with a Papa-like result ({ ...parsedData, data, meta }) once the user
  // confirms the mapping — its rows are keyed by OUR field names, so it can be
  // handed straight to the existing preview modal / parseCsvDataToContact. The
  // second argument is the raw column->field mapping, handed back unchanged if
  // the caller needs to reopen this step later (see `previousMapping`).
  @Input() proceed: (data: any, mapping?: { column: string; mappedTo: string }[]) => void =
    () => {};

  // The exact set of columns parseCsvDataToContact() looks for on each row.
  // Only Email is required there (@IsEmail, no @IsOptional on the backend DTO);
  // everything else defaults to '' if absent.
  readonly FIELDS: KexyField[] = [
    { key: 'Email', label: 'Email', required: true },
    { key: 'First Name', label: 'First Name' },
    { key: 'Last Name', label: 'Last Name' },
    { key: 'Job Title', label: 'Job Title' },
    { key: 'Company Name', label: 'Company Name' },
    { key: 'Phone Number', label: 'Phone Number' },
    { key: 'City', label: 'City' },
    { key: 'State', label: 'State' },
    { key: 'Country', label: 'Country' },
    { key: 'Website', label: 'Website' },
    { key: 'Linkedin', label: 'LinkedIn URL' },
    { key: 'Company Linkedin Url', label: 'Company LinkedIn URL' },
  ];

  // Normalized (lowercase, punctuation-stripped) aliases a real-world CSV header
  // might use, used to pre-fill the "Import As" choice for each column.
  private readonly ALIASES: Record<string, string[]> = {
    'Email': ['email', 'email address', 'e mail', 'work email'],
    'First Name': ['first name', 'given name', 'fname'],
    'Last Name': ['last name', 'surname', 'family name', 'lname'],
    'Job Title': ['job title', 'title', 'position', 'role'],
    'Company Name': ['company name', 'company', 'organization', 'organisation', 'employer'],
    'Phone Number': ['phone number', 'phone', 'mobile', 'mobile number', 'telephone', 'contact number'],
    'City': ['city', 'town'],
    'State': ['state', 'province', 'region'],
    'Country': ['country'],
    'Website': ['website', 'website url', 'web site', 'url', 'domain', 'company website'],
    'Linkedin': ['linkedin', 'linkedin url', 'linkedin profile', 'linkedinurl'],
    'Company Linkedin Url': ['company linkedin url', 'company linkedin', 'organization linkedin', 'company linkedin profile'],
  };

  rows: MappingRow[] = [];
  submitting = false;

  ngOnInit(): void {
    const fields: string[] = this.parsedData?.meta?.fields?.length
      ? [...this.parsedData.meta.fields]
      : Object.keys(this.parsedData?.data?.[0] || {});
    const data: any[] = this.parsedData?.data || [];

    // Coming back from "Back" on the preview step — honour the user's earlier
    // choices (including an explicit "Custom Property" = '') instead of
    // re-running the auto-guess and losing their edits.
    const prevMap = new Map((this.previousMapping || []).map((m) => [m.column, m.mappedTo]));

    const used = new Set<string>();
    this.rows = fields.map((column) => {
      let mappedTo = prevMap.has(column) ? prevMap.get(column) : this.guessField(column, used) || '';
      if (mappedTo) used.add(mappedTo);
      return {
        column,
        samples: this.sampleValues(data, column),
        mappedTo,
      };
    });
  }

  private normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  private guessField = (column: string, used: Set<string>): string | null => {
    const norm = this.normalize(column);
    for (const field of this.FIELDS) {
      if (used.has(field.key)) continue;
      const aliases = this.ALIASES[field.key] || [];
      if (aliases.includes(norm)) return field.key;
    }
    return null;
  };

  private sampleValues = (data: any[], column: string): string[] => {
    const samples: string[] = [];
    for (const row of data) {
      const v = (row?.[column] ?? '').toString().trim();
      if (v && !samples.includes(v)) samples.push(v);
      if (samples.length >= 3) break;
    }
    return samples;
  };

  fieldLabel = (key: string) => this.FIELDS.find((f) => f.key === key)?.label || key;

  // A field already claimed by another row shouldn't be offered again — mapping
  // is 1:1 (one file column per Kexy field).
  isOptionTaken = (row: MappingRow, fieldKey: string) =>
    this.rows.some((r) => r !== row && r.mappedTo === fieldKey);

  onMappedToChange = (row: MappingRow, fieldKey: string) => {
    row.mappedTo = fieldKey;
  };

  get emailMappedCount(): number {
    return this.rows.filter((r) => r.mappedTo === 'Email').length;
  }

  // Columns mapped to one of our known fields (excludes custom properties).
  get mappedCount(): number {
    return this.rows.filter((r) => r.mappedTo).length;
  }

  get customPropertyCount(): number {
    return this.rows.filter((r) => !r.mappedTo).length;
  }

  get canContinue(): boolean {
    return this.emailMappedCount === 1 && !this.submitting;
  }

  handleContinue = () => {
    if (!this.canContinue) return;
    this.submitting = true;

    // Every column is imported — either into one of our known fields (its
    // canonical key) or, when left as "Custom Property", kept under its own
    // header text. `customFields` tells parseCsvDataToContact() which output
    // keys are the latter, so it can bucket them into `customProperties`
    // instead of trying to read them as known fields.
    const customFields = this.rows.filter((r) => !r.mappedTo).map((r) => r.column);
    const meta = {
      ...(this.parsedData?.meta || {}),
      fields: this.rows.map((r) => r.mappedTo || r.column),
      customFields,
    };
    const data = (this.parsedData?.data || []).map((sourceRow: any) => {
      const out: any = {};
      this.rows.forEach((r) => (out[r.mappedTo || r.column] = sourceRow[r.column]));
      return out;
    });

    this.proceed(
      { ...this.parsedData, data, meta },
      this.rows.map((r) => ({ column: r.column, mappedTo: r.mappedTo })),
    );
  };
}
