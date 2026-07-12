import { createSignal, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

const YA_TIDAK_OPTIONS = ["-", "YA"];

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
  RS_KLINIK: "",
  UNIT: "",
  TP: "",
  TAHUN_PEROLEH: "",
  KETERANGAN: "",
  PJ_RUANGAN: ""
};

export default function Index() {
  const [form, setForm] = createStore({ ...defaultFormState });

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

      if (!response.ok) {
        throw new Error("Gagal menyimpan data");
      }

      setForm(defaultFormState);
      
      showToast("Data berhasil disimpan!", "success");
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
              <label class="block text-sm font-medium text-gray-700">Kode</label>
              <input type="text" value={form.Kode} onInput={(e) => setForm("Kode", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Nama</label>
              <input type="text" value={form.Nama} onInput={(e) => setForm("Nama", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
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
              <input type="text" value={form.Ruangan} onInput={(e) => setForm("Ruangan", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Merk</label>
                <input type="text" value={form.merk} onInput={(e) => setForm("merk", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Bahan</label>
                <input type="text" value={form.Bahan} onInput={(e) => setForm("Bahan", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Tahun Beli</label>
                <input type="number" value={form.ThnBeli} onInput={(e) => setForm("ThnBeli", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Jumlah</label>
                <input type="number" value={form.Jml} onInput={(e) => setForm("Jml", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Harga</label>
                <input type="number" value={form.Harga} onInput={(e) => setForm("Harga", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Satuan</label>
                <input type="text" value={form.Satuan} onInput={(e) => setForm("Satuan", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <hr class="border-gray-200" />
            <h2 class="text-sm font-bold text-gray-800">Kondisi Barang</h2>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Baik</label>
                <select value={form.Baik} onChange={(e) => setForm("Baik", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Ringan</label>
                <select value={form.RusakRingan} onChange={(e) => setForm("RusakRingan", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Sedang</label>
                <select value={form.RusakSedang} onChange={(e) => setForm("RusakSedang", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Rusak Berat</label>
                <select value={form.RusakBerat} onChange={(e) => setForm("RusakBerat", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />
            <h2 class="text-sm font-bold text-gray-800">Status PD</h2>

            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDU</label>
                <select value={form.PDU} onChange={(e) => setForm("PDU", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDP</label>
                <select value={form.PDP} onChange={(e) => setForm("PDP", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">PDH</label>
                <select value={form.PDH} onChange={(e) => setForm("PDH", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white">
                  {YA_TIDAK_OPTIONS.map(opt => <option value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">RS / Klinik</label>
                <input type="text" value={form.RS_KLINIK} onInput={(e) => setForm("RS_KLINIK", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Unit</label>
                <input type="text" value={form.UNIT} onInput={(e) => setForm("UNIT", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">TP</label>
                <input type="text" value={form.TP} onInput={(e) => setForm("TP", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Tahun Peroleh</label>
                <input type="number" value={form.TAHUN_PEROLEH} onInput={(e) => setForm("TAHUN_PEROLEH", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">PJ Ruangan</label>
              <input type="text" value={form.PJ_RUANGAN} onInput={(e) => setForm("PJ_RUANGAN", e.currentTarget.value)} required class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Keterangan</label>
              <textarea value={form.KETERANGAN} onInput={(e) => setForm("KETERANGAN", e.currentTarget.value)} required rows="3" class="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
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
