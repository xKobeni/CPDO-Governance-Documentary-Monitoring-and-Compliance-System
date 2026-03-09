import { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../api/auth";
import { LoginForm } from "../components/login-form";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <LoginForm 
        onSubmit={handleSubmit}
        error={error}
        isLoading={isLoading}
        className="w-full max-w-4xl"
      />
    </div>
  );
}