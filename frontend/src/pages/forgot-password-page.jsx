import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { requestPasswordReset, resetPassword } from "../api/auth";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "../components/ui/field";
import { EyeIcon, EyeOffIcon, ArrowLeftIcon } from "lucide-react";
import { cn } from "../lib/utils";

function initialStepFromParams(searchParams) {
  return searchParams.get("step") === "reset" ? "reset" : "request";
}

export default function ForgotPasswordPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [step, setStep] = useState(() => initialStepFromParams(searchParams));
  const [email, setEmail] = useState(prefilledEmail);
  const [sentForEmail, setSentForEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devCodeHint, setDevCodeHint] = useState("");

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const emailParam = searchParams.get("email");
    if (stepParam === "reset") {
      setStep("reset");
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, [searchParams]);

  const heading = useMemo(() => {
    if (step === "request") return "Forgot password?";
    if (step === "sent") return "Check your email";
    return "Reset password";
  }, [step]);

  const subheading = useMemo(() => {
    if (step === "request") {
      return "Enter your email and we'll send you a 6-digit code to reset your password.";
    }
    if (step === "sent") {
      const addr = sentForEmail || email;
      return `If ${addr} is registered, we sent a 6-digit code. Use it on the next page to set a new password.`;
    }
    return "Enter the 6-digit code from your email and choose a new password.";
  }, [step, sentForEmail, email]);

  const goToResetStep = () => {
    setError("");
    setSuccess("");
    setStep("reset");
    const next = new URLSearchParams();
    next.set("step", "reset");
    if (email.trim()) next.set("email", email.trim());
    setSearchParams(next, { replace: true });
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setDevCodeHint("");
    try {
      const data = await requestPasswordReset(email);
      setSentForEmail(email.trim());
      setDevCodeHint(data.resetToken ? String(data.resetToken) : "");
      if (data.resetToken) {
        setResetToken(String(data.resetToken));
      }
      setStep("sent");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to request password reset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    const codeDigits = resetToken.replace(/\D/g, "");
    if (codeDigits.length !== 6) {
      setError("Please enter the 6-digit code from your email");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      await resetPassword(codeDigits, newPassword);
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password. The code may be invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className={cn("w-full max-w-md")}>
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{heading}</h1>
                <p className="text-balance text-muted-foreground text-sm">{subheading}</p>
              </div>

              {error && <Alert variant="destructive">{error}</Alert>}
              {success && <Alert className="bg-green-50 text-green-800 border-green-200">{success}</Alert>}

              {step === "request" && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@cpdo.gov.ph"
                      required
                      autoComplete="email"
                    />
                  </Field>
                  <Button type="submit" disabled={isLoading} className="w-full bg-black hover:bg-gray-800 text-white">
                    {isLoading ? "Sending..." : "Send code"}
                  </Button>
                </form>
              )}

              {step === "sent" && (
                <div className="space-y-4">
                  {devCodeHint && (
                    <Alert className="bg-amber-50 text-amber-900 border-amber-200 text-sm">
                      Local testing: your code is <span className="font-mono font-semibold">{devCodeHint}</span>
                    </Alert>
                  )}
                  <Button type="button" className="w-full bg-black hover:bg-gray-800 text-white" onClick={goToResetStep}>
                    Enter reset code
                  </Button>
                </div>
              )}

              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="resetToken">Reset code</FieldLabel>
                      <Input
                        id="resetToken"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        required
                        className="font-mono tracking-widest text-center text-lg"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </FieldGroup>
                  <div className="flex flex-col gap-2">
                    <Button type="submit" disabled={isLoading} className="w-full bg-black hover:bg-gray-800 text-white">
                      {isLoading ? "Resetting..." : "Reset password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setResetToken("");
                        setStep("request");
                        setSearchParams({}, { replace: true });
                      }}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
