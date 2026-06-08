import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Loader2,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { deckApi, deckImportApi } from "@/api";
import { DataPagination } from "@/components/common/DataPagination";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  DeckDTO,
  DeckImportDelimiter,
  DeckImportDuplicateStrategy,
  DeckImportPreviewLimit,
  DeckImportPreviewResponse,
  DeckImportResultResponse,
  DeckImportTargetField,
} from "@/types";
import { getCurrentUserId } from "@/utils/auth.utils";

const FIELD_OPTIONS: Array<{ value: DeckImportTargetField; label: string }> = [
  { value: "IGNORE", label: "Ignore" },
  { value: "FRONT", label: "Front" },
  { value: "BACK", label: "Back" },
  { value: "READING", label: "Reading" },
  { value: "ROMAJI", label: "Romaji" },
  { value: "ONYOMI", label: "Onyomi" },
  { value: "KUNYOMI", label: "Kunyomi" },
  { value: "EXAMPLE", label: "Example" },
  { value: "EXAMPLE_TRANSLATION", label: "Example translation" },
  { value: "NOTE", label: "Note" },
  { value: "TAGS", label: "Tags" },
];

const DELIMITER_OPTIONS: Array<{ value: DeckImportDelimiter; label: string }> = [
  { value: "AUTO", label: "Auto" },
  { value: "COMMA", label: "Comma" },
  { value: "TAB", label: "Tab" },
  { value: "SEMICOLON", label: "Semicolon" },
  { value: "PIPE", label: "Pipe" },
];

const PREVIEW_LIMIT_OPTIONS: DeckImportPreviewLimit[] = [10, 20, 50, 100];

type HeaderOption = "AUTO" | "YES" | "NO";
type DeckMode = "new" | "existing";

