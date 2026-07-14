import { APIEvent } from "@solidjs/start/server";
import { google } from "googleapis";
import { globalCache } from "../../utils/cache";

// Global mutex lock to prevent race conditions during concurrent submissions
let submitLock = Promise.resolve();

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    
    // Konfigurasi Kredensial dari Environment Variables
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: "Konfigurasi Google Sheets (Environment Variables) belum lengkap." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Mengunci proses (Mutex) agar tidak ada 2 request yang membaca dan menulis secara bersamaan
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    const previousLock = submitLock;
    submitLock = previousLock.then(() => lockPromise);
    await previousLock;

    try {
      // --- MULAI: Pengecekan Real-time untuk Kode ---
      const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "siventaris!A:H",
    });

    const existingRows = response.data.values || [];
    const ruanganInput = body.Ruangan ? body.Ruangan.toString().toUpperCase().trim() : "";
    let maxNum = 0;

    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      const rowKode = row[0] ? row[0].toString().trim() : "";
      const rowRuangan = row[3] ? row[3].toString().toUpperCase().trim() : "";

      if (rowKode && rowRuangan === ruanganInput) {
        const parts = rowKode.split('/');
        if (parts.length >= 4) {
          const numPart = parts[2]; // e.g. "036" atau "037-038"
          let rowMaxNum = 0;
          if (numPart.includes('-')) {
             const subParts = numPart.split('-');
             const endNum = parseInt(subParts[1], 10);
             if (!isNaN(endNum)) rowMaxNum = endNum;
          } else {
             const num = parseInt(numPart, 10);
             if (!isNaN(num)) rowMaxNum = num;
          }
          if (rowMaxNum > maxNum) {
            maxNum = rowMaxNum;
          }
        }
      }
    }

    const jmlInt = parseInt(body.Jml) || 1;
    const startNum = maxNum + 1;
    const endNum = maxNum + jmlInt;
    
    const startStr = String(startNum).padStart(3, '0');
    const endStr = String(endNum).padStart(3, '0');

    let jmlStr = "";
    if (jmlInt === 1) {
      jmlStr = startStr;
    } else {
      jmlStr = `${startStr}-${endStr}`;
    }

    const prefix = "INV.SP/ANM";
    const tahunStr = body.ThnBeli ? body.ThnBeli : "-";
    
    let statusPDStr = "-";
    if (body.PDU === "YA") statusPDStr = "PDU";
    else if (body.PDP === "YA") statusPDStr = "PDP";
    else if (body.PDH === "YA") statusPDStr = "PDH";

    const suffix = body.RS_KLINIK ? body.RS_KLINIK.toUpperCase() : "RSKTM";
    
    const finalKode = `${prefix}/${jmlStr}/${ruanganInput || "-"}/${tahunStr}/${statusPDStr}/${suffix}`;
    // --- AKHIR: Pengecekan Real-time untuk Kode ---

    // Menyusun nilai-nilai baris berdasarkan field (23 kolom)
    const rowValues = [
      finalKode, // Menggunakan finalKode buatan server
      body.Nama,
      body.Lantai,
      body.Ruangan,
      body.merk,
      body.Bahan,
      body.ThnBeli,
      body.Jml,
      body.Harga,
      body.Satuan,
      body.Baik,
      body.RusakRingan,
      body.RusakSedang,
      body.RusakBerat,
      body.PDU,
      body.PDP,
      body.PDH,
      body.RS_KLINIK,
      body.UNIT,
      body.TP,
      body.TAHUN_PEROLEH,
      body.KETERANGAN,
      body.PJ_RUANGAN,
      body.user || "Unknown",
      new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "medium" })
    ].map(val => typeof val === 'string' ? val.toUpperCase() : val);

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "siventaris!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });

    // Invalidate the cache immediately so all polling users instantly get the new counts!
    globalCache.lastFetchTime = 0;

    return new Response(JSON.stringify({ success: true, message: `Berhasil ditambahkan dengan Kode Final: ${finalKode}`, finalKode: finalKode }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
    } finally {
      releaseLock!(); // Melepaskan kunci agar antrean selanjutnya bisa diproses
    }
    
  } catch (error: any) {
    console.error("Error saat menyimpan ke Google Sheets:", error);
    return new Response(JSON.stringify({ error: error.message || "Gagal menyimpan data ke Google Sheets" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
