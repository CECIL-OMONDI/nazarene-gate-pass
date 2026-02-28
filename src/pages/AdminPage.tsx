import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudents, addStudent, deleteStudent, isLoggedIn, logout } from "@/lib/store";
import { Student } from "@/types/student";
import { Shield, Plus, Trash2, LogOut, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const AdminPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    regNumber: "",
    course: "",
    yearOfStudy: 1,
    laptopSerialNumber: "",
    laptopBarcode: "",
    phone: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    setStudents(getStudents());
  }, [navigate]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addStudent(form);
    setStudents(getStudents());
    setForm({
      name: "",
      regNumber: "",
      course: "",
      yearOfStudy: 1,
      laptopSerialNumber: "",
      laptopBarcode: "",
      phone: "",
      imageUrl: "",
    });
    setDialogOpen(false);
    toast.success("Student added successfully");
  };

  const handleDelete = (id: string) => {
    deleteStudent(id);
    setStudents(getStudents());
    toast.success("Student removed");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.regNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.laptopBarcode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-secondary-foreground/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-heading text-lg font-bold text-primary">
              ANU GATE ADMIN
            </h1>
            <p className="text-xs text-secondary-foreground/70">
              Student Management Panel
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate("/")}
          >
            Gate Scanner
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-secondary-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{students.length}</p>
              <p className="text-xs text-muted-foreground">Registered Students</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, reg number, or barcode..."
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-heading font-semibold">
                <Plus className="h-4 w-4 mr-1" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Full Name</Label>
                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reg Number</Label>
                    <Input required value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} placeholder="ANU/2024/001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Course</Label>
                    <Input required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year of Study</Label>
                    <Input type="number" min={1} max={6} required value={form.yearOfStudy} onChange={(e) => setForm({ ...form, yearOfStudy: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Laptop Serial No.</Label>
                    <Input required value={form.laptopSerialNumber} onChange={(e) => setForm({ ...form, laptopSerialNumber: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Laptop Barcode</Label>
                    <Input required value={form.laptopBarcode} onChange={(e) => setForm({ ...form, laptopBarcode: e.target.value })} placeholder="Unique barcode identifier" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Photo URL (optional)</Label>
                    <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <Button type="submit" className="w-full font-heading font-semibold">
                  Add Student
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-heading text-secondary-foreground">Name</TableHead>
                <TableHead className="font-heading text-secondary-foreground">Reg No.</TableHead>
                <TableHead className="font-heading text-secondary-foreground hidden md:table-cell">Course</TableHead>
                <TableHead className="font-heading text-secondary-foreground hidden lg:table-cell">Laptop S/N</TableHead>
                <TableHead className="font-heading text-secondary-foreground">Barcode</TableHead>
                <TableHead className="font-heading text-secondary-foreground w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-semibold">{student.name}</TableCell>
                  <TableCell className="font-mono text-sm">{student.regNumber}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{student.course}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-sm">{student.laptopSerialNumber}</TableCell>
                  <TableCell className="font-mono text-sm text-primary font-semibold">{student.laptopBarcode}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