export default function ImportDeckPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<DeckImportDelimiter>("AUTO");
  const [headerOption, setHeaderOption] = useState<HeaderOption>("AUTO");
  const [previewPage, setPreviewPage] = useState(1);
  const [previewLimit, setPreviewLimit] = useState<DeckImportPreviewLimit>(10);
  const [preview, setPreview] = useState<DeckImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, DeckImportTargetField>>({});
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [deckMode, setDeckMode] = useState<DeckMode>("new");
  const [existingDeckId, setExistingDeckId] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<DeckImportDuplicateStrategy>("SKIP");

  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<DeckImportResultResponse | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId == null) return;
    deckApi
      .getPage({ page: 0, size: 100 }, undefined, { userId } as never)
      .then((response) => {
        const items = response.content ?? (response as any).items ?? [];
        setDecks(items);
        setExistingDeckId((prev) => prev || (items[0]?.id != null ? String(items[0].id) : ""));
      })
      .catch(() => setDecks([]));
  }, []);

  const hasFront = useMemo(() => Object.values(mapping).includes("FRONT"), [mapping]);
  const hasBack = useMemo(() => Object.values(mapping).includes("BACK"), [mapping]);
  const canImport = Boolean(
    preview &&
      hasFront &&
      hasBack &&
      (deckMode === "existing" ? existingDeckId : deckTitle.trim()),
  );

  const handleFile = (nextFile?: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setMapping({});
    setPreviewPage(1);
    if (!deckTitle.trim()) {
      setDeckTitle(nextFile.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handlePreview = async (
    limit: DeckImportPreviewLimit = previewLimit,
    page: number = previewPage,
    options?: { preserveMapping?: boolean },
  ) => {
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    setIsPreviewing(true);
    try {
      const header =
        headerOption === "AUTO" ? undefined : headerOption === "YES";
      const response = await deckImportApi.preview(file, { delimiter, header, previewPage: page, previewRows: limit });
      setPreview(response);
      setPreviewPage(response.previewPage ?? page);
      if (!options?.preserveMapping) {
        setMapping(response.suggestedMapping ?? {});
      }
      setResult(null);
      if (!options?.preserveMapping) toast.success("Preview ready.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not preview this file."));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    if (!hasFront || !hasBack) {
      toast.error("Map one column to Front and one column to Back.");
      return;
    }
    if (deckMode === "new" && !deckTitle.trim()) {
      toast.error("Deck title is required.");
      return;
    }
    if (deckMode === "existing" && !existingDeckId) {
      toast.error("Choose a deck to import into.");
      return;
    }

    setIsImporting(true);
    try {
      const response = await deckImportApi.confirm({
        token: preview.token,
        mapping,
        duplicateStrategy,
        ...(deckMode === "existing"
          ? { deckId: Number(existingDeckId) }
          : {
              deck: {
                title: deckTitle.trim(),
                description: deckDescription.trim() || undefined,
                visibility: "PRIVATE",
                deckIcon: "book-open",
                deckColor: "sky",
                sourceLanguage: "ja",
                targetLanguage: "vi",
              },
            }),
      });
      setResult(response);
      toast.success("Import finished.");
    } catch (error) {
      toast.error(errorMessage(error, "Import failed."));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await deckImportApi.downloadTemplate();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "deck-import-template.csv";
      link.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast.error(errorMessage(error, "Could not download template."));
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setPreviewPage(1);
    setDeckTitle("");
    setDeckDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <MainLayout
      parentCrumb={{ href: "/library", title: "Library" }}
      breadcrumbIcon={<UploadCloud className="size-4" />}
      pageDescription="Import deck flashcards from CSV, TSV or TXT."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-xl font-semibold tracking-normal text-foreground">Import deck</h1>
            <TooltipWrapper content="Preview the file, map each column, then create flashcards in a deck. CSV, TSV and TXT are supported.">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Info className="size-3.5" />
              </span>
            </TooltipWrapper>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/library")}>
              <ArrowLeft className="size-4" />
              Library
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="size-4" />
              Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle icon={<UploadCloud className="size-4" />} title="Upload" />
                {file && (
                  <Button variant="ghost" size="sm" onClick={resetImport}>
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                )}
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4 transition-colors hover:border-primary/50 hover:bg-primary/5",
                  file
                    ? "min-h-20 justify-start gap-3 border-primary/40 bg-primary/5 text-left"
                    : "min-h-28 flex-col justify-center text-center",
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <FileText className={cn("size-8 shrink-0 text-primary", !file && "mb-2")} />
                <div className={cn(file && "min-w-0")}>
                  <p className="truncate text-sm font-medium text-foreground">{file ? file.name : "Drop a file or choose one"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">CSV, TSV and TXT files are supported.</p>
                </div>
              </label>

              <details className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-foreground">Advanced parsing</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <LabelText>Delimiter</LabelText>
                    <Select value={delimiter} onValueChange={(value) => setDelimiter(value as DeckImportDelimiter)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIMITER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <LabelText>Header row</LabelText>
                    <Select value={headerOption} onValueChange={(value) => setHeaderOption(value as HeaderOption)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">Auto</SelectItem>
                        <SelectItem value="YES">Yes</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </details>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => void handlePreview()} disabled={!file || isPreviewing}>
                  {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Preview
                </Button>
              </div>
            </section>

            {preview && (
              <section className="flex min-h-[360px] flex-1 flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle icon={<FileText className="size-4" />} title="Preview" />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Select
                      value={String(previewLimit)}
                      onValueChange={(value) => {
                        const nextLimit = Number(value) as DeckImportPreviewLimit;
                        setPreviewLimit(nextLimit);
                        setPreviewPage(1);
                        if (file) {
                          void handlePreview(nextLimit, 1, { preserveMapping: true });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PREVIEW_LIMIT_OPTIONS.map((limit) => (
                          <SelectItem key={limit} value={String(limit)}>
                            {limit} rows
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <StatPill label="Total" value={preview.totalRows} />
                    <StatPill label="Columns" value={preview.columnCount} />
                    <StatPill label="Delimiter" value={preview.delimiter} />
                    <StatPill label="Header" value={preview.headerDetected ? "Yes" : "No"} />
                  </div>
                </div>

                {preview.warnings.length > 0 && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {preview.warnings.map((warning) => (
                      <div key={warning} className="flex items-center gap-2">
                        <AlertTriangle className="size-3.5" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-2 text-xs text-muted-foreground">
                  Showing rows {preview.rows[0]?.rowNumber ?? 0}-{preview.rows[preview.rows.length - 1]?.rowNumber ?? 0}. Empty cells are kept visible so bad column splits are easy to spot.
                </div>

                <div className="min-h-[260px] flex-1 overflow-auto rounded-lg border border-border bg-background">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-muted text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
                      <tr>
                        <th className="w-16 border-b border-border px-3 py-2 font-medium">Row</th>
                        {preview.columns.map((column) => (
                          <th key={column.key} className="min-w-48 border-b border-border px-3 py-2 font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span>{column.label}</span>
                              <span className="text-[10px] font-normal text-muted-foreground/70">
                                {FIELD_OPTIONS.find((option) => option.value === (mapping[column.key] ?? "IGNORE"))?.label ?? "Ignore"}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-border/60 align-top last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                          {preview.columns.map((column) => (
                            <td key={column.key} className="min-w-48 max-w-80 px-3 py-2 leading-relaxed text-foreground">
                              {row.values[column.key] ? (
                                <span className="block whitespace-normal break-words">{row.values[column.key]}</span>
                              ) : (
                                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground/70">Empty</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <DataPagination
                    currentPage={preview.previewPage ?? previewPage}
                    totalPages={preview.totalPages ?? 1}
                    onPageChange={(page) => {
                      setPreviewPage(page);
                      void handlePreview(previewLimit, page, { preserveMapping: true });
                    }}
                  />
                </div>
              </section>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <SectionTitle icon={<ArrowRight className="size-4" />} title="Column mapping" />
              {!preview ? (
                <p className="mt-3 text-sm text-muted-foreground">Upload and preview a file to map its columns.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {preview.columns.map((column) => (
                    <div key={column.key} className="rounded-lg border border-border bg-background p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{column.label}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {column.samples.length > 0 ? column.samples.join(" / ") : "No sample"}
                          </p>
                        </div>
                      </div>
                      <Select
                        value={mapping[column.key] ?? "IGNORE"}
                        onValueChange={(value) =>
                          setMapping((prev) => ({ ...prev, [column.key]: value as DeckImportTargetField }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <SectionTitle icon={<FileText className="size-4" />} title="Deck target" />
              <RadioGroup
                value={deckMode}
                onValueChange={(value) => setDeckMode(value as DeckMode)}
                className="mt-3 grid grid-cols-2 gap-2"
              >
                <RadioChoice value="new" label="New deck" active={deckMode === "new"} />
                <RadioChoice value="existing" label="Existing" active={deckMode === "existing"} disabled={decks.length === 0} />
              </RadioGroup>

              {deckMode === "new" ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <LabelText>Title</LabelText>
                    <input
                      value={deckTitle}
                      onChange={(event) => setDeckTitle(event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <LabelText>Description</LabelText>
                    <textarea
                      value={deckDescription}
                      onChange={(event) => setDeckDescription(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-1.5">
                  <LabelText>Deck</LabelText>
                  <Select value={existingDeckId} onValueChange={setExistingDeckId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {decks.map((deck) => (
                        <SelectItem key={deck.id} value={String(deck.id)}>
                          {deck.title ?? `Deck ${deck.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <SectionTitle icon={<CheckCircle2 className="size-4" />} title="Confirm" />
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <LabelText>Duplicate front</LabelText>
                  <RadioGroup
                    value={duplicateStrategy}
                    onValueChange={(value) => setDuplicateStrategy(value as DeckImportDuplicateStrategy)}
                    className="grid gap-2"
                  >
                    <RadioChoice value="SKIP" label="Skip" active={duplicateStrategy === "SKIP"} />
                    <RadioChoice value="UPDATE" label="Update existing" active={duplicateStrategy === "UPDATE"} />
                    <RadioChoice value="CREATE_NEW" label="Create new card" active={duplicateStrategy === "CREATE_NEW"} />
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <StatusLine ok={hasFront} label="Front mapped" />
                  <StatusLine ok={hasBack} label="Back mapped" />
                </div>

                <Button className="w-full" onClick={handleImport} disabled={!canImport || isImporting}>
                  {isImporting ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  Import flashcards
                </Button>
              </div>
            </section>

            {result && (
              <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <SectionTitle icon={<CheckCircle2 className="size-4" />} title="Result" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ResultStat label="Created" value={result.createdRows} />
                  <ResultStat label="Updated" value={result.updatedRows} />
                  <ResultStat label="Skipped" value={result.skippedRows} />
                  <ResultStat label="Failed" value={result.failedRows} />
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-auto rounded-lg border border-border bg-background p-2 text-xs">
                    {result.errors.map((error) => (
                      <div key={`${error.rowNumber}-${error.message}`} className="py-1 text-muted-foreground">
                        Row {error.rowNumber}: {error.message}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => navigate(`/deck/${result.deckId}`)}>
                    <ArrowRight className="size-4" />
                    Open deck
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/deck/${result.deckId}/anki`)}>
                    Start SRS
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function LabelText({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}

function StatPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

function RadioChoice({
  value,
  label,
  active,
  disabled,
}: {
  value: string;
  label: string;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <RadioGroupItem value={value} disabled={disabled} />
      {label}
    </label>
  );
}

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-2",
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background text-muted-foreground",
      )}
    >
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {label}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string } }; message?: string };
  return maybe.response?.data?.message || maybe.message || fallback;
}
