import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../api/auth";
import { LoginForm } from "../components/login-form";
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
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const reason = localStorage.getItem(SESSION_EXPIRED_KEY);
    if (reason) {
      setShowSessionExpired(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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

      if (status === 401) {
        setError("Wrong email or password. Please try again.");
      } else if (status === 423 && message) {
        // Account locked message from backend (e.g. too many failed attempts)
        setError(message);
      } else {
        setError(message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
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
        isLoading={isLoading}
        className="w-full max-w-4xl"
      />
    </div>
  );
}