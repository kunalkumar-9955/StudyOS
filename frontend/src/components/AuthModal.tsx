"use client";

import React, { useState } from "react";
import { X, Lock, User, Mail, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await ApiClient.request("/auth/register/", {
          method: "POST",
          body: JSON.stringify({ username, password, email }),
        });
      }

      const loginResp = await ApiClient.request<any>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      ApiClient.setTokens({
        access: loginResp.access,
        refresh: loginResp.refresh,
      });

      const userObj = { username, email };
      localStorage.setItem("studyos_user", JSON.stringify(userObj));
      onAuthSuccess(userObj);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-md theme-border border p-4 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base theme-text-primary">
              {isRegister ? "Create StudyOS Account" : "Sign In to StudyOS"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded theme-text-muted hover:theme-text-primary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold theme-text-secondary mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 theme-text-dim absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full pl-9 pr-3 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 theme-text-dim absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl theme-input text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold theme-text-secondary mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 theme-text-dim absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="pt-2 border-t theme-border text-center text-xs theme-text-muted">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setIsRegister(false)}
                className="text-indigo-500 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to StudyOS?{" "}
              <button
                onClick={() => setIsRegister(true)}
                className="text-indigo-500 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Create Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
