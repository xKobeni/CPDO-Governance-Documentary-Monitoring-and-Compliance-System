import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus, MoreVertical, Edit, Trash2, Search, AlertTriangle, ListTodo, Tag,
  ChevronRight, RefreshCw, ChevronsRight, Loader2, FileUp, Layers, Copy,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAllTemplates, getTemplateItems, createChecklistItem, updateChecklistItem, deleteChecklistItem, importTemplateItems } from '../api/templates';

const FREQ_STYLE = {
  ANNUAL:      'bg-blue-50 text-blue-700 border-blue-200',
  SEMI_ANNUAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUARTERLY:   'bg-purple-50 text-purple-700 border-purple-200',
  MONTHLY:     'bg-pink-50 text-pink-700 border-pink-200',
  ONE_TIME:    'bg-muted text-muted-foreground border-border',
};
const FREQ_LABEL = {
  ANNUAL: 'Annual', SEMI_ANNUAL: 'Semi-Annual', QUARTERLY: 'Quarterly', MONTHLY: 'Monthly', ONE_TIME: 'One-time',
};

const EMPTY_ITEM = {
  parentItemId: '', itemCode: '', title: '', description: '', isRequired: true,
  frequency: 'ANNUAL', dueDate: '', allowedFileTypes: '', maxFiles: '3', sortOrder: '', isActive: true,
};

