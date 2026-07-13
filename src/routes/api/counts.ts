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
      // Ruangan is index 3 (Column D)
      // Jml is index 7 (Column H)
      const ruangan = row[3] ? row[3].toString().toUpperCase().trim() : "";
      const jmlStr = row[7] ? row[7].toString().trim() : "1";
      
      const jml = parseInt(jmlStr) || 0;

      if (ruangan) {
        counts[ruangan] = (counts[ruangan] || 0) + jml;
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
