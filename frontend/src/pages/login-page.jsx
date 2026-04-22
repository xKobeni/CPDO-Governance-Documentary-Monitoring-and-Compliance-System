import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { login, resendVerification } from "../api/auth";
import { LoginForm } from "../components/login-form";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";

const SESSION_EXPIRED_KEY = "sessionExpiredReason";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("error"); // "error" | "warning" | "verification"
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const reason = localStorage.getItem(SESSION_EXPIRED_KEY);
    if (reason) {
      setShowSessionExpired(true);
    }
  }, []);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const verify = searchParams.get("verify");
    if (!verified && !verify) return;

    const next = new URLSearchParams(searchParams);
    if (verified === "1") {
      toast.success("Your email has been verified. You can sign in now.");
      next.delete("verified");
    }
    if (verify === "invalid") {
      toast.error("That verification link is invalid or has expired.");
      next.delete("verify");
    }
    if (verify === "error") {
      toast.error("Verification could not be completed. Try again or contact support.");
      next.delete("verify");
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setErrorType("error");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const rememberMe = formData.get("remember-me") === "on";

    try {
      await login({ email, password, rememberMe });
      localStorage.removeItem(SESSION_EXPIRED_KEY);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      const code = err?.response?.data?.code;

      if (status === 403 && code === "EMAIL_NOT_VERIFIED") {
        setErrorType("verification");
        setError(
          message ||
            "Please verify your email before signing in. Check your inbox for the verification link."
        );
      } else if (status === 403) {
        setErrorType("warning");
        setError(message || "Your account has been deactivated. Please contact the administrator.");
      } else if (status === 401) {
        setError("Wrong email or password. Please try again.");
      } else if (status === 423 && message) {
        // Account locked (too many failed attempts)
        setError(message);
      } else {
        setError(message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (emailVal) => {
    const trimmed = String(emailVal || "").trim();
    if (!trimmed) {
      toast.error("Enter your email address first.");
      return;
    }
    setResendBusy(true);
    try {
      await resendVerification(trimmed);
      toast.success("If that account is pending verification, we sent another email.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not send verification email. Try again later.");
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Dialog
        open={showSessionExpired}
        onOpenChange={(open) => {
          setShowSessionExpired(open);
          if (!open) localStorage.removeItem(SESSION_EXPIRED_KEY);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Your session has expired due to inactivity. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSessionExpired(false);
                localStorage.removeItem(SESSION_EXPIRED_KEY);
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginForm
        onSubmit={handleSubmit}
        error={error}
        errorType={errorType}
        isLoading={isLoading}
        onResendVerification={handleResendVerification}
        resendVerificationLoading={resendBusy}
        className="w-full max-w-4xl"
      />
    </div>
  );
}