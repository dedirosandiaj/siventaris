import { APIEvent } from "@solidjs/start/server";
import { google } from "googleapis";

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    
    // Konfigurasi Kredensial dari Environment Variables
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Private key bisa berisi \n yang harus di-replace atau di-parse dengan benar
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

    // Menyusun nilai-nilai baris berdasarkan field (23 kolom)
    const rowValues = [
      body.Kode,
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
      range: "siventaris!A1", // Menggunakan nama sheet 'siventaris'
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });

    return new Response(JSON.stringify({ success: true, message: "Data berhasil ditambahkan" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error: any) {
    console.error("Error saat menyimpan ke Google Sheets:", error);
    return new Response(JSON.stringify({ error: error.message || "Gagal menyimpan data ke Google Sheets" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
