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
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState, useEffect, useRef } from "react"

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
        By clicking continue, you agree to our <a href="#" className="underline hover:no-underline cursor-pointer">Terms of Service</a>{" "}
        and <a href="#" className="underline hover:no-underline cursor-pointer">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
