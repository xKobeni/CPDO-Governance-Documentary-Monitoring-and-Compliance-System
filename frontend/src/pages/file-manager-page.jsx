import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFileExplorerData } from "../api/files";
import { getAccessToken } from "../lib/axios";
import { 
  Folder, File, ChevronRight, Download, Search, HardDrive, 
  Loader2, AlertTriangle, ArrowLeft, MoreVertical, FileText, Image, FileArchive
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType) {
  if (!mimeType) return File;
  if (mimeType.includes("image")) return Image;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("compressed")) return FileArchive;
  return File;
}

export default function FileManagerPage() {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["file-explorer"],
    queryFn: getFileExplorerData,
    staleTime: 60 * 1000,
  });

  const files = response?.files || [];

  const [path, setPath] = useState([]); // Array of { type, value, display }
  const [searchQuery, setSearchQuery] = useState("");

  const handleDownload = (file) => {
    const token = getAccessToken();
    const url = `${import.meta.env.VITE_API_URL}/files/${file.id}/download`;
    
    // Create an invisible iframe/link to trigger the browser download with auth header
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Download failed");
      return res.blob();
    })
    .then(blob => {
      const windowUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = windowUrl;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(windowUrl);
    })
    .catch(err => {
      console.error("Download error:", err);
      alert("Failed to download file.");
    });
  };

  const currentLevelData = useMemo(() => {
    // 1. Filter files based on current path
    let filteredFiles = files;
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      if (node.type === "year") filteredFiles = filteredFiles.filter(f => String(f.year) === node.value);
      if (node.type === "office") filteredFiles = filteredFiles.filter(f => f.office_id === node.value);
      if (node.type === "governance") filteredFiles = filteredFiles.filter(f => f.governance_area_id === node.value);
      if (node.type === "item") filteredFiles = filteredFiles.filter(f => f.item_id === node.value);
    }

    // 2. Determine what to group by based on depth
    const depth = path.length;
    let folders = [];
    let activeFiles = [];

    if (depth === 0) {
      // Group by year
      const yearsSet = new Set();
      filteredFiles.forEach(f => yearsSet.add(String(f.year)));
      folders = Array.from(yearsSet).sort((a,b)=>b.localeCompare(a)).map(y => ({
        type: "year", value: y, display: `Year ${y}`, fileCount: filteredFiles.filter(f=>String(f.year)===y).length
      }));
    } else if (depth === 1) {
      // Group by office
      const map = new Map();
      filteredFiles.forEach(f => {
        if (!map.has(f.office_id)) map.set(f.office_id, { name: f.office_name, count: 0 });
        map.get(f.office_id).count++;
      });
      folders = Array.from(map.entries()).map(([id, info]) => ({
        type: "office", value: id, display: info.name, fileCount: info.count
      })).sort((a,b) => a.display.localeCompare(b.display));
    } else if (depth === 2) {
      // Group by governance
      const map = new Map();
      filteredFiles.forEach(f => {
        if (!map.has(f.governance_area_id)) map.set(f.governance_area_id, { name: f.governance_name, count: 0 });
        map.get(f.governance_area_id).count++;
      });
      folders = Array.from(map.entries()).map(([id, info]) => ({
        type: "governance", value: id, display: info.name, fileCount: info.count
      })).sort((a,b) => a.display.localeCompare(b.display));
    } else if (depth === 3) {
      // Group by item
      const map = new Map();
      filteredFiles.forEach(f => {
        if (!map.has(f.item_id)) map.set(f.item_id, { title: f.item_title, count: 0 });
        map.get(f.item_id).count++;
      });
      folders = Array.from(map.entries()).map(([id, info]) => ({
        type: "item", value: id, display: info.title, fileCount: info.count
      })).sort((a,b) => a.display.localeCompare(b.display));
    } else {
      // Show files
      activeFiles = filteredFiles.sort((a,b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    }

    // 3. Apply search query on the current level
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      folders = folders.filter(fol => fol.display.toLowerCase().includes(q));
      activeFiles = activeFiles.filter(fil => fil.file_name.toLowerCase().includes(q));
    }

    return { folders, files: activeFiles };
  }, [files, path, searchQuery]);

  const navigateTo = (idx) => {
    setPath(path.slice(0, idx + 1));
    setSearchQuery("");
  };

  const navigateUp = () => {
    if (path.length > 0) {
      setPath(path.slice(0, -1));
      setSearchQuery("");
    }
  };

  const enterFolder = (folder) => {
    setPath([...path, { type: folder.type, value: folder.value, display: folder.display }]);
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Manager</h1>
          <p className="text-muted-foreground hidden sm:block">Browse and manage all submitted system files</p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <button
          onClick={() => navigateTo(-1)}
          className={cn(
            "cursor-pointer font-medium transition-colors",
            path.length === 0 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          System Files
        </button>
        {path.map((node, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <button
              onClick={() => navigateTo(i)}
              className={cn(
                "cursor-pointer font-medium transition-colors truncate max-w-[150px] sm:max-w-[200px]",
                i === path.length - 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {node.type === 'year' ? `Year ${node.display}` : node.display}
            </button>
          </React.Fragment>
        ))}
      </nav>

      <Card className="border-l-4 border-l-blue-500 transition-all hover:shadow-md">
        <CardHeader className="flex flex-col space-y-4 pb-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Folder className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                {path.length === 0 ? "Select a folder" : path[path.length - 1].display}
              </CardTitle>
              <CardDescription className="mt-0.5">
                 {path.length === 0 ? "Choose a folder to drill down into requested documents." : "Select an item to view its contents."}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
             {path.length > 0 && (
               <Button variant="outline" size="icon" onClick={navigateUp}>
                 <ArrowLeft className="h-4 w-4" />
               </Button>
             )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading files...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <AlertTriangle className="h-8 w-8 opacity-40 text-red-500" />
              <p className="text-sm">Failed to load files.</p>
            </div>
          ) : currentLevelData.folders.length === 0 && currentLevelData.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <Folder className="h-8 w-8 opacity-40" />
              <p className="text-sm">This folder is empty.</p>
            </div>
          ) : (
            <>
              {/* Folders Grid View */}
              {currentLevelData.folders.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentLevelData.folders.map((folder) => (
                    <button
                      key={folder.value}
                      type="button"
                      onClick={() => enterFolder(folder)}
                      className="relative flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <Folder className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase mb-1 px-1.5 py-0">
                          {folder.type}
                        </Badge>
                        <p className="text-sm font-medium truncate">{folder.display}</p>
                      </div>
                      {(Number(folder.fileCount) > 0) && (
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-white rounded-full h-5 min-w-5 px-1.5 text-[10px] leading-none flex items-center justify-center font-bold">
                          {folder.fileCount}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              )}

              {/* Files Table View */}
              {currentLevelData.files.length > 0 && (
                <div className="rounded-md border overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentLevelData.files.map(file => {
                        const Icon = getFileIcon(file.mime_type);
                        return (
                          <TableRow key={file.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate">{file.file_name}</span>
                                  <span className="text-[10px] text-muted-foreground sm:hidden">
                                    {formatBytes(file.file_size_bytes)} · {new Date(file.uploaded_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono max-w-[100px] truncate bg-muted/30">
                                {(file.mime_type || "File").split("/").pop()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">
                              {formatBytes(file.file_size_bytes)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownload(file)}
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
