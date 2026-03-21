"use client";

import { useState } from "react";
import StepIndicator from "./StepIndicator";
import StepUpload from "./steps/StepUpload";
import StepMapping from "./steps/StepMapping";
import StepPreview from "./steps/StepPreview";
import StepResult from "./steps/StepResult";
import { ParsedRow, MappingConfig, ImportResult, Step } from "./types";

export default function CsvImporter() {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<MappingConfig>({
    name: null,
    email: null,
    phone: null,
    profileUrl: null,
    notes: null,
    followUpDate: null,
  });
  const [result, setResult] = useState<ImportResult | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Import Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import contacts from HubSpot, Pipedrive, a spreadsheet, or any CSV export.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="mt-8">
        {step === "upload" && (
          <StepUpload
            onParsed={(h, r) => {
              setHeaders(h);
              setRows(r);
              setStep("mapping");
            }}
          />
        )}
        {step === "mapping" && (
          <StepMapping
            headers={headers}
            rows={rows}
            mapping={mapping}
            onChange={setMapping}
            onBack={() => setStep("upload")}
            onNext={() => setStep("preview")}
          />
        )}
        {step === "preview" && (
          <StepPreview
            rows={rows}
            mapping={mapping}
            onBack={() => setStep("mapping")}
            onImport={(res: ImportResult) => {
              setResult(res);
              setStep("result");
            }}
          />
        )}
        {step === "result" && result && (
          <StepResult
            result={result}
            onImportAnother={() => {
              setStep("upload");
              setHeaders([]);
              setRows([]);
              setMapping({
                name: null,
                email: null,
                phone: null,
                profileUrl: null,
                notes: null,
                followUpDate: null,
              });
              setResult(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
