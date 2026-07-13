import { APIEvent } from "@solidjs/start/server";
import { google } from "googleapis";

async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Konfigurasi belum lengkap.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}

export async function GET(event: APIEvent) {
  try {
    const { sheets, spreadsheetId } = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "user-login!A:B",
    });

    const rows = response.data.values || [];
    const users = rows.map((row, index) => ({
      username: row[0] || "",
      password: row[1] || "",
      rowIndex: index // 0-indexed row (row 1 in sheet is index 0)
    })).filter(u => u.username !== "" && u.rowIndex !== 0); // Filter out empty rows and header

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username & Password wajib" }), { status: 400 });
    }

    const { sheets, spreadsheetId } = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "user-login!A:B",
      valueInputOption: "RAW",
      requestBody: {
        values: [[username, password]],
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE(event: APIEvent) {
  try {
    const url = new URL(event.request.url);
    const rowIndexStr = url.searchParams.get("rowIndex");
    if (rowIndexStr === null) {
      return new Response(JSON.stringify({ error: "rowIndex dibutuhkan" }), { status: 400 });
    }

    const rowIndex = parseInt(rowIndexStr);
    const { sheets, spreadsheetId } = await getSheetsClient();

    // Dapatkan sheetId untuk "user-login"
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "user-login")?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("Sheet user-login tidak ditemukan");
    }

    // Hapus baris secara fisik
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
