import { createSignal, onMount, Show, For, createMemo } from "solid-js";
import { A } from "@solidjs/router";
import * as XLSX from "xlsx";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = createSignal(false);
  const [checkingAuth, setCheckingAuth] = createSignal(true);
  
  const [activeTab, setActiveTab] = createSignal<"data" | "users">("data");
  
  const [inventoryData, setInventoryData] = createSignal<any[]>([]);
  const [loadingData, setLoadingData] = createSignal(false);
  
  const [users, setUsers] = createSignal<any[]>([]);
  const [loadingUsers, setLoadingUsers] = createSignal(false);
  
  const [newUser, setNewUser] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");

  // Edit Modal State
  const [editingRowIndex, setEditingRowIndex] = createSignal<number | null>(null);
  const [editingData, setEditingData] = createSignal<any[]>([]);

  // Filtering State
  const [startDate, setStartDate] = createSignal("");
  const [endDate, setEndDate] = createSignal("");

  // Pagination State
  const [currentPage, setCurrentPage] = createSignal(1);
  const rowsPerPage = 50;

  onMount(() => {
    const isLoggedIn = sessionStorage.getItem("siventaris_logged_in") === "true";
    const user = sessionStorage.getItem("siventaris_user");
    
    if (isLoggedIn && user === "admin") {
      setIsAdmin(true);
      fetchInventoryData();
      fetchUsers();
    }
    setCheckingAuth(false);
  });

  const fetchInventoryData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/data");
      if (res.ok) {
        const data = await res.json();
        setInventoryData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteInventoryData = async (index: number) => {
    if (!confirm("Yakin ingin menghapus data ini secara permanen?")) return;
    try {
      const rowIndex = index + 1;
      const res = await fetch(`/api/admin/data?rowIndex=${rowIndex}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchInventoryData();
      } else {
        alert("Gagal menghapus data");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (row: any[], index: number) => {
    setEditingRowIndex(index + 1);
    const headers = inventoryData()[0] || [];
    const fullRow = headers.map((_, i) => row[i] || "");
    setEditingData([...fullRow]);
  };

  const handleSaveEdit = async (e: Event) => {
    e.preventDefault();
    if (editingRowIndex() === null) return;
    try {
      const res = await fetch("/api/admin/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: editingRowIndex(), values: editingData() })
      });
      if (res.ok) {
        setEditingRowIndex(null);
        fetchInventoryData();
      } else {
        alert("Gagal menyimpan perubahan data");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Parsing Tanggal Indonesia: "13 Jul 2026, 19.30.54"
  const parseIndonesianDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
      Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11
    };
    const cleanStr = dateStr.replace(",", "");
    const parts = cleanStr.split(" ");
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]] ?? 0;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const filteredInventory = createMemo(() => {
    const data = inventoryData();
    if (data.length <= 1) return { headers: [], rows: [] };
    
    const headers = data[0];
    let rows = data.slice(1).map((row, index) => ({ row, originalIndex: index }));
    
    if (startDate() || endDate()) {
      const start = startDate() ? new Date(startDate()) : new Date(0);
      start.setHours(0,0,0,0);
      
      const end = endDate() ? new Date(endDate()) : new Date(8640000000000000);
      end.setHours(23,59,59,999);
      
      rows = rows.filter(item => {
        const tsStr = item.row[24] || item.row[item.row.length - 1]; // Timestamp biasanya di kolom terakhir (ke-25)
        const rowDate = parseIndonesianDate(tsStr);
        return rowDate >= start && rowDate <= end;
      });
    }
    
    return { headers, rows };
  });

  const totalPages = createMemo(() => {
    const filtered = filteredInventory();
    return Math.max(1, Math.ceil(filtered.rows.length / rowsPerPage));
  });

  const paginatedInventory = createMemo(() => {
    const filtered = filteredInventory();
    const startIdx = (currentPage() - 1) * rowsPerPage;
    return filtered.rows.slice(startIdx, startIdx + rowsPerPage);
  });

  // Export Excel
  const downloadExcel = () => {
    const filtered = filteredInventory();
    if (filtered.rows.length === 0) {
      alert("Tidak ada data untuk didownload");
      return;
    }
    
    // Hilangkan 2 kolom terakhir (user & created_at)
    const exportHeaders = filtered.headers.slice(0, -2);

    // Tambahkan ID di kolom pertama
    const headersForExcel = ["ID", ...exportHeaders];
    const dataForExcel = [headersForExcel];
    
    filtered.rows.forEach((item, index) => {
      const exportRow = item.row.slice(0, -2);
      dataForExcel.push([index + 1, ...exportRow]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Inventaris");
    XLSX.writeFile(wb, `Data_Inventaris_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: Event) => {
    e.preventDefault();
    if (!newUser() || !newPassword()) return;
    
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUser(), password: newPassword() })
      });
      if (res.ok) {
        setNewUser("");
        setNewPassword("");
        fetchUsers();
      } else {
        alert("Gagal menambahkan user");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (rowIndex: number) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return;
    try {
      const res = await fetch(`/api/admin/users?rowIndex=${rowIndex}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Gagal menghapus user");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div class="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Access Denied View */}
      <Show when={!checkingAuth() && !isAdmin()}>
        <div class="min-h-screen flex items-center justify-center p-4">
          <div class="max-w-md w-full p-8 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl text-center transform transition-all hover:scale-105">
            <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 class="text-3xl font-extrabold text-white mb-3 tracking-tight">Akses Ditolak</h1>
            <p class="text-slate-400 mb-8 leading-relaxed">Halaman ini terenkripsi dan hanya dapat diakses oleh Administrator level atas.</p>
            <A href="/" class="inline-block w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:from-indigo-400 hover:to-purple-500 transition-all duration-300">
              Kembali ke Portal
            </A>
          </div>
        </div>
      </Show>

      {/* Admin Dashboard View */}
      <Show when={isAdmin()}>
        <div class="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* Header */}
          <div class="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Command Center</h1>
                <p class="text-indigo-300/80 text-sm font-medium mt-1 uppercase tracking-wider">Sistem Inventaris Terpadu</p>
              </div>
            </div>
            <div class="mt-6 md:mt-0">
              <A href="/" class="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20 shadow-sm backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span class="font-medium text-sm">Kembali ke Form</span>
              </A>
            </div>
          </div>

          {/* Elegant Tabs */}
          <div class="flex space-x-2 p-1.5 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit shadow-inner">
            <button 
              onClick={() => setActiveTab("data")}
              class={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab() === "data" ? "text-white shadow-lg bg-indigo-500/20 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Data Inventaris
            </button>
            <button 
              onClick={() => setActiveTab("users")}
              class={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab() === "users" ? "text-white shadow-lg bg-indigo-500/20 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manajemen User
            </button>
          </div>

          {/* Content: Data Inventaris */}
          <Show when={activeTab() === "data"}>
            <div class="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500">
              <div class="p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/5">
                <div>
                  <h2 class="text-xl font-bold text-white flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    Database Sinkronisasi Aktif
                  </h2>
                  <p class="text-slate-400 text-sm mt-1">Data ditarik secara real-time dari Google Sheets.</p>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                  {/* Date Filter */}
                  <div class="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                    <input 
                      type="date" 
                      value={startDate()} 
                      onInput={(e) => { setStartDate(e.currentTarget.value); setCurrentPage(1); }} 
                      class="bg-transparent text-sm text-slate-300 outline-none cursor-pointer"
                      title="Tanggal Mulai"
                    />
                    <span class="text-slate-500">-</span>
                    <input 
                      type="date" 
                      value={endDate()} 
                      onInput={(e) => { setEndDate(e.currentTarget.value); setCurrentPage(1); }} 
                      class="bg-transparent text-sm text-slate-300 outline-none cursor-pointer"
                      title="Tanggal Akhir"
                    />
                  </div>

                  <button onClick={downloadExcel} class="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-all border border-emerald-500/30 font-semibold text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Unduh Excel
                  </button>

                  <button onClick={fetchInventoryData} class="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl transition-all border border-indigo-500/20 font-semibold text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class={`h-4 w-4 ${loadingData() ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              
              <div class="overflow-x-auto custom-scrollbar">
                <Show when={loadingData()}>
                  <div class="p-20 flex flex-col items-center justify-center">
                    <div class="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                    <div class="text-indigo-300 font-medium animate-pulse">Menghubungkan ke Google Servers...</div>
                  </div>
                </Show>
                
                <Show when={!loadingData() && filteredInventory().headers.length > 0}>
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs font-semibold uppercase tracking-wider text-slate-300 bg-black/20 backdrop-blur-md">
                      <tr>
                        <For each={filteredInventory().headers}>
                          {(header) => <th class="px-6 py-4 whitespace-nowrap">{header}</th>}
                        </For>
                        <th class="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-slate-900/90 backdrop-blur-md border-l border-white/5">Aksi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      <For each={paginatedInventory()}>
                        {(item, pIndex) => (
                          <tr class={`hover:bg-white/10 transition-colors duration-200 ${pIndex() % 2 === 0 ? "bg-transparent" : "bg-white/5"}`}>
                            <For each={filteredInventory().headers}>
                              {(_, index) => (
                                <td class="px-6 py-4 whitespace-nowrap text-slate-300 font-medium">
                                  {item.row[index()] ? item.row[index()] : <span class="text-slate-600">-</span>}
                                </td>
                              )}
                            </For>
                            <td class="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-slate-900/90 backdrop-blur-md border-l border-white/5">
                              <div class="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => openEditModal(item.row, item.originalIndex)}
                                  class="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                                  title="Edit Data"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteInventoryData(item.originalIndex)}
                                  class="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                                  title="Hapus Data"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </Show>
                
                <Show when={!loadingData() && filteredInventory().rows.length === 0}>
                  <div class="p-20 text-center flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div class="text-slate-400 font-medium text-lg">Basis Data Kosong</div>
                    <div class="text-slate-500 text-sm mt-1">Belum ada barang yang diinputkan atau sesuai dengan filter tanggal.</div>
                  </div>
                </Show>
              </div>
              
              {/* Pagination Controls */}
              <Show when={!loadingData() && filteredInventory().rows.length > 0}>
                <div class="p-4 border-t border-white/5 bg-white/5 flex justify-between items-center text-sm text-slate-300">
                  <div>
                    Menampilkan <span class="font-bold text-white">{(currentPage() - 1) * rowsPerPage + 1}</span> hingga <span class="font-bold text-white">{Math.min(currentPage() * rowsPerPage, filteredInventory().rows.length)}</span> dari <span class="font-bold text-white">{filteredInventory().rows.length}</span> baris
                  </div>
                  <div class="flex gap-2">
                    <button 
                      disabled={currentPage() === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      class="px-4 py-2 bg-black/20 hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition border border-white/10"
                    >
                      Kembali
                    </button>
                    <div class="px-4 py-2 font-semibold bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-white">
                      Halaman {currentPage()} / {totalPages()}
                    </div>
                    <button 
                      disabled={currentPage() === totalPages()}
                      onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                      class="px-4 py-2 bg-black/20 hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition border border-white/10"
                    >
                      Lanjut
                    </button>
                  </div>
                </div>
              </Show>

            </div>
          </Show>

          {/* Content: Manajemen User */}
          <Show when={activeTab() === "users"}>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Form Tambah User */}
              <div class="xl:col-span-1">
                <div class="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl sticky top-8">
                  <div class="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h2 class="text-2xl font-bold text-white mb-2">Registrasi Akses</h2>
                  <p class="text-slate-400 text-sm mb-8">Berikan akses masuk sistem ke staf baru.</p>
                  
                  <form onSubmit={handleAddUser} class="space-y-5">
                    <div class="space-y-2">
                      <label class="block text-sm font-semibold text-slate-300">ID Pengguna (Username)</label>
                      <input 
                        type="text" 
                        value={newUser()} 
                        onInput={(e) => setNewUser(e.currentTarget.value)} 
                        required 
                        class="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white placeholder-slate-600 transition-all outline-none"
                        placeholder="Ketik username baru..."
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="block text-sm font-semibold text-slate-300">Kata Sandi (Password)</label>
                      <input 
                        type="password" 
                        value={newPassword()} 
                        onInput={(e) => setNewPassword(e.currentTarget.value)} 
                        required 
                        class="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white placeholder-slate-600 transition-all outline-none"
                        placeholder="Ketik kata sandi kuat..."
                      />
                    </div>
                    <button type="submit" class="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all duration-300 transform hover:-translate-y-0.5">
                      Berikan Akses
                    </button>
                  </form>
                </div>
              </div>

              {/* Tabel User */}
              <div class="xl:col-span-2">
                <div class="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden h-full">
                  <div class="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                      <h2 class="text-xl font-bold text-white">Daftar Otorisasi</h2>
                      <p class="text-slate-400 text-sm mt-1">Kelola staf yang memiliki akses masuk.</p>
                    </div>
                    <button onClick={fetchUsers} class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" class={`h-5 w-5 ${loadingUsers() ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  
                  <Show when={loadingUsers()}>
                    <div class="p-20 flex justify-center">
                      <div class="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                    </div>
                  </Show>
                  
                  <Show when={!loadingUsers()}>
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm text-left">
                        <thead class="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-black/20">
                          <tr>
                            <th class="px-8 py-5">Profil Pengguna</th>
                            <th class="px-8 py-5 text-right">Otoritas</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                          <For each={users()}>
                            {(user) => (
                              <tr class="hover:bg-white/10 transition-colors group">
                                <td class="px-8 py-5">
                                  <div class="flex items-center">
                                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                                      {user.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div class="ml-4">
                                      <div class="font-bold text-white text-base">{user.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td class="px-8 py-5 text-right">
                                  <Show when={user.username === "admin"} fallback={
                                    <button 
                                      onClick={() => handleDeleteUser(user.rowIndex)}
                                      class="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-medium border border-red-500/20 group-hover:border-red-500/40"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Cabut Akses
                                    </button>
                                  }>
                                    <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 font-bold tracking-wide text-xs uppercase">
                                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                      </svg>
                                      Super Admin
                                    </div>
                                  </Show>
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>
              </div>

            </div>
          </Show>

        </div>
      </Show>

      {/* Edit Modal Popup */}
      <Show when={editingRowIndex() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div class="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
            
            <div class="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 class="text-xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Data Inventaris
              </h3>
              <button onClick={() => setEditingRowIndex(null)} class="text-slate-400 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="editForm" onSubmit={handleSaveEdit} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={filteredInventory().headers}>
                  {(header, idx) => (
                    <div class="space-y-1.5">
                      <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{header}</label>
                      <input 
                        type="text" 
                        value={editingData()[idx()] || ""} 
                        onInput={(e) => {
                          const newData = [...editingData()];
                          newData[idx()] = e.currentTarget.value;
                          setEditingData(newData);
                        }} 
                        class="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-600 transition-all outline-none text-sm"
                      />
                    </div>
                  )}
                </For>
              </form>
            </div>
            
            <div class="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
              <button onClick={() => setEditingRowIndex(null)} class="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition">
                Batal
              </button>
              <button type="submit" form="editForm" class="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all">
                Simpan Perubahan
              </button>
            </div>
            
          </div>
        </div>
      </Show>

      {/* Global CSS for scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
