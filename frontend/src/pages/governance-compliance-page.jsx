import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { Download } from "lucide-react";
import { getYears } from "../api/years";
import { downloadComplianceMatrix, getComplianceMatrix } from "../api/governance";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const STATUS_META = {
  NOT_SUBMITTED: { label: "Not Submitted", badge: "bg-muted text-muted-foreground border-border" },
  PENDING: { label: "Pending", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  REVISION_REQUESTED: { label: "Needs Revision", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  APPROVED: { label: "Approved", badge: "bg-green-100 text-green-700 border-green-200" },
};

export default function GovernanceCompliancePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [governanceFilter, setGovernanceFilter] = useState("all");
  const [focusOffice, setFocusOffice] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCellKey, setSelectedCellKey] = useState(null);
  const [collapsedGovernance, setCollapsedGovernance] = useState(new Set());
  const [showUnconfiguredDetails, setShowUnconfiguredDetails] = useState(false);

  const downloadBlob = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const yearsQuery = useQuery({
    queryKey: ["years", "active"],
    queryFn: () => getYears({ includeInactive: false }),
    staleTime: 10 * 60 * 1000,
  });

  const matrixQuery = useQuery({
    queryKey: ["compliance-matrix", Number(year)],
    queryFn: () => getComplianceMatrix(Number(year)),
    staleTime: 2 * 60 * 1000,
  });

  const yearOptions = useMemo(() => {
    const yrs = (yearsQuery.data?.years || []).map((y) => y.year).sort((a, b) => b - a);
    return yrs.length > 0 ? yrs : [currentYear, currentYear - 1, currentYear - 2];
  }, [yearsQuery.data, currentYear]);

  const offices = useMemo(() => matrixQuery.data?.offices || [], [matrixQuery.data]);
  const categories = useMemo(() => matrixQuery.data?.categories || [], [matrixQuery.data]);
  const cells = useMemo(() => matrixQuery.data?.cells || [], [matrixQuery.data]);
  const detailsByCell = useMemo(() => matrixQuery.data?.detailsByCell || [], [matrixQuery.data]);
  const unconfiguredAssignments = useMemo(
    () => matrixQuery.data?.unconfiguredAssignments || [],
    [matrixQuery.data]
  );

  const cellMap = useMemo(() => {
    const map = {};
    for (const cell of cells) map[`${cell.officeId}:${cell.categoryId}`] = cell;
    return map;
  }, [cells]);

  const detailsMap = useMemo(() => {
    const map = {};
    for (const detail of detailsByCell) map[`${detail.officeId}:${detail.categoryId}`] = detail;
    return map;
  }, [detailsByCell]);

  const governanceOptions = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      if (!map.has(cat.governanceAreaId)) {
        map.set(cat.governanceAreaId, {
          id: cat.governanceAreaId,
          code: cat.governanceCode,
          name: cat.governanceName,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name)
    );
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      const governanceMatch = governanceFilter === "all" || cat.governanceAreaId === governanceFilter;
      const textMatch =
        q.length === 0 ||
        cat.governanceCode.toLowerCase().includes(q) ||
        cat.governanceName.toLowerCase().includes(q) ||
        cat.categoryCode.toLowerCase().includes(q) ||
        cat.categoryName.toLowerCase().includes(q);

      if (!governanceMatch || !textMatch) return false;
      if (statusFilter === "ALL") return true;

      const officesToCheck = focusOffice === "all" ? offices : offices.filter((o) => o.id === focusOffice);
      return officesToCheck.some((office) => {
        const cell = cellMap[`${office.id}:${cat.id}`];
        return (cell?.status ?? "NOT_SUBMITTED") === statusFilter;
      });
    });
  }, [categories, governanceFilter, searchQuery, statusFilter, focusOffice, offices, cellMap]);

  const kpis = useMemo(() => {
    const base = { NOT_SUBMITTED: 0, PENDING: 0, REVISION_REQUESTED: 0, APPROVED: 0 };
    const officesToCheck = focusOffice === "all" ? offices : offices.filter((o) => o.id === focusOffice);
    for (const cat of filteredCategories) {
      for (const office of officesToCheck) {
        const status = cellMap[`${office.id}:${cat.id}`]?.status ?? "NOT_SUBMITTED";
        base[status] = (base[status] || 0) + 1;
      }
    }
    return base;
  }, [filteredCategories, offices, focusOffice, cellMap]);

  const visibleOffices = useMemo(
    () => (focusOffice === "all" ? offices : offices.filter((o) => o.id === focusOffice)),
    [focusOffice, offices]
  );

  const groupedRows = useMemo(() => {
    const rows = [];
    let lastGovernanceId = null;
    for (const cat of filteredCategories) {
      const governanceChanged = cat.governanceAreaId !== lastGovernanceId;
      if (governanceChanged) {
        rows.push({
          type: "group",
          key: `group:${cat.governanceAreaId}`,
          governanceCode: cat.governanceCode,
          governanceName: cat.governanceName,
        });
        lastGovernanceId = cat.governanceAreaId;
      }
      rows.push({
        type: "category",
        key: cat.id,
        category: cat,
      });
    }
    return rows;
  }, [filteredCategories]);

  const toggleGovernanceCollapse = (governanceAreaId) => {
    const scopedKey = `${year}:${governanceAreaId}`;
    setCollapsedGovernance((prev) => {
      const next = new Set(prev);
      if (next.has(scopedKey)) next.delete(scopedKey);
      else next.add(scopedKey);
      return next;
    });
  };

  const selectedDetail = selectedCellKey ? detailsMap[selectedCellKey] : null;
  const selectedCell = selectedCellKey ? cellMap[selectedCellKey] : null;
  const selectedOffice = useMemo(
    () => offices.find((o) => selectedCellKey?.startsWith(`${o.id}:`)) || null,
    [offices, selectedCellKey]
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => selectedCellKey?.endsWith(`:${c.id}`)) || null,
    [categories, selectedCellKey]
  );

  // For fully "Not Submitted" cells, keep top-level roots plus actionable leaves.
  // Example: keep "3" and "3.a.1", hide intermediate headers like "3.a".
  const selectedDetailItems = useMemo(() => {
    const items = selectedDetail?.items ?? [];
    if ((selectedCell?.status || "NOT_SUBMITTED") !== "NOT_SUBMITTED") {
      return items.map((it) => ({ ...it, isHeader: false, isRoot: false, rootCode: null }));
    }

    const codes = items.map((it) => String(it.itemCode || "").trim()).filter(Boolean);
    const isHeaderCode = (code) => codes.some((other) => other !== code && other.startsWith(`${code}.`));

    const filtered = items.filter((it) => {
      const code = String(it.itemCode || "").trim();
      if (!code) return true;
      const isRootCode = !code.includes(".");
      return isRootCode || !isHeaderCode(code);
    });

    let currentRootCode = null;
    let currentRootTitle = null;
    return filtered.map((it) => {
      const code = String(it.itemCode || "").trim();
      const isRoot = Boolean(code) && !code.includes(".");
      if (isRoot) {
        currentRootCode = code;
        currentRootTitle = it.itemTitle || null;
      }
      return {
        ...it,
        isHeader: isRoot,
        isRoot,
        rootCode: currentRootCode,
        rootTitle: currentRootTitle,
      };
    });
  }, [selectedDetail, selectedCell]);

  const groupedUnconfiguredAssignments = useMemo(() => {
    const map = new Map();
    for (const row of unconfiguredAssignments) {
      const key = row.governanceAreaId;
      if (!map.has(key)) {
        map.set(key, {
          governanceAreaId: row.governanceAreaId,
          governanceCode: row.governanceCode,
          governanceName: row.governanceName,
          offices: [],
        });
      }
      map.get(key).offices.push({
        officeId: row.officeId,
        officeCode: row.officeCode,
        officeName: row.officeName,
      });
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        offices: group.offices.sort((a, b) => a.officeCode.localeCompare(b.officeCode) || a.officeName.localeCompare(b.officeName)),
      }))
      .sort((a, b) => a.governanceCode.localeCompare(b.governanceCode) || a.governanceName.localeCompare(b.governanceName));
  }, [unconfiguredAssignments]);

  const canDownload = !matrixQuery.isFetching && categories.length > 0 && offices.length > 0;

  const handleDownload = async (format) => {
    try {
      const blob = await downloadComplianceMatrix(Number(year), format);
      downloadBlob(`compliance-matrix-${year}.${format}`, blob);
      toast.success(`Compliance matrix downloaded (${format.toUpperCase()})`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download compliance matrix.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Matrix</h1>
          <p className="text-muted-foreground">
            Category-level automatic checklist matrix by assigned office and submission status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => matrixQuery.refetch()} disabled={matrixQuery.isFetching}>
            {matrixQuery.isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => handleDownload("xlsx")}>Download Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("pdf")}>Download PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            placeholder="Search governance/category..."
          />
        </div>
        <Select value={focusOffice} onValueChange={setFocusOffice}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All offices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All offices</SelectItem>
            {offices.map((office) => (
              <SelectItem key={office.id} value={office.id}>
                {office.code} - {office.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={governanceFilter} onValueChange={setGovernanceFilter}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="All governance areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All governance areas</SelectItem>
            {governanceOptions.map((gov) => (
              <SelectItem key={gov.id} value={gov.id}>
                {gov.code} - {gov.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="NOT_SUBMITTED">Not Submitted</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVISION_REQUESTED">Needs Revision</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(kpis).map(([status, count]) => (
          <div key={status} className={cn("text-xs px-2.5 py-1 rounded-full border", STATUS_META[status].badge)}>
            {count} {STATUS_META[status].label}
          </div>
        ))}
        {governanceFilter !== "all" && (
          <div className="text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
            Governance filter active
          </div>
        )}
      </div>

      {unconfiguredAssignments.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
          <p className="font-medium">Some assigned office-governance pairs are not yet configured.</p>
          <p className="text-xs mt-1">
            {unconfiguredAssignments.length} assignment(s) have no active template root categories for year {year}.
          </p>
          <button
            type="button"
            onClick={() => setShowUnconfiguredDetails((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:opacity-85"
          >
            {showUnconfiguredDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {showUnconfiguredDetails ? "Hide unconfigured assignments" : "View unconfigured assignments"}
          </button>
          {showUnconfiguredDetails && (
            <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-white/70 p-2.5">
              {groupedUnconfiguredAssignments.map((group) => (
                <div key={group.governanceAreaId} className="rounded border border-amber-100 bg-amber-50/40 p-2">
                  <p className="text-xs font-semibold">
                    {group.governanceCode} - {group.governanceName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {group.offices.map((office) => (
                      <span
                        key={`${group.governanceAreaId}:${office.officeId}`}
                        className="text-[11px] rounded-full border border-amber-200 bg-amber-100/70 px-2 py-0.5"
                      >
                        {office.officeCode} - {office.officeName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Category Compliance Matrix</CardTitle>
          <CardDescription>
            Rows are checklist categories; columns are assigned offices. Click a cell for full checklist details.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {matrixQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading compliance matrix...
            </div>
          ) : matrixQuery.error ? (
            <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 m-4 rounded-md">
              Failed to load compliance matrix.
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No categories match your current filters.</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/40 text-left px-4 py-3 min-w-[260px]">Governance / Category</th>
                  {visibleOffices.map((office) => (
                    <th key={office.id} className="px-3 py-3 text-center min-w-[150px]">
                      <div className="font-semibold">{office.code}</div>
                      <div className="text-[11px] text-muted-foreground">{office.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((row, idx) => {
                  if (row.type === "group") {
                    const governanceAreaId = row.key.replace("group:", "");
                    const isCollapsed = collapsedGovernance.has(`${year}:${governanceAreaId}`);
                    return (
                      <tr key={row.key} className="border-b bg-blue-50/60">
                        <td
                          className="sticky left-0 z-10 bg-blue-50/60 px-4 py-2 font-semibold text-blue-800"
                          colSpan={1 + visibleOffices.length}
                        >
                          <button
                            type="button"
                            onClick={() => toggleGovernanceCollapse(governanceAreaId)}
                            className="flex items-center gap-2 hover:opacity-90"
                          >
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span>{row.governanceCode} - {row.governanceName}</span>
                            <span className="text-[11px] font-normal text-blue-700/80">
                              ({isCollapsed ? "collapsed" : "expanded"})
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const cat = row.category;
                  if (collapsedGovernance.has(`${year}:${cat.governanceAreaId}`)) return null;
                  return (
                    <tr key={row.key} className={cn("border-b", idx % 2 === 1 && "bg-muted/10")}>
                      <td className="sticky left-0 z-10 bg-background px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground">Category</span>
                          <span className="font-medium">{cat.categoryCode} - {cat.categoryName}</span>
                        </div>
                      </td>
                      {visibleOffices.map((office) => {
                        const key = `${office.id}:${cat.id}`;
                        const cell = cellMap[key];
                        const status = cell?.status || "NOT_SUBMITTED";
                        return (
                          <td key={key} className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCellKey(key)}
                              className={cn(
                                "w-full rounded-md border px-2 py-1.5 text-xs transition-colors text-left",
                                STATUS_META[status].badge,
                                "hover:brightness-95"
                              )}
                            >
                              <div className="font-medium">{STATUS_META[status].label}</div>
                              <div className="text-[10px] opacity-80 mt-0.5">
                                {cell?.counts.submitted ?? 0}/{cell?.counts.totalItems ?? 0} submitted
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedCellKey)} onOpenChange={(open) => !open && setSelectedCellKey(null)}>
        <DialogContent className="w-[min(96vw,1100px)] sm:max-w-[1100px] max-h-[88vh] overflow-hidden flex! flex-col!">
          <DialogHeader>
            <DialogTitle>
              {selectedOffice?.code || "Office"} - {selectedCategory?.categoryCode || "Category"} Checklist
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.governanceCode} - {selectedCategory?.governanceName} | Status:{" "}
              {STATUS_META[selectedCell?.status || "NOT_SUBMITTED"].label}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {!selectedDetail || selectedDetailItems.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8">
                No active checklist items in this category.
              </div>
            ) : (
              selectedDetailItems.map((item) => {
                const status = item.latestSubmissionStatus || "NOT_SUBMITTED";
                return (
                  <div
                    key={item.checklistItemId}
                    className={cn(
                      "rounded-md border p-3",
                      item.isHeader && "bg-muted/35 border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn(!item.isHeader && "pl-4")}>
                        <p className={cn("text-sm", item.isHeader ? "font-semibold" : "font-medium")}>
                          {item.itemCode} - {item.itemTitle}
                        </p>
                        {item.isHeader ? (
                          <p className="text-xs text-muted-foreground">Root header</p>
                        ) : (
                          <>
                            {item.rootCode ? (
                              <p className="text-[11px] text-muted-foreground">
                                Root: {item.rootCode}{item.rootTitle ? ` - ${item.rootTitle}` : ""}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleString("en-PH") : "Not submitted"}
                            </p>
                          </>
                        )}
                      </div>
                      {!item.isHeader ? (
                        <Badge variant="outline" className={STATUS_META[status]?.badge || STATUS_META.NOT_SUBMITTED.badge}>
                          {STATUS_META[status]?.label || status}
                        </Badge>
                      ) : null}
                    </div>
                    {(item.reviewerRemarks || item.officeRemarks) && (
                      <div className="mt-2 text-xs space-y-1">
                        {item.reviewerRemarks && (
                          <p>
                            <span className="font-semibold">Reviewer remarks:</span> {item.reviewerRemarks}
                          </p>
                        )}
                        {item.officeRemarks && (
                          <p>
                            <span className="font-semibold">Office remarks:</span> {item.officeRemarks}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
