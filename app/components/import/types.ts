export type ParsedRow = Record<string, string>;

export type MappingConfig = {
  name: string | null;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  notes: string | null;
  followUpDate: string | null;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type Step = "upload" | "mapping" | "preview" | "result";
