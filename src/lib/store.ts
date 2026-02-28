import { Student, GateLog } from "@/types/student";

const STUDENTS_KEY = "anu_gate_students";
const LOGS_KEY = "anu_gate_logs";
const AUTH_KEY = "anu_gate_auth";

// Seed some demo students
const DEMO_STUDENTS: Student[] = [
  {
    id: "1",
    name: "John Kamau Mwangi",
    regNumber: "ANU/2024/001",
    course: "Bachelor of Computer Science",
    yearOfStudy: 2,
    laptopSerialNumber: "HP-5CD1234567",
    laptopBarcode: "ANU2024001",
    imageUrl: "",
    phone: "+254 712 345 678",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Mary Wanjiku Njeri",
    regNumber: "ANU/2024/002",
    course: "Bachelor of Business Administration",
    yearOfStudy: 3,
    laptopSerialNumber: "DELL-XPS9876543",
    laptopBarcode: "ANU2024002",
    imageUrl: "",
    phone: "+254 723 456 789",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Peter Ochieng Otieno",
    regNumber: "ANU/2024/003",
    course: "Bachelor of Education",
    yearOfStudy: 1,
    laptopSerialNumber: "LEN-PF3R1234",
    laptopBarcode: "ANU2024003",
    imageUrl: "",
    phone: "+254 734 567 890",
    createdAt: new Date().toISOString(),
  },
];

function initStudents(): Student[] {
  const stored = localStorage.getItem(STUDENTS_KEY);
  if (!stored) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(DEMO_STUDENTS));
    return DEMO_STUDENTS;
  }
  return JSON.parse(stored);
}

export function getStudents(): Student[] {
  return initStudents();
}

export function addStudent(student: Omit<Student, "id" | "createdAt">): Student {
  const students = getStudents();
  const newStudent: Student = {
    ...student,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  students.push(newStudent);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  return newStudent;
}

export function updateStudent(id: string, updates: Partial<Student>): Student | null {
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  students[idx] = { ...students[idx], ...updates };
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  return students[idx];
}

export function deleteStudent(id: string): boolean {
  const students = getStudents();
  const filtered = students.filter((s) => s.id !== id);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(filtered));
  return filtered.length < students.length;
}

export function findStudentByBarcode(barcode: string): Student | undefined {
  return getStudents().find(
    (s) => s.laptopBarcode.toLowerCase() === barcode.toLowerCase()
  );
}

export function getGateLogs(): GateLog[] {
  const stored = localStorage.getItem(LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addGateLog(log: Omit<GateLog, "id" | "timestamp">): GateLog {
  const logs = getGateLogs();
  const newLog: GateLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return newLog;
}

// Simple auth
export function login(username: string, password: string): boolean {
  if (username === "admin" && password === "anu2024") {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}
