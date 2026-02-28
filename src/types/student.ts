export interface Student {
  id: string;
  name: string;
  regNumber: string;
  course: string;
  yearOfStudy: number;
  laptopSerialNumber: string;
  laptopBarcode: string;
  imageUrl: string;
  phone: string;
  createdAt: string;
}

export interface GateLog {
  id: string;
  studentId: string;
  studentName: string;
  direction: 'in' | 'out';
  timestamp: string;
}
