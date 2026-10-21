import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ShieldCheck,
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, studentLogin } = useAuth();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<'student' | 'librarian'>('student');

  // Student Form State
  const [studentId, setStudentId] = useState('STU-2026-042');
  const [studentName, setStudentName] = useState('Alex Rivera');
  const [department, setDepartment] = useState('Computer Science & Engineering');

  // Admin Form State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await studentLogin({
        studentId: studentId.trim() || 'STU-2026-042',
        name: studentName.trim() || 'Alex Rivera',
        department: department.trim() || 'Computer Science & Engineering',
      });
      success('Welcome to Student Portal', `Logged in as ${studentName || 'Student'}.`);
      navigate('/student');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in as student.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both administrative username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(username.trim(), password);
      success('Logged In Successfully', 'Welcome back to the Librarian Administration Portal.');
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/30">
            {activeTab === 'student' ? (
              <GraduationCap className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Library Profile Portal
          </h2>
          <p className="text-xs text-slate-400">
            Select your profile to access library services, shelf maps, or staff management
          </p>
        </div>

        {/* Profile Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Student Profile
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('librarian');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'librarian'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Librarian Staff
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/50 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Student Profile Login */}
        {activeTab === 'student' && (
          <form
            onSubmit={handleStudentSubmit}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md"
          >
            <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/30 text-indigo-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <strong className="text-white">Student Access:</strong>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Sign in to view your borrowed books, shelf return coordinates, and digital library card.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="student-name">
                Student Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="student-id">
                Student Barcode / ID Number
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-042"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="department">
                Department / Major
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Loading Profile...</span>
              ) : (
                <>
                  <span>Enter Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Librarian Staff Login */}
        {activeTab === 'librarian' && (
          <form
            onSubmit={handleAdminSubmit}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md"
          >
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 text-indigo-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <strong className="text-white">Default Prototype Credentials:</strong>
                <div className="mt-1 font-mono text-[11px] text-slate-300 space-y-0.5">
                  <div>Username: <span className="text-indigo-300 font-bold">admin</span></div>
                  <div>Password: <span className="text-indigo-300 font-bold">adminpassword123</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="username">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="password">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In as Staff Librarian</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