function ItemForm({ form, setForm, rawItems }) {
  const isHeader = Number(form.maxFiles) === 0;

  function setItemType(type) {
    if (type === 'header') {
      setForm({ ...form, maxFiles: '0', allowedFileTypes: '' });
    } else {
      setForm({ ...form, maxFiles: isHeader ? '3' : form.maxFiles });
    }
  }

  return (
    <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-2">

      {/* ── Step 1: Item Type ── */}
      <div className="space-y-2">
        <Label className="font-medium">What type of item is this?</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setItemType('document')}
            className={cn(
              'flex flex-col gap-1.5 rounded-lg border-2 p-3.5 text-left transition-colors cursor-pointer',
              !isHeader ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-sm">Document Requirement</span>
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">The LGU must upload one or more files for this item.</span>
          </button>
          <button
            type="button"
            onClick={() => setItemType('header')}
            className={cn(
              'flex flex-col gap-1.5 rounded-lg border-2 p-3.5 text-left transition-colors cursor-pointer',
              isHeader ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-sm">Section / Header</span>
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">Groups related items together. No file upload needed.</span>
          </button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* ── Step 2: Placement ── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Placement</p>
        <div className="space-y-1.5">
          <Label>Place under (Parent Section)</Label>
          <Select value={form.parentItemId} onValueChange={(v) => setForm({ ...form, parentItemId: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="— No parent (top-level item)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No parent (top-level item)</SelectItem>
              {flattenTree(rawItems).map((i) => {
                const d = getDepth(rawItems, i.id);
                return (
                  <SelectItem key={i.id} value={i.id}>
                    <span style={{ paddingLeft: `${d * 14}px` }} className="inline-flex items-center gap-1.5">
                      {d > 0 && <span className="text-muted-foreground font-mono text-xs">└</span>}
                      <span className="font-mono text-xs font-medium">{i.item_code}</span>
                      <span className="text-muted-foreground text-xs">—</span>
                      <span className="text-xs">{i.title.length > 36 ? i.title.slice(0, 36) + '…' : i.title}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Choose a parent section, or leave blank to add it at the top level.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Reference Code <span className="text-destructive">*</span></Label>
            <Input className="font-mono" placeholder="e.g. 1.1.a" value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} />
            <p className="text-xs text-muted-foreground">Short code for ordering and referencing.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" min="1" placeholder="Auto" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            <p className="text-xs text-muted-foreground">Leave blank to add at the end.</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* ── Step 3: Details ── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Details</p>
        <div className={cn('grid gap-x-4 gap-y-3', isHeader ? 'grid-cols-1' : 'grid-cols-2')}>
          <div className="space-y-1.5">
            <Label>Item Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Barangay Development Plan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          {!isHeader && (
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQ_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={cn('space-y-1.5', !isHeader && 'col-span-2')}>
            <Label>Description / Instructions</Label>
            <Textarea rows={2} placeholder="Optional — add context or instructions visible to LGU staff." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ── Step 4: Upload Settings (document only) ── */}
      {!isHeader && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Upload Settings</p>

            {/* Max Files stepper */}
            <div className="space-y-1.5">
              <Label>How many files can the LGU upload?</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border flex items-center justify-center text-lg font-medium hover:bg-muted disabled:opacity-40"
                  onClick={() => setForm({ ...form, maxFiles: String(Math.max(1, Number(form.maxFiles) - 1)) })}
                  disabled={Number(form.maxFiles) <= 1}
                >−</button>
                <span className="w-8 text-center font-semibold text-base tabular-nums">{form.maxFiles}</span>
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border flex items-center justify-center text-lg font-medium hover:bg-muted disabled:opacity-40"
                  onClick={() => setForm({ ...form, maxFiles: String(Math.min(20, Number(form.maxFiles) + 1)) })}
                  disabled={Number(form.maxFiles) >= 20}
                >+</button>
                <span className="text-xs text-muted-foreground">{Number(form.maxFiles) === 1 ? 'Only 1 file' : `Up to ${form.maxFiles} files`}</span>
              </div>
            </div>

            {/* Accepted File Types — chip picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Accepted File Types</Label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, allowedFileTypes: '' })}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border transition-colors',
                    form.allowedFileTypes === ''
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/60'
                  )}
                >Any type</button>
              </div>
              {(() => {
                const PRESETS = ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png', 'csv'];
                const active = form.allowedFileTypes ? form.allowedFileTypes.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                const anyType = form.allowedFileTypes === '';
                const custom = active.filter(t => !PRESETS.includes(t));

                function toggle(ext) {
                  // If currently "any type", clicking a chip starts a specific list with just that ext
                  if (anyType) {
                    setForm({ ...form, allowedFileTypes: ext });
                    return;
                  }
                  const next = active.includes(ext) ? active.filter(t => t !== ext) : [...active, ext];
                  setForm({ ...form, allowedFileTypes: next.join(',') });
                }

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((ext) => {
                        const on = !anyType && active.includes(ext);
                        return (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => toggle(ext)}
                            className={cn(
                              'px-3 py-1 rounded-full border text-xs font-mono font-medium transition-colors',
                              on
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/60'
                            )}
                          >.{ext}</button>
                        );
                      })}
                    </div>
                    {!anyType && (
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-7 text-xs font-mono w-36"
                          placeholder="other (e.g. odt)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = e.target.value.trim().toLowerCase().replace(/^\./, '');
                              if (val && !active.includes(val)) {
                                setForm({ ...form, allowedFileTypes: [...active, val].join(',') });
                              }
                              e.target.value = '';
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Press Enter to add</span>
                        {custom.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border text-xs font-mono">
                            .{t}
                            <button type="button" onClick={() => toggle(t)} className="text-muted-foreground hover:text-foreground leading-none">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {!anyType && active.length === 0 && (
                      <p className="text-xs text-amber-600">No types selected — select at least one or switch to "Any type".</p>
                    )}
                    {!anyType && active.length > 0 && (
                      <p className="text-xs text-muted-foreground">Accepting: {active.map(t => `.${t}`).join(', ')}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-border" />

      {/* ── Due Date + Flags ── */}
      <div className="flex items-end gap-6 flex-wrap">
        {!isHeader && (
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-44" />
          </div>
        )}
        <div className="flex items-center gap-5 pb-0.5">
          {!isHeader && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={form.isRequired} onCheckedChange={(v) => setForm({ ...form, isRequired: Boolean(v) })} />
              <span>Required submission</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })} />
            <span>Active</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function getDepth(items, itemId) {
  let depth = 0;
  let current = items.find((i) => i.id === itemId);
  while (current?.parent_item_id) {
    depth++;
    current = items.find((i) => i.id === current.parent_item_id);
  }
  return depth;
}

function flattenTree(items) {
  const roots = items.filter((i) => !i.parent_item_id).sort((a, b) => a.sort_order - b.sort_order);
  const result = [];
  function visit(item) {
    result.push(item);
    items.filter((c) => c.parent_item_id === item.id).sort((a, b) => a.sort_order - b.sort_order).forEach(visit);
  }
  roots.forEach(visit);
  return result;
}

export default function TemplatesCategoriesPage() {
  const [templates, setTemplates]               = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [rawItems, setRawItems]                 = useState([]);
  const [loadingItems, setLoadingItems]         = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [searchQuery, setSearchQuery]               = useState('');
  const [showInactive, setShowInactive]             = useState(true);

  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState(EMPTY_ITEM);
  const [importForm, setImportForm]     = useState({ sourceTemplateId: '' });
  const [importConfirm, setImportConfirm] = useState('');

  // Cache so switching back to a previously-loaded template is instant
  const itemsCache  = useRef({});
  const selectedRef = useRef(''); // stable ref so async callbacks read current value

  useEffect(() => { selectedRef.current = selectedTemplateId; }, [selectedTemplateId]);

  const setAndCache = useCallback((templateId, items) => {
    itemsCache.current[templateId] = items;
    setRawItems(items);
  }, []);

  // ── Unified load — fetches templates + items for current/first template ────
  const loadData = useCallback(async () => {
    setLoadingTemplates(true);
    setLoadingItems(true);
    setError(null);
    try {
      const tData = await getAllTemplates();
      const tmplList = tData.templates ?? [];
      setTemplates(tmplList);

      if (tmplList.length > 0) {
        // Use the currently selected template on Refresh; otherwise auto-select the first
        const targetId = selectedRef.current || tmplList[0].id;
        if (!selectedRef.current) setSelectedTemplateId(targetId);

        const iData = await getTemplateItems(targetId, true);
        setAndCache(targetId, iData.items ?? []);
      }
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load data.');
    } finally {
      setLoadingTemplates(false);
      setLoadingItems(false);
    }
  }, [setAndCache]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load items when user manually switches template ────────────────────────
  const loadItems = useCallback(async (templateId) => {
    if (!templateId) { setRawItems([]); return; }
    // Show cached version immediately — no spinner
    if (itemsCache.current[templateId]) {
      setRawItems(itemsCache.current[templateId]);
    } else {
      setLoadingItems(true);
    }
    setError(null);
    try {
      const data = await getTemplateItems(templateId, true);
      setAndCache(templateId, data.items ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load checklist items.');
    } finally {
      setLoadingItems(false);
    }
  }, [setAndCache]);

  useEffect(() => { loadItems(selectedTemplateId); }, [selectedTemplateId, loadItems]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const template    = templates.find((t) => t.id === selectedTemplateId);
  const rootItems   = rawItems.filter((i) => !i.parent_item_id);
  const totalActive = rawItems.filter((i) => i.is_active).length;
  const required    = rawItems.filter((i) => i.is_required).length;

  const visibleItems = flattenTree(rawItems).filter((i) => {
    const matchSearch = !searchQuery ||
      i.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchActive = showInactive || i.is_active;
    return matchSearch && matchActive;
  });

  const openImport = () => {
    const fallback = templates.find((t) => t.id !== selectedTemplateId)?.id ?? '';
    setImportForm({ sourceTemplateId: fallback });
    setImportConfirm('');
    setIsImportOpen(true);
  };

  const handleImportAll = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);
    setError(null);
    try {
      await importTemplateItems(selectedTemplateId, { sourceTemplateId: importForm.sourceTemplateId });
      setIsImportOpen(false);
      await loadItems(selectedTemplateId);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to copy categories from another template.');
    } finally {
      setSaving(false);
    }
  };

  const parseFileTypes = (s) =>
    s ? s.split(',').map((x) => x.trim().replace(/^\./, '')).filter(Boolean) : [];

  // ── Add item ───────────────────────────────────────────────────────────────
  const addItem = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await createChecklistItem(selectedTemplateId, {
        parentItemId:     form.parentItemId || null,
        itemCode:         form.itemCode.trim(),
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        isRequired:       form.isRequired,
        frequency:        form.frequency,
        dueDate:          form.dueDate || null,
        allowedFileTypes: parseFileTypes(form.allowedFileTypes),
        maxFiles:         form.maxFiles === '' ? 0 : Number(form.maxFiles),
        sortOrder:        Number(form.sortOrder) || rawItems.length + 1,
        isActive:         form.isActive,
      });
      setRawItems((prev) => [...prev, data.item]);
      itemsCache.current[selectedTemplateId] = [...rawItems, data.item];
      setIsAddOpen(false);
      setForm(EMPTY_ITEM);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit item ──────────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setSelected(item);
    setForm({
      parentItemId:     item.parent_item_id ?? '',
      itemCode:         item.item_code,
      title:            item.title,
      description:      item.description ?? '',
      isRequired:       item.is_required,
      frequency:        item.frequency,
      dueDate:          item.due_date ?? '',
      allowedFileTypes: (item.allowed_file_types ?? []).join(', '),
      maxFiles:         String(item.max_files),
      sortOrder:        String(item.sort_order),
      isActive:         item.is_active,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await updateChecklistItem(selectedTemplateId, selected.id, {
        parentItemId:     form.parentItemId || null,
        itemCode:         form.itemCode.trim(),
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        isRequired:       form.isRequired,
        frequency:        form.frequency,
        dueDate:          form.dueDate || null,
        allowedFileTypes: parseFileTypes(form.allowedFileTypes),
        maxFiles:         form.maxFiles === '' ? 0 : Number(form.maxFiles),
        sortOrder:        Number(form.sortOrder) || selected.sort_order,
        isActive:         form.isActive,
      });
      setRawItems((prev) => prev.map((i) => i.id === selected.id ? data.item : i));
      itemsCache.current[selectedTemplateId] = rawItems.map((i) => i.id === selected.id ? data.item : i);
      setIsEditOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update item.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete item ────────────────────────────────────────────────────────────
  const openDelete = (item) => { setSelected(item); setIsDeleteOpen(true); };

  const doDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteChecklistItem(selectedTemplateId, selected.id);
      // Remove the item and all its descendants from local state
      const toRemove = new Set();
      const collect = (id) => {
        toRemove.add(id);
        rawItems.filter((i) => i.parent_item_id === id).forEach((c) => collect(c.id));
      };
      collect(selected.id);
      setRawItems((prev) => prev.filter((i) => !toRemove.has(i.id)));
      itemsCache.current[selectedTemplateId] = rawItems.filter((i) => !toRemove.has(i.id));
      setIsDeleteOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to delete item.');
    } finally {
      setSaving(false);
    }
  };

  const getParentLabel = (parentId) => {
    const p = rawItems.find((i) => i.id === parentId);
    return p ? `${p.item_code} — ${p.title}` : '';
  };



  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Categories</h1>
          <p className="text-muted-foreground">Manage checklist items for each compliance template</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loadingTemplates || loadingItems}>
          {(loadingTemplates || loadingItems) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button className="text-red-500 hover:text-red-700" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Template selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />Select Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={loadingTemplates}>
              <SelectTrigger className="w-full sm:w-110">
                {loadingTemplates
                  ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading templates…</span>
                  : <SelectValue placeholder="Choose a template to manage its checklist items..." />
                }
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-mono text-xs mr-2">{t.governance_code}</span>
                    {t.year} · {t.title.length > 45 ? `${t.title.slice(0, 45)}…` : t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {template && (
              <>
                <Badge className={cn('text-xs border', template.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                  {template.status}
                </Badge>
              </>
            )}
          </div>
          {template && !loadingItems && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" />{rawItems.length} items total</span>
              <span className="flex items-center gap-1"><ChevronsRight className="h-3.5 w-3.5" />{rootItems.length} root items</span>
              <span className="flex items-center gap-1"><ChevronRight className="h-3.5 w-3.5" />{rawItems.length - rootItems.length} sub-items</span>
              <span className="flex items-center gap-1">{totalActive} active · {rawItems.length - totalActive} inactive</span>
              <span className="flex items-center gap-1">{required} required</span>
            </div>
          )}
          {template && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openImport}
                disabled={saving || loadingItems || templates.length < 2}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy all categories from another template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items table */}
      {!selectedTemplateId ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No template selected</p>
            <p className="text-sm mt-1">Select a template above to view and manage its checklist items.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />Checklist Items
                </CardTitle>
                <CardDescription>
                  {template?.governance_code} · {template?.year} — {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setForm(EMPTY_ITEM); }}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={loadingItems}><Plus className="mr-2 h-4 w-4" />Add Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Checklist Item</DialogTitle>
                    <DialogDescription>Fill in the details below. Fields marked with <span className="text-destructive font-medium">*</span> are required.</DialogDescription>
                  </DialogHeader>
                  <ItemForm form={form} setForm={setForm} rawItems={rawItems} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsAddOpen(false); setForm(EMPTY_ITEM); }} disabled={saving}>Cancel</Button>
                    <Button onClick={addItem} disabled={saving || !form.itemCode || !form.title}>
                      {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</> : 'Add Item'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-45">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(Boolean(v))} />
                Show inactive
              </label>
            </div>

            {/* Tree Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-27.5">Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-30 hidden sm:table-cell">Frequency</TableHead>
                    <TableHead className="w-20 text-center hidden md:table-cell">Required</TableHead>
                    <TableHead className="w-25 hidden lg:table-cell">File Types</TableHead>
                    <TableHead className="w-15 text-center hidden lg:table-cell">Max</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : visibleItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No items found.</TableCell>
                    </TableRow>
                  ) : visibleItems.map((item) => {
                    const depth = getDepth(rawItems, item.id);
                    const isRoot = !item.parent_item_id;
                    return (
                      <TableRow key={item.id} className={cn(!item.is_active && 'opacity-50', isRoot && 'bg-muted/40')}>
                        <TableCell>
                          <code className={cn(
                            'text-xs font-mono px-1.5 py-0.5 rounded border',
                            isRoot
                              ? 'bg-primary/10 border-primary/20 text-primary font-bold'
                              : 'bg-muted border-transparent text-muted-foreground'
                          )}>{item.item_code}</code>
                        </TableCell>
                        <TableCell>
                          <div style={{ paddingLeft: depth > 0 ? `${depth * 20}px` : '0' }} className="flex items-start gap-1.5">
                            {depth > 0 && <span className="text-muted-foreground/50 font-mono text-xs shrink-0 mt-0.5 select-none">└─</span>}
                            <div className="min-w-0 max-w-xl">
                              <div className={cn('text-sm whitespace-normal break-words leading-snug', isRoot ? 'font-bold' : depth === 1 ? 'font-medium' : '')}>{item.title}</div>
                              {item.description && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{item.description}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cn('text-xs border', FREQ_STYLE[item.frequency])}>
                            {FREQ_LABEL[item.frequency]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {item.is_required ? (
                            <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(item.allowed_file_types ?? []).map((ft) => (
                              <code key={ft} className="text-xs bg-muted px-1 py-0.5 rounded">.{ft}</code>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell text-sm">{item.max_files}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', item.is_active ? 'border-green-300 text-green-700' : 'border-muted text-muted-foreground')}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDelete(item)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
            <DialogDescription>
              {selected && <>{getParentLabel(selected.parent_item_id) ? `Under: ${getParentLabel(selected.parent_item_id)}` : 'Top-level item'}</>}
            </DialogDescription>
          </DialogHeader>
          <ItemForm form={form} setForm={setForm} rawItems={rawItems} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !form.itemCode || !form.title}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />Delete Item
            </DialogTitle>
            <DialogDescription>
              Delete <strong>{selected?.item_code} — {selected?.title}</strong>?
              {rawItems.some((i) => i.parent_item_id === selected?.id) && (
                <span className="block mt-2 text-destructive font-medium">This item has children. All sub-items will also be deleted.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy all categories */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy all categories</DialogTitle>
            <DialogDescription>
              Copy <strong>all checklist items</strong> from another template into <strong>{template?.governance_code} · {template?.year}</strong>.
              Existing items are kept; imported items get unique codes if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">From *</Label>
              <Select value={importForm.sourceTemplateId} onValueChange={(v) => setImportForm({ sourceTemplateId: v })}>
                <SelectTrigger className="col-span-3 w-full"><SelectValue placeholder="Select source template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.id !== selectedTemplateId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="font-mono text-xs mr-2">{t.governance_code}</span>
                      {t.year} · {t.title.length > 45 ? `${t.title.slice(0, 45)}…` : t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Confirm *</Label>
              <div className="col-span-3 space-y-1.5">
                <Input
                  className="w-full"
                  value={importConfirm}
                  onChange={(e) => setImportConfirm(e.target.value)}
                  placeholder="Type COPY to enable"
                />
                <p className="text-xs text-muted-foreground">
                  Type <span className="font-mono font-semibold">COPY</span> to confirm this bulk action.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleImportAll}
              disabled={saving || !importForm.sourceTemplateId || importConfirm.trim().toUpperCase() !== 'COPY'}
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Copying…</> : 'Copy all categories'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

