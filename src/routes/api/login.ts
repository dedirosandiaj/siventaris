import { APIEvent } from "@solidjs/start/server";
import { google } from "googleapis";

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username dan Password harus diisi" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Membaca data dari sheet 'user-login'
    // Asumsi: Kolom A = Username, Kolom B = Password
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "user-login!A:B",
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Data login kosong atau sheet tidak ditemukan" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Periksa kecocokan kredensial
    // Kita abaikan header di baris pertama jika ada, tapi karena pencarian exact match, header tidak masalah
    const isValidUser = rows.some((row: any[]) => {
      const dbUser = row[0]?.toString().trim();
      const dbPass = row[1]?.toString().trim();
      return dbUser === username && dbPass === password;
    });

    if (isValidUser) {
      return new Response(JSON.stringify({ success: true, message: "Login berhasil" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Username atau Password salah" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
  } catch (error: any) {
    console.error("Error saat login:", error);
    return new Response(JSON.stringify({ error: error.message || "Gagal melakukan proses login" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
