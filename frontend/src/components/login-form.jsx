import { Link } from "react-router";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState, useEffect, useRef } from "react"

// ─── Terms of Service content ─────────────────────────────────────────────────
function TermsContent() {
  return (
    <div className="space-y-5 text-sm text-foreground leading-relaxed">
      <p className="text-muted-foreground">
        Effective Date: January 1, 2025 &nbsp;·&nbsp; City Planning and Development Office (CPDO)
      </p>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">1. Acceptance of Terms</h3>
        <p>
          By accessing and using the CPDO Seal of Good Local Governance (SDLG) Monitoring System
          ("the System"), you agree to be bound by these Terms of Service. If you do not agree,
          you must not use the System.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">2. Authorized Use</h3>
        <p>
          Access to the System is restricted to authorized personnel of the City Planning and
          Development Office and affiliated government offices. Your account credentials are
          strictly personal and non-transferable. You are responsible for all activities that
          occur under your account.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Do not share your password with anyone.</li>
          <li>Log out after each session, especially on shared devices.</li>
          <li>Immediately report any unauthorized access to your account.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">3. Purpose of the System</h3>
        <p>
          The System is designed exclusively for monitoring and tracking compliance submissions
          under the Seal of Good Local Governance program. Any use outside this official purpose
          is prohibited.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">4. Data Accuracy and Integrity</h3>
        <p>
          Users are responsible for ensuring that all information and documents submitted through
          the System are accurate, complete, and authentic. Submission of false or misleading
          data may constitute a violation of civil service rules and applicable laws.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">5. Intellectual Property</h3>
        <p>
          All content, layouts, and features of the System are the property of the City Planning
          and Development Office. Reproduction or redistribution without written permission is
          prohibited.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">6. System Availability</h3>
        <p>
          The CPDO reserves the right to perform maintenance, updates, or modifications to the
          System at any time. While we strive for high availability, we do not guarantee
          uninterrupted access.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">7. Prohibited Activities</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Attempting to gain unauthorized access to other accounts or system components.</li>
          <li>Uploading malicious files or code.</li>
          <li>Using the System for personal or commercial activities unrelated to SGLG.</li>
          <li>Interfering with the proper functioning of the System.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">8. Termination of Access</h3>
        <p>
          The CPDO may suspend or terminate your access at any time for violations of these
          Terms or for operational reasons, without prior notice.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">9. Governing Law</h3>
        <p>
          These Terms are governed by the laws of the Republic of the Philippines, including
          relevant civil service regulations and the Data Privacy Act of 2012 (R.A. 10173).
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">10. Contact</h3>
        <p>
          For questions or concerns about these Terms, please contact the CPDO System
          Administrator at <span className="font-medium">cpdo@lgu.gov.ph</span>.
        </p>
      </section>
    </div>
  );
}

// ─── Privacy Policy content ───────────────────────────────────────────────────
function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm text-foreground leading-relaxed">
      <p className="text-muted-foreground">
        Effective Date: January 1, 2025 &nbsp;·&nbsp; City Planning and Development Office (CPDO)
      </p>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">1. Overview</h3>
        <p>
          The City Planning and Development Office (CPDO) is committed to protecting the privacy
          and security of personal information in compliance with Republic Act No. 10173 — the
          Data Privacy Act of 2012 — and its Implementing Rules and Regulations.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">2. Information We Collect</h3>
        <p>When you use the SDLG Monitoring System, we may collect:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li><span className="text-foreground font-medium">Account data:</span> Name, email address, office assignment, and role.</li>
          <li><span className="text-foreground font-medium">Submission data:</span> Documents, checklists, and compliance records you upload.</li>
          <li><span className="text-foreground font-medium">Activity logs:</span> Login timestamps, actions performed, and IP address for audit purposes.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">3. Purpose of Data Collection</h3>
        <p>Your personal information is collected and processed solely for:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Authenticating and managing your System account.</li>
          <li>Facilitating SGLG compliance monitoring and reporting.</li>
          <li>Maintaining audit trails as required by government accountability standards.</li>
          <li>Sending system notifications related to submission deadlines and status updates.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">4. Legal Basis for Processing</h3>
        <p>
          Processing of personal data is performed pursuant to the official mandate of the CPDO
          under local governance regulations and the requirements of the SGLG program.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">5. Data Sharing</h3>
        <p>
          Personal data is not sold, rented, or shared with third parties. Data may be shared
          only with authorized oversight bodies (e.g., DILG) in the course of official
          government functions and only to the extent necessary.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">6. Data Retention</h3>
        <p>
          Records are retained in accordance with the applicable records retention schedule of
          the National Archives of the Philippines. Account data is retained for the duration
          of employment plus the prescribed archival period.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">7. Security Measures</h3>
        <p>
          We implement organizational, physical, and technical security measures including
          encrypted passwords, role-based access control, session timeouts, and audit logging
          to protect your personal information against unauthorized access, disclosure, or loss.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">8. Your Rights</h3>
        <p>Under the Data Privacy Act of 2012, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Be informed of how your data is processed.</li>
          <li>Access your personal data held by the CPDO.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>Object to processing under certain conditions.</li>
          <li>File a complaint with the National Privacy Commission.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">9. Cookies and Local Storage</h3>
        <p>
          The System may use browser local storage to remember your email address when
          "Remember Me" is enabled. No third-party tracking cookies are used.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-base">10. Contact the Data Protection Officer</h3>
        <p>
          For privacy-related concerns or to exercise your rights, please contact the CPDO
          Data Protection Officer at <span className="font-medium">dpo@lgu.gov.ph</span>.
        </p>
      </section>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
