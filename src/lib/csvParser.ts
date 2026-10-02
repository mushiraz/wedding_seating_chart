import Papa from "papaparse";
import { Guest } from "./types";
import { v4 as uuidv4 } from "uuid";

interface SimpleCsvRow {
  name: string;
  table: string;
  seat?: string;
}

interface RsvpCsvRow {
  title: string;
  "first name": string;
  "last name": string;
  suffix: string;
  "nikkah & walima (ceremony & reception)": string;
  "are there any dietary restrictions that we should know of?": string;
  "any song requests?": string;
  "advice for the newlyweds?": string;
}

function isRsvpFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return lower.includes("first name") && lower.includes("last name");
}

const FILLER_VALUES = new Set(["no", "n/a", "na", "nil", "-nil-", "none", ""]);

function cleanOptionalField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (FILLER_VALUES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

function parseRsvpCsv(csvText: string): Guest[] {
  const result = Papa.parse<RsvpCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const guests: Guest[] = [];
  let lastNamedPerson = "";

  for (const row of result.data) {
    const rsvpStatus = (row["nikkah & walima (ceremony & reception)"] || "").trim().toLowerCase();

    if (rsvpStatus !== "attending") continue;

    const firstName = (row["first name"] || "").trim();
    const lastName = (row["last name"] || "").trim();

    const isUnnamedGuest = firstName.toLowerCase() === "guest" && !lastName;

    let name: string;
    if (isUnnamedGuest) {
      name = lastNamedPerson ? `${lastNamedPerson}'s Guest` : "Guest";
    } else {
      name = [firstName, lastName].filter(Boolean).join(" ");
      lastNamedPerson = name;
    }

    if (!name) continue;

    guests.push({
      id: uuidv4(),
      name,
      tableId: "",
      dietaryRestrictions: cleanOptionalField(
        row["are there any dietary restrictions that we should know of?"]
      ),
      songRequest: cleanOptionalField(row["any song requests?"]),
      advice: cleanOptionalField(row["advice for the newlyweds?"]),
    });
  }

  return guests;
}

export function parseCsvToGuests(
  csvText: string,
  tableIdMap: Record<string, string>
): Guest[] {
  const firstLine = csvText.split("\n")[0] || "";
  const headers = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  if (isRsvpFormat(headers)) {
    return parseRsvpCsv(csvText);
  }

  const result = Papa.parse<SimpleCsvRow>(csvText, {
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
