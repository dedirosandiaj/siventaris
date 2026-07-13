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
      range: "siventaris!A:Y",
    });

    const rows = response.data.values || [];
    
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error fetching data:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function PUT(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { rowIndex, values } = body;

    if (rowIndex === undefined || !values || !Array.isArray(values)) {
      return new Response(JSON.stringify({ error: "rowIndex dan values yang valid diperlukan" }), { status: 400 });
    }

    const { sheets, spreadsheetId } = await getSheetsClient();
    
    // rowIndex dari FE adalah 1-based index (header adalah row 1). 
    // Jadi baris data pertama ada di row 2. (rowIndex + 1)
    const actualRow = rowIndex + 1;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `siventaris!A${actualRow}:Y${actualRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [values],
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Error updating data:", error);
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

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "siventaris")?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("Sheet siventaris tidak ditemukan");
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex, // 0-indexed. Jika baris ke-2, startIndex = 1
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Error deleting data:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
