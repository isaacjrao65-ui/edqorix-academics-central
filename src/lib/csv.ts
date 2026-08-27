export type UserRoleKey = "admin" | "exam_cell" | "hod" | "faculty";

export const USER_ROLE_LABEL: Record<UserRoleKey, string> = {
  admin: "Principal / Super admin",
  exam_cell: "Staff / Management",
  hod: "Head of department",
  faculty: "Teacher",
};

export const USER_ROLE_ALIASES: Record<string, UserRoleKey> = {
  admin: "admin",
  principal: "admin",
  "super admin": "admin",
  super_admin: "admin",
  staff: "exam_cell",
  management: "exam_cell",
  exam_cell: "exam_cell",
  "exam cell": "exam_cell",
  hod: "hod",
  "head of department": "hod",
  teacher: "faculty",
  faculty: "faculty",
  "class teacher": "faculty",
  "subject teacher": "faculty",
};

export type UserCsvRow = {
  line: number;
  fullName: string;
  email: string;
  password: string;
  role: UserRoleKey;
  designation?: string | undefined;
  isClassTeacher?: boolean | undefined;
};

export type StudentCsvRow = {
  line: number;
  rollNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  admissionNumber: string | null;
  currentSemester: number;
  batchYear: number | null;
  className: string | null;
};

/** Split one CSV/TSV line, honouring quoted cells. */
export function splitCsvLine(line: string, delimiter = ",") {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function detectDelimiter(headerLine: string) {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";") && !headerLine.includes(",")) return ";";
  return ",";
}

function headerIndexer(header: string[]) {
  return (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
}

function readSheet(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const delimiter = detectDelimiter(lines[0] ?? "");
  const header = splitCsvLine(lines[0] ?? "", delimiter).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_"),
  );
  return { lines, header, delimiter };
}

export function parseUsersCsv(text: string): { rows: UserCsvRow[]; errors: string[] } {
  const sheet = readSheet(text);
  if (!sheet)
    return { rows: [], errors: ["The file needs a header row and at least one person."] };

  const idx = headerIndexer(sheet.header);
  const iName = idx("full_name", "name");
  const iEmail = idx("email");
  const iPass = idx("password", "temporary_password");
  const iRole = idx("role");
  const iDesig = idx("designation");
  const iClass = idx("class_teacher", "is_class_teacher");

  if (iName < 0 || iEmail < 0 || iPass < 0 || iRole < 0) {
    return {
      rows: [],
      errors: ["Header must include full_name, email, password and role columns."],
    };
  }

  const rows: UserCsvRow[] = [];
  const errors: string[] = [];
  sheet.lines.slice(1).forEach((line, i) => {
    const lineNo = i + 2;
    const cells = splitCsvLine(line, sheet.delimiter);
    const fullName = cells[iName] ?? "";
    const email = (cells[iEmail] ?? "").toLowerCase();
    const password = cells[iPass] ?? "";
    const roleRaw = (cells[iRole] ?? "").toLowerCase();
    const role = USER_ROLE_ALIASES[roleRaw];
    const classFlag = (cells[iClass] ?? "").toLowerCase();

    if (fullName.length < 2) errors.push(`Line ${lineNo}: full name is missing.`);
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`Line ${lineNo}: invalid email.`);
    else if (password.length < 8) errors.push(`Line ${lineNo}: password must be 8+ characters.`);
    else if (!role) errors.push(`Line ${lineNo}: unknown role "${cells[iRole] ?? ""}".`);
    else
      rows.push({
        line: lineNo,
        fullName,
        email,
        password,
        role,
        designation: iDesig >= 0 ? cells[iDesig] || undefined : undefined,
        isClassTeacher:
          roleRaw === "class teacher" || ["yes", "true", "1", "y"].includes(classFlag),
      });
  });

  return { rows, errors };
}

export function parseStudentsCsv(text: string): { rows: StudentCsvRow[]; errors: string[] } {
  const sheet = readSheet(text);
  if (!sheet)
    return { rows: [], errors: ["The file needs a header row and at least one student."] };

  const idx = headerIndexer(sheet.header);
  const iRoll = idx("roll_number", "roll", "roll_no");
  const iName = idx("full_name", "name", "student_name");
  const iEmail = idx("email");
  const iPhone = idx("phone", "mobile");
  const iAdm = idx("admission_number", "admission_no");
  const iSem = idx("current_semester", "semester", "sem");
  const iBatch = idx("batch_year", "batch");
  const iClass = idx("class", "class_name", "section");

  if (iRoll < 0 || iName < 0) {
    return { rows: [], errors: ["Header must include roll_number and full_name columns."] };
  }

  const rows: StudentCsvRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  sheet.lines.slice(1).forEach((line, i) => {
    const lineNo = i + 2;
    const cells = splitCsvLine(line, sheet.delimiter);
    const rollNumber = cells[iRoll] ?? "";
    const fullName = cells[iName] ?? "";
    const email = iEmail >= 0 ? (cells[iEmail] || "").toLowerCase() : "";

    if (!rollNumber) {
      errors.push(`Line ${lineNo}: roll number is missing.`);
      return;
    }
    if (fullName.length < 2) {
      errors.push(`Line ${lineNo}: full name is missing.`);
      return;
    }
    if (seen.has(rollNumber.toLowerCase())) {
      errors.push(`Line ${lineNo}: duplicate roll number "${rollNumber}" in this file.`);
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push(`Line ${lineNo}: invalid email.`);
      return;
    }
    seen.add(rollNumber.toLowerCase());

    const semRaw = iSem >= 0 ? Number(cells[iSem]) : NaN;
    const batchRaw = iBatch >= 0 ? Number(cells[iBatch]) : NaN;

    rows.push({
      line: lineNo,
      rollNumber,
      fullName,
      email: email || null,
      phone: iPhone >= 0 ? cells[iPhone] || null : null,
      admissionNumber: iAdm >= 0 ? cells[iAdm] || null : null,
      currentSemester: Number.isFinite(semRaw) && semRaw > 0 ? semRaw : 1,
      batchYear: Number.isFinite(batchRaw) && batchRaw > 0 ? batchRaw : null,
      className: iClass >= 0 ? cells[iClass] || null : null,
    });
  });

  return { rows, errors };
}

export const USER_CSV_TEMPLATE =
  "full_name,email,password,role,designation,class_teacher\n" +
  "Anita Sharma,anita@school.edu,Passw0rd!23,principal,Principal,no\n" +
  "Ravi Kumar,ravi@school.edu,Passw0rd!23,staff,Exam cell,no\n" +
  "Meera Nair,meera@school.edu,Passw0rd!23,hod,Head of Science,no\n" +
  "Sunil Das,sunil@school.edu,Passw0rd!23,teacher,Mathematics,yes\n";

export const STUDENT_CSV_TEMPLATE =
  "roll_number,full_name,email,phone,admission_number,current_semester,batch_year,class\n" +
  "21CS001,Aarav Sharma,aarav@example.edu,9876543210,ADM-1001,5,2021,10-A\n" +
  "21CS002,Diya Menon,diya@example.edu,9876543211,ADM-1002,5,2021,10-A\n";

export function downloadCsv(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
