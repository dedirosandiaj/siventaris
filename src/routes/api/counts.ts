import { APIEvent } from "@solidjs/start/server";
import { google } from "googleapis";

export async function GET(event: APIEvent) {
  try {
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "siventaris!A:H",
    });

    const rows = response.data.values || [];
    const counts: Record<string, number> = {};

    // Start from index 1 to skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const kode = row[0] ? row[0].toString().trim() : "";
      const ruangan = row[3] ? row[3].toString().toUpperCase().trim() : "";

      if (kode && ruangan) {
        // Parse Kode, contoh: INV.SP/ANM/037-038/P.GIGI/2028/PDP/RSKTM
        const parts = kode.split('/');
        if (parts.length >= 4) {
          const numPart = parts[2]; // e.g., "036" atau "037-038"
          let maxNumInRow = 0;
          
          if (numPart.includes('-')) {
             const subParts = numPart.split('-');
             const endNum = parseInt(subParts[1], 10);
             if (!isNaN(endNum)) maxNumInRow = endNum;
          } else {
             const num = parseInt(numPart, 10);
             if (!isNaN(num)) maxNumInRow = num;
          }

          // Simpan angka terbesar (highest number assigned) untuk Ruangan ini
          if (maxNumInRow > (counts[ruangan] || 0)) {
            counts[ruangan] = maxNumInRow;
          }
        }
      }
    }

    return new Response(JSON.stringify(counts), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error saat mengambil data dari Google Sheets:", error);
    return new Response(JSON.stringify({ error: error.message || "Gagal mengambil data dari Google Sheets" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
