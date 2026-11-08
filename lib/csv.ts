/** Minimal RFC 4180 parser: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field !== "" || row.length) endRow();
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some(Boolean));
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]) {
  return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export type ParsedPerson = { name: string; email: string; role?: string; courses?: string; guessedName?: boolean };

const EMAIL_IN = /[^\s<>,;"]+@[^\s<>,;"]+\.[^\s<>,;"]+/;
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** "jane.doe@x.com" → "Jane Doe" */
export const nameFromEmail = (email: string) => titleCase(email.split("@")[0].replace(/[._-]+/g, " ").replace(/\d+/g, "").trim()) || email;

/**
 * Accepts a CSV with a header row (name, email, role, courses — any order),
 * or free-form lines like "Jane Doe, jane@x.com", "Jane Doe <jane@x.com>" or just "jane@x.com".
 */
export function parsePeople(text: string): ParsedPerson[] {
  const delimiter = text.split("\n")[0].includes("\t") ? "\t" : ",";
  const rows = parseCsv(text, delimiter);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const emailCol = col("email", "emailaddress", "mail");

  if (emailCol >= 0) {
    const nameCol = col("name", "fullname", "studentname", "displayname");
    const first = col("firstname", "givenname"), last = col("lastname", "surname", "familyname");
    const roleCol = col("role", "type"), coursesCol = col("courses", "course", "coursecodes");
    return rows.slice(1).map((r) => {
      const email = (r[emailCol] ?? "").toLowerCase();
      let name = nameCol >= 0 ? r[nameCol] ?? "" : [first >= 0 ? r[first] : "", last >= 0 ? r[last] : ""].join(" ").trim();
      const guessedName = !name && !!email;
      if (!name && email) name = nameFromEmail(email);
      return { name, email, role: roleCol >= 0 ? r[roleCol] : undefined, courses: coursesCol >= 0 ? r[coursesCol] : undefined, guessedName };
    });
  }

  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const email = (line.match(EMAIL_IN)?.[0] ?? "").toLowerCase();
      const rest = line.replace(EMAIL_IN, "").replace(/[<>()"]/g, "").split(/[,;\t]/).map((s) => s.trim()).filter(Boolean);
      const name = rest[0] ?? "";
      return { name: name || (email ? nameFromEmail(email) : line), email, role: rest[1], courses: rest.slice(2).join(";") || undefined, guessedName: !name };
    });
}
