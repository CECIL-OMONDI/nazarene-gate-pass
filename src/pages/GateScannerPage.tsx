import { useState, useRef, useEffect } from "react";
import { findStudentByBarcode, addGateLog, getGateLogs } from "@/lib/store";
import { Student, GateLog } from "@/types/student";
import { Shield, Scan, User, Laptop, BookOpen, Clock, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const GateScannerPage = () => {
  const [barcode, setBarcode] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "found" | "not-found">("idle");
  const [recentLogs, setRecentLogs] = useState<GateLog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setRecentLogs(getGateLogs().slice(0, 10));
    inputRef.current?.focus();
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const student = findStudentByBarcode(barcode.trim());
    if (student) {
      setFoundStudent(student);
      setScanStatus("found");
      addGateLog({
        studentId: student.id,
        studentName: student.name,
        direction: "in",
      });
      setRecentLogs(getGateLogs().slice(0, 10));
    } else {
      setFoundStudent(null);
      setScanStatus("not-found");
    }
    setBarcode("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const resetScan = () => {
    setScanStatus("idle");
    setFoundStudent(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-secondary-foreground/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-heading text-lg font-bold text-primary">
              ANU GATE SECURITY
            </h1>
            <p className="text-xs text-secondary-foreground/70">
              Laptop Barcode Scanner
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => navigate("/login")}
        >
          Admin Login
        </Button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Scanner Area */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          {/* Scan Input */}
          <div className="w-full max-w-lg mb-8">
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Scan className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-semibold text-foreground">
                  Scan Laptop Barcode
                </h2>
              </div>
              <form onSubmit={handleScan} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode here..."
                  className="flex-1 text-lg h-12"
                  autoFocus
                />
                <Button type="submit" className="h-12 px-6 font-heading font-semibold">
                  Verify
                </Button>
              </form>
            </div>
          </div>

          {/* Result */}
          {scanStatus === "found" && foundStudent && (
            <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-card rounded-lg shadow-xl border-2 border-success overflow-hidden">
                <div className="bg-success px-6 py-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success-foreground" />
                  <span className="font-heading font-bold text-success-foreground">
                    ACCESS GRANTED
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Photo */}
                    <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
                      {foundStudent.imageUrl ? (
                        <img
                          src={foundStudent.imageUrl}
                          alt={foundStudent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-16 w-16 text-muted-foreground" />
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Student Name</p>
                        <p className="font-heading font-bold text-xl text-foreground">
                          {foundStudent.name}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Reg Number</p>
                          <p className="font-semibold text-foreground">{foundStudent.regNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Year</p>
                          <p className="font-semibold text-foreground">Year {foundStudent.yearOfStudy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <p className="text-sm text-foreground">{foundStudent.course}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-primary" />
                        <p className="text-sm text-foreground font-mono">{foundStudent.laptopSerialNumber}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={resetScan}
                    className="w-full mt-4 font-heading"
                    variant="outline"
                  >
                    Scan Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {scanStatus === "not-found" && (
            <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-card rounded-lg shadow-xl border-2 border-destructive overflow-hidden">
                <div className="bg-destructive px-6 py-3 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive-foreground" />
                  <span className="font-heading font-bold text-destructive-foreground">
                    ACCESS DENIED — LAPTOP NOT REGISTERED
                  </span>
                </div>
                <div className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    This barcode is not registered in the system. Please contact the admin.
                  </p>
                  <Button onClick={resetScan} variant="outline" className="font-heading">
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {scanStatus === "idle" && (
            <div className="text-center text-muted-foreground">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-gold">
                <Scan className="h-12 w-12 text-primary" />
              </div>
              <p className="font-heading font-semibold">Waiting for barcode scan...</p>
              <p className="text-sm mt-1">Place the laptop barcode under the scanner</p>
            </div>
          )}
        </div>

        {/* Recent Logs Sidebar */}
        <div className="w-full lg:w-80 bg-card border-l border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Recent Activity</h3>
          </div>
          <div className="space-y-2">
            {recentLogs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
            )}
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="bg-muted rounded-md px-3 py-2 text-xs"
              >
                <p className="font-semibold text-foreground">{log.studentName}</p>
                <p className="text-muted-foreground">
                  {format(new Date(log.timestamp), "HH:mm:ss — dd MMM yyyy")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GateScannerPage;
