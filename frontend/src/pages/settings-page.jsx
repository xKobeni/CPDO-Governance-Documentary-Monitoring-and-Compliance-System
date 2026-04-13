import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { logout, requestPasswordReset, resetPassword } from "../api/auth";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Alert } from "../components/ui/alert";
import { toast } from "react-hot-toast";
import {
  Shield,
  Info,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handlePasswordChange = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (securitySettings.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to change password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSecuritySettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error("Failed to change password");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(securitySettings.newPassword);
  const passwordStrengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"][passwordStrength] || "Very Weak";
  const passwordStrengthColor = ["text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"][passwordStrength] || "text-red-500";

  const handleForgotRequestReset = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");
    try {
      const data = await requestPasswordReset(forgotEmail);
      setForgotSuccess(data.message || "Reset code generated.");
      setForgotResetToken(data.resetToken || "");
      setForgotStep("reset");
    } catch (err) {
      setForgotError(err?.response?.data?.message || "Failed to request password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters");
      return;
    }
    if (!forgotResetToken.trim()) {
      setForgotError("Please enter the reset code");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await resetPassword(forgotResetToken.trim(), forgotNewPassword);
      setForgotSuccess("Password reset successfully! Logging you out...");
      setTimeout(async () => {
        await logout();
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setForgotError(err?.response?.data?.message || "Failed to reset password. The code may be invalid or expired.");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotPasswordModal(false);
    setForgotStep("request");
    setForgotError("");
    setForgotSuccess("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(user?.email ?? "");
                      setForgotStep("request");
                      setForgotResetToken("");
                      setForgotNewPassword("");
                      setForgotConfirmPassword("");
                      setForgotError("");
                      setForgotSuccess("");
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Forgot your current password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={securitySettings.currentPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={securitySettings.newPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {securitySettings.newPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>Password strength:</span>
                    <span className={passwordStrengthColor}>{passwordStrengthText}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {securitySettings.confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {securitySettings.newPassword === securitySettings.confirmPassword ? (
                      <div className="flex items-center text-green-600">
                        <Check className="h-4 w-4 mr-1" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <X className="h-4 w-4 mr-1" />
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading || !securitySettings.currentPassword || !securitySettings.newPassword || !securitySettings.confirmPassword}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Changing...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Information */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Application Version</Label>
                  <p className="text-sm text-muted-foreground">v1.0.0</p>
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <p className="text-sm text-muted-foreground">March 9, 2026</p>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <p className="text-sm text-muted-foreground">Production</p>
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Browser Information</Label>
                <p className="text-sm text-muted-foreground">
                  {navigator.userAgent}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Screen Resolution</Label>
                <p className="text-sm text-muted-foreground">
                  {window.screen.width} × {window.screen.height}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPasswordModal} onOpenChange={(open) => !open && closeForgotModal()}>
        <DialogContent className="sm:max-w-md" showCloseButton={!forgotLoading}>
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              {forgotStep === "request"
                ? "Enter your email to get a reset code"
                : "Enter the reset code and your new password"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {forgotError && <Alert variant="destructive">{forgotError}</Alert>}
            {forgotSuccess && <Alert className="bg-green-50 text-green-800 border-green-200">{forgotSuccess}</Alert>}

            {forgotStep === "request" ? (
              <form onSubmit={handleForgotRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@cpdo.gov.ph"
                    required
                  />
                </div>
                <Button type="submit" disabled={forgotLoading} className="w-full">
                  {forgotLoading ? "Sending..." : "Get reset code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-token">Reset code</Label>
                  <Input
                    id="forgot-token"
                    type="text"
                    value={forgotResetToken}
                    onChange={(e) => setForgotResetToken(e.target.value)}
                    placeholder="XXXXXX-XXXXXX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-new-pwd">New password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-new-pwd"
                      type={forgotShowPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setForgotShowPassword(!forgotShowPassword)}
                    >
                      {forgotShowPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-confirm-pwd">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-confirm-pwd"
                      type={forgotShowConfirm ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setForgotShowConfirm(!forgotShowConfirm)}
                    >
                      {forgotShowConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setForgotStep("request")} disabled={forgotLoading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={forgotLoading} className="flex-1">
                    {forgotLoading ? "Resetting..." : "Reset password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}