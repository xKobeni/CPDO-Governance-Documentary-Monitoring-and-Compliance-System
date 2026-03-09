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
import { useState } from "react"

export function LoginForm({
  className,
  onSubmit,
  error,
  isLoading,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-12 md:p-16" onSubmit={onSubmit}>
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
                  id="email" 
                  name="email"
                  type="email" 
                  placeholder="admin@cpdo.gov.ph" 
                  required 
                />
              </Field>
              
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a href="#" className="ml-auto text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                    Forgot password?
                  </a>
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
                    onCheckedChange={setRememberMe}
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
          
          <div className="relative hidden bg-muted md:flex md:items-center md:justify-center md:flex-col md:p-16">
            <div className="text-center space-y-8">
              <div className="mx-auto w-20 h-20 bg-gray-300 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">CPDO SDLG Monitoring System</h2>
              </div>
            </div>
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