export function LoginForm({
  className,
  onSubmit,
  error,
  isLoading,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [openModal, setOpenModal] = useState(null); // "terms" | "privacy" | null
  const emailInputRef = useRef(null);

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const hasRememberedEmail = localStorage.getItem("rememberMe") === "true";
    
    if (savedEmail && hasRememberedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle remember me toggle
  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    
    if (checked) {
      // Save current email if remember me is checked
      const currentEmail = emailInputRef.current?.value || email;
      if (currentEmail) {
        localStorage.setItem("rememberedEmail", currentEmail);
        localStorage.setItem("rememberMe", "true");
      }
    } else {
      // Clear saved email if remember me is unchecked
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberMe");
    }
  };

  // Handle email change to update localStorage if remember me is checked
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", newEmail);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (rememberMe && email) {
      localStorage.setItem("rememberedEmail", email);
      localStorage.setItem("rememberMe", "true");
    }
    
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-12 md:p-16" onSubmit={handleSubmit}>
            <FieldGroup className="space-y-2">
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your CPDO SDLG Monitoring System account
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}
              
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input 
                  ref={emailInputRef}
                  id="email" 
                  name="email"
                  type="email" 
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="admin@cpdo.gov.ph" 
                  required 
                />
              </Field>
              
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link to="/forgot-password" className="ml-auto text-sm text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
              
              <Field>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={handleRememberMeChange}
                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <input 
                    type="hidden" 
                    name="remember-me" 
                    value={rememberMe ? "on" : ""} 
                  />
                  <Label htmlFor="remember-me" className="text-sm">
                    Remember me
                  </Label>
                </div>
              </Field>
              
              <Field>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  {isLoading ? "Signing in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          
          <div className="relative hidden md:flex md:items-center md:justify-center md:flex-col md:p-16 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/60 border-l border-slate-200/60">
            {/* Soft decorative circle behind logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[min(90%,420px)] aspect-square rounded-full bg-white/40 blur-2xl" />
            </div>
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #1e3a5f 1px, transparent 1px),
                                  linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
            <img
              src="/SGLG_LOGO.png"
              alt="Seal of Good Local Governance"
              className="relative z-10 max-w-full max-h-[280px] w-auto object-contain drop-shadow-md"
            />
          </div>
        </CardContent>
      </Card>
      
      <FieldDescription className="px-6 text-center text-sm text-muted-foreground">
        By clicking continue, you agree to our{" "}
        <button
          type="button"
          onClick={() => setOpenModal("terms")}
          className="underline hover:no-underline cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms of Service
        </button>{" "}
        and{" "}
        <button
          type="button"
          onClick={() => setOpenModal("privacy")}
          className="underline hover:no-underline cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy Policy
        </button>.
      </FieldDescription>

      {/* Terms of Service Modal */}
      <Dialog open={openModal === "terms"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[82vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Terms of Service</DialogTitle>
            <p className="text-xs text-muted-foreground">CPDO SDLG Monitoring System</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 text-xs/relaxed">
            <TermsContent />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0" showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={openModal === "privacy"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[82vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Privacy Policy</DialogTitle>
            <p className="text-xs text-muted-foreground">CPDO SDLG Monitoring System · R.A. 10173 compliant</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 text-xs/relaxed">
            <PrivacyContent />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0" showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
