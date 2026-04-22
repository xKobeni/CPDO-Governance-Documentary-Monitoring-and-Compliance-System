import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [step, setStep] = useState("request");
  const [email, setEmail] = useState(prefilledEmail);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await requestPasswordReset(email);
      setSuccess(data.message || "If the account exists, a reset code has been sent to your email.");
      setResetToken(data.resetToken || "");
      if (data.resetToken) {
        setStep("reset");
      }
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
    if (!resetToken.trim()) {
      setError("Please enter the reset code");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await resetPassword(resetToken.trim(), newPassword);
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
                <h1 className="text-2xl font-bold">Forgot Password</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  {step === "request"
                    ? "Enter your email to receive a reset code"
                    : "Enter the reset code and your new password"}
                </p>
              </div>

              {error && <Alert variant="destructive">{error}</Alert>}
              {success && <Alert className="bg-green-50 text-green-800 border-green-200">{success}</Alert>}

              {step === "request" ? (
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
                    />
                  </Field>
                  <Button type="submit" disabled={isLoading} className="w-full bg-black hover:bg-gray-800 text-white">
                    {isLoading ? "Sending..." : "Get reset code"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep("reset")}
                    disabled={isLoading}
                  >
                    I already have a reset code
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="resetToken">Reset code</FieldLabel>
                    <Input
                      id="resetToken"
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="XXXXXX-XXXXXX"
                      required
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("request")}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-black hover:bg-gray-800 text-white">
                      {isLoading ? "Resetting..." : "Reset password"}
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
