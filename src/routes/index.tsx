import { createSignal, createEffect, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

const YA_TIDAK_OPTIONS = ["-", "YA"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = ["-", ...Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR + 2 - i))];

const defaultFormState = {
  Kode: "INV.SP/ANM/",
  Nama: "",
  Lantai: "LANTAI 1",
  Ruangan: "",
  merk: "",
  Bahan: "",
  ThnBeli: "",
  Jml: "",
  Harga: "",
  Satuan: "",
  Baik: "-",
  RusakRingan: "-",
  RusakSedang: "-",
  RusakBerat: "-",
  PDU: "-",
  PDP: "-",
  PDH: "-",
  RS_KLINIK: "RSKTM",
  UNIT: "",
  TP: "",
  TAHUN_PEROLEH: "",
  KETERANGAN: "",
  PJ_RUANGAN: ""
};

export default function Index() {
  const [form, setForm] = createStore({ ...defaultFormState });
  const [roomCounts, setRoomCounts] = createSignal<Record<string, number>>({});

  onMount(async () => {
    try {
      const res = await fetch("/api/counts");
      if (res.ok) {
        const data = await res.json();
        setRoomCounts(data);
      }
    } catch (e) {
      console.error("Gagal mengambil data counts ruangan", e);
    }
  });

  createEffect(() => {
    const prefix = "INV.SP/ANM";
    const ruanganStr = form.Ruangan ? form.Ruangan.toUpperCase() : "...";
    
    let jmlStr = "...";
    const jmlInt = parseInt(form.Jml);
    if (!isNaN(jmlInt) && jmlInt > 0 && form.Ruangan) {
      const rStr = form.Ruangan.toUpperCase();
      const existingCount = roomCounts()[rStr] || 0;
      const startNum = existingCount + 1;
      const endNum = existingCount + jmlInt;
      
      const startStr = String(startNum).padStart(3, '0');
      const endStr = String(endNum).padStart(3, '0');

      if (jmlInt === 1) {
        jmlStr = startStr;
      } else {
        jmlStr = `${startStr}-${endStr}`;
      }
    } else if (!isNaN(jmlInt) && jmlInt > 0) {
      jmlStr = jmlInt === 1 ? "001" : `001-${String(jmlInt).padStart(3, '0')}`;
    }

    const tahunStr = form.ThnBeli ? form.ThnBeli : "...";
    
    let statusPDStr = "...";
    if (form.PDU === "YA") statusPDStr = "PDU";
    else if (form.PDP === "YA") statusPDStr = "PDP";
    else if (form.PDH === "YA") statusPDStr = "PDH";

    const suffix = form.RS_KLINIK ? form.RS_KLINIK.toUpperCase() : "RSKTM";
    
    const parts = [
      prefix,
      jmlStr,
      ruanganStr,
      tahunStr,
      statusPDStr,
      suffix
    ];

    setForm("Kode", parts.join("/"));
  });

  const [isYearDropdownOpen, setIsYearDropdownOpen] = createSignal(false);
  const [yearSearch, setYearSearch] = createSignal("");
  const filteredYears = () => YEAR_OPTIONS.filter(y => y.includes(yearSearch()));

  const [loading, setLoading] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal<{text: string, type: "success" | "error"} | null>(null);
  
  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };
  
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);
  const [loginForm, setLoginForm] = createStore({ username: "", password: "" });
  const [isLoginLoading, setIsLoginLoading] = createSignal(false);

  onMount(() => {
    if (sessionStorage.getItem("siventaris_logged_in") === "true") {
      setIsLoggedIn(true);
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setIsLoginLoading(true);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Login gagal");
      }

      sessionStorage.setItem("siventaris_logged_in", "true");
      sessionStorage.setItem("siventaris_user", loginForm.username);
      setIsLoggedIn(true);
      showToast("Login berhasil!", "success");
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan saat login", "error");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("siventaris_logged_in");
    sessionStorage.removeItem("siventaris_user");
    setIsLoggedIn(false);
  };

  const handleKondisiChange = (field: "Baik" | "RusakRingan" | "RusakSedang" | "RusakBerat", value: string) => {
    if (value === "YA") {
      setForm("Baik", field === "Baik" ? "YA" : "-");
      setForm("RusakRingan", field === "RusakRingan" ? "YA" : "-");
      setForm("RusakSedang", field === "RusakSedang" ? "YA" : "-");
      setForm("RusakBerat", field === "RusakBerat" ? "YA" : "-");
    } else {
      setForm(field, value);
    }
  };

  const handleStatusPDChange = (field: "PDU" | "PDP" | "PDH", value: string) => {
    if (value === "YA") {
      setForm("PDU", field === "PDU" ? "YA" : "-");
      setForm("PDP", field === "PDP" ? "YA" : "-");
      setForm("PDH", field === "PDH" ? "YA" : "-");
    } else {
      setForm(field, value);
    }
  };

  const handleThnBeliChange = (value: string) => {
    setForm("ThnBeli", value);
    setForm("TP", value);
    setForm("TAHUN_PEROLEH", value);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        user: sessionStorage.getItem("siventaris_user") || "Unknown"
      };

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {}

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      // Mengambil ulang data nomor urut terbaru dari server (Refresh Data Tanpa Reload Halaman)
      try {
        const res = await fetch("/api/counts");
        if (res.ok) {
          const dataCounts = await res.json();
          setRoomCounts(dataCounts);
        }
      } catch (e) {
        console.error("Gagal refresh data nomor urut", e);
      }

      setForm(defaultFormState);
      
      showToast(data.message || "Data berhasil disimpan!", "success");
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-gray-100 flex justify-center w-full relative">
      {/* Toast Notification */}
      <Show when={toastMessage()}>
        <div class="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] w-11/12 max-w-md transition-all duration-300">
          <div class={`p-4 rounded-lg shadow-2xl font-semibold flex items-center justify-between border-l-4 ${
            toastMessage()!.type === "success" 
              ? "bg-white border-green-500 text-green-700" 
              : "bg-white border-red-500 text-red-700"
          }`}>
            <span>{toastMessage()!.text}</span>
            <button onClick={() => setToastMessage(null)} class="text-gray-400 hover:text-gray-600 focus:outline-none ml-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      </Show>

      <Show when={isLoggedIn()} fallback={
        <div class="w-full max-w-md bg-white shadow-xl min-h-screen relative flex flex-col items-center justify-center p-6">
          <div class="w-full">
            <h1 class="text-3xl font-bold text-center text-blue-600 mb-2">Siventaris</h1>
            <p class="text-sm text-gray-500 text-center mb-8">Silakan login menggunakan data dari sheet <b>user-login</b></p>
            
            <form onSubmit={handleLogin} class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" value={loginForm.username} onInput={(e) => setLoginForm("username", e.currentTarget.value)} required class="mt-1 w-full p-3 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-gray-50" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" value={loginForm.password} onInput={(e) => setLoginForm("password", e.currentTarget.value)} required class="mt-1 w-full p-3 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-gray-50" />
              </div>
              
              <button 
                type="submit" 
                disabled={isLoginLoading()}
                class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-6 transition-colors"
              >
                {isLoginLoading() ? (
                  <>
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memeriksa...
                  </>
                ) : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      }>
      {/* Mobile Fixed Container */}
      <div class="w-full max-w-md bg-white shadow-xl min-h-screen relative flex flex-col">
        
        {/* Loading Overlay Tengah Layar */}
        {loading() && (
          <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60 text-white backdrop-blur-sm">
            <svg class="animate-spin mb-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="font-semibold tracking-wide animate-pulse">Menyimpan Data...</p>
          </div>
        )}

        {/* Header Sticky */}
        <header class="sticky top-0 z-10 bg-blue-600 text-white p-4 shadow-md overflow-hidden flex justify-between items-center">
          <div>
            <h1 class="text-xl font-bold">Siventaris Form</h1>
            <p class="text-xs text-blue-100">Input Data Inventaris</p>
          </div>
          <button onClick={handleLogout} class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded shadow">
            Keluar
          </button>
        </header>

        {/* Scrollable Content */}
        <div class="flex-1 overflow-y-auto p-4 pb-24">

          <form id="inventory-form" onSubmit={handleSubmit} class="space-y-4">
            
            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Kode (Preview Otomatis)</label>
                <input type="text" value={form.Kode} readOnly required class="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed focus:outline-none text-gray-600 font-mono text-sm" />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Nama</label>
              <input type="text" value={form.Nama} onInput={(e) => setForm("Nama", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Lantai</label>
              <select value={form.Lantai} onChange={(e) => setForm("Lantai", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                <option value="LANTAI 1">LANTAI 1</option>
                <option value="LANTAI 2">LANTAI 2</option>
                <option value="LANTAI 3">LANTAI 3</option>
                <option value="LANTAI 4">LANTAI 4</option>
                <option value="LANTAI 5">LANTAI 5</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Ruangan</label>
              <input type="text" value={form.Ruangan} onInput={(e) => setForm("Ruangan", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Merk</label>
                <input type="text" value={form.merk} onInput={(e) => setForm("merk", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Bahan</label>
                <input type="text" value={form.Bahan} onInput={(e) => setForm("Bahan", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Tahun Beli</label>
                <div class="relative w-full">
                  <input
                    type="text"
                    value={form.ThnBeli}
                    onInput={(e) => {
                      const val = e.currentTarget.value.toUpperCase();
                      handleThnBeliChange(val);
                      setYearSearch(val);
                      if (!isYearDropdownOpen()) setIsYearDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setYearSearch(form.ThnBeli);
                      setIsYearDropdownOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setIsYearDropdownOpen(false), 200)}
                    placeholder="Pilih atau ketik tahun..."
                    required
                    class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <Show when={isYearDropdownOpen()}>
                    <ul class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                      {filteredYears().map(year => (
                        <li
                          class="p-2 hover:bg-blue-100 cursor-pointer"
                          onMouseDown={() => {
                            handleThnBeliChange(year);
                            setYearSearch("");
                            setIsYearDropdownOpen(false);
                          }}
                        >
                          {year}
                        </li>
                      ))}
                      <Show when={filteredYears().length === 0}>
                        <li class="p-2 text-gray-500 text-sm">Tidak ditemukan</li>
                      </Show>
                    </ul>
                  </Show>
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Jumlah</label>
                <input type="number" value={form.Jml} onInput={(e) => setForm("Jml", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Harga</label>
                <input type="text" value={form.Harga} onInput={(e) => setForm("Harga", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Satuan</label>
                <input type="text" value={form.Satuan} onInput={(e) => setForm("Satuan", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <hr class="border-gray-200" />
            <h2 class="text-sm font-bold text-gray-800">Kondisi Barang</h2>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Baik</label>
                <select value={form.Baik} onChange={(e) => handleKondisiChange("Baik", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Ringan</label>
                <select value={form.RusakRingan} onChange={(e) => handleKondisiChange("RusakRingan", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Sedang</label>
                <select value={form.RusakSedang} onChange={(e) => handleKondisiChange("RusakSedang", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Berat</label>
                <select value={form.RusakBerat} onChange={(e) => handleKondisiChange("RusakBerat", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />
            <h2 class="text-sm font-bold text-gray-800">Status PD</h2>

            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDU</label>
                <select value={form.PDU} onChange={(e) => handleStatusPDChange("PDU", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDP</label>
                <select value={form.PDP} onChange={(e) => handleStatusPDChange("PDP", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDH</label>
                <select value={form.PDH} onChange={(e) => handleStatusPDChange("PDH", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">RS / Klinik</label>
                <select value={form.RS_KLINIK} onChange={(e) => setForm("RS_KLINIK", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="RSKTM">RSKTM</option>
                  <option value="KLINIK">KLINIK</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Unit</label>
                <input type="text" value={form.UNIT} onInput={(e) => setForm("UNIT", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">TP</label>
                <input type="text" value={form.TP} readOnly required class="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed focus:outline-none text-gray-600" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Tahun Peroleh</label>
                <input type="text" value={form.TAHUN_PEROLEH} readOnly required class="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed focus:outline-none text-gray-600" />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">PJ Ruangan</label>
              <input type="text" value={form.PJ_RUANGAN} onInput={(e) => setForm("PJ_RUANGAN", e.currentTarget.value.toUpperCase())} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Keterangan</label>
              <textarea value={form.KETERANGAN} onInput={(e) => setForm("KETERANGAN", e.currentTarget.value.toUpperCase())} required rows="3" class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>

          </form>
        </div>

        {/* Footer Fixed Action Button */}
        <div class="absolute bottom-0 w-full p-4 bg-white border-t border-gray-200">
          <button 
            type="submit" 
            form="inventory-form" 
            disabled={loading()}
            class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading() ? (
              <>
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : "Simpan Data"}
          </button>
        </div>
      </div>
      </Show>
    </main>
  );
}
