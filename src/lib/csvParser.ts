import Papa from "papaparse";
import { Guest } from "./types";
import { v4 as uuidv4 } from "uuid";

interface CsvRow {
  name: string;
  table: string;
  seat?: string;
}

export function parseCsvToGuests(
  csvText: string,
  tableIdMap: Record<string, string>
): Guest[] {
  const result = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.data
    .filter((row) => row.name && row.table)
    .map((row) => {
      const tableLookup = row.table.trim();
      const tableId =
        tableIdMap[tableLookup] ||
        tableIdMap[`Table ${tableLookup}`] ||
        tableLookup;

      return {
        id: uuidv4(),
        name: row.name.trim(),
        tableId,
        seatNumber: row.seat ? parseInt(row.seat, 10) : undefined,
      };
    });
}
