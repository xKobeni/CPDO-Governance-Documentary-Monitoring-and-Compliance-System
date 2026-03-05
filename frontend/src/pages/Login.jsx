import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/apiErrorHandler';
import toast from 'react-hot-toast';

export default function Login({ onLogin, onForgotPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [attemptWarningMessage, setAttemptWarningMessage] = useState('');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  
  const { login, isLoading, loginError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptWarningMessage('');
    setIsAccountLocked(false);

    // Validate form
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email, formData.password);
      // Login successful - notify parent
      if (onLogin) {
        onLogin();
      }
    } catch (error) {
      // Error is already in loginError from store
      if (loginError?.isLocked) {
        setIsAccountLocked(true);
        toast.error(loginError.message);
      } else if (loginError?.attemptsRemaining !== null) {
        const warning = loginError.attemptsRemaining === 1
          ? '⚠️ Last attempt before account lockout! Use correct credentials.'
          : `⚠️ ${loginError.attemptsRemaining} attempt${loginError.attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout`;
        setAttemptWarningMessage(warning);
        toast.error(loginError.message);
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setAttemptWarningMessage('');
    setIsAccountLocked(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          
          {/* Logo */}
          <div className="mb-8">
            <svg 
              className="w-12 h-12 text-violet-600" 
              viewBox="0 0 48 48" 
              fill="currentColor"
            >
              <path d="M24 4L28 14L24 18L20 14L24 4Z" />
              <path d="M14 14L24 18L20 22L10 18L14 14Z" />
              <path d="M34 14L38 18L28 22L24 18L34 14Z" />
              <rect x="20" y="18" width="8" height="4" />
            </svg>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Welcome back !
            </h1>
            <p className="text-gray-500 text-sm">
              Enter to get unlimited access to data & information.
            </p>
          </div>

          {/* Error Alert */}
          {/* Account Locked Notice */}
          {isAccountLocked && (
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.5 3h11a2 2 0 012 2v14a2 2 0 01-2 2h-11a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 text-sm">Account Temporarily Locked</p>
                  <p className="text-orange-800 text-sm mt-1">Too many failed attempts. Please try again in 15 minutes or contact support.</p>
                </div>
              </div>
            </div>
          )}

          {/* Failed Attempts Warning */}
          {attemptWarningMessage && !isAccountLocked && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-6">
              <p className="text-yellow-800 text-sm font-medium">{attemptWarningMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Input */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-gray-700 text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your mail address"
                className="input input-bordered w-full bg-gray-50 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password Input */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-gray-700 text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="input input-bordered w-full bg-gray-50 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 pr-10 text-sm"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="checkbox checkbox-sm checkbox-primary border-gray-300"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              
              <a
                onClick={(e) => {
                  e.preventDefault();
                  if (onForgotPassword) onForgotPassword();
                }}
                href="#forgot-password"
                className="text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer"
              >
                Forgot your password ?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`btn w-full border-none text-white font-medium text-base normal-case h-12 mt-2 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          {/* Contact Support */}
          <p className="text-center text-sm text-gray-600 mt-8">
            Need help accessing your account?{' '}
            <a href="#contact" className="text-violet-600 hover:text-violet-700 font-semibold hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-violet-600 via-purple-600 to-indigo-900 relative overflow-hidden">
        {/* Geometric Shapes */}
        <div className="absolute inset-0 opacity-90">
          
          {/* Large Purple Circle Top Left */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-500 rounded-full opacity-30"></div>
          
          {/* Tulip-like shape top */}
          <div className="absolute top-8 left-1/4 w-48 h-48">
            <div className="w-full h-full bg-purple-700 opacity-40 rounded-b-full"></div>
          </div>

          {/* Building/Lines decoration top */}
          <div className="absolute top-16 right-32 space-y-1">
            <div className="flex gap-2 justify-center mb-2">
              <div className="w-4 h-4 bg-orange-400 transform rotate-45"></div>
              <div className="w-4 h-4 bg-yellow-400 transform rotate-45"></div>
            </div>
            <div className="h-1 w-32 bg-cyan-400"></div>
            <div className="flex gap-0.5">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="w-1.5 h-8 bg-cyan-300"></div>
              ))}
            </div>
          </div>

          {/* Triangles stack */}
          <div className="absolute top-1/3 left-20 space-y-2">
            <div className="w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-indigo-400 opacity-60"></div>
            <div className="w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-indigo-400 opacity-60 ml-4"></div>
          </div>

          {/* Star/Diamond shape */}
          <div className="absolute top-1/3 left-1/2 w-12 h-12 bg-purple-300 transform rotate-45 opacity-50"></div>

          {/* Vertical bars */}
          <div className="absolute top-1/3 right-20 flex gap-1">
            <div className="w-2 h-16 bg-indigo-400"></div>
            <div className="w-2 h-16 bg-indigo-400 mt-4"></div>
          </div>

          {/* Cyan Rectangle with Sun */}
          <div className="absolute top-1/2 left-16 transform -translate-y-1/2">
            <div className="w-28 h-40 bg-cyan-400 relative">
              <div className="absolute -right-8 top-8 w-16 h-16 bg-yellow-400 clip-path-star">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon points="50,15 61,45 92,45 67,62 78,92 50,75 22,92 33,62 8,45 39,45" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Decorative lines */}
          <div className="absolute top-1/2 left-4 space-y-3">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="h-px w-24 bg-indigo-300 opacity-40"></div>
            ))}
          </div>

          {/* Dots pattern */}
          <div className="absolute top-1/2 right-1/3 grid grid-cols-4 gap-2">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-purple-300 rounded-full opacity-50"></div>
            ))}
          </div>

          {/* Fan/Rays decoration */}
          <div className="absolute bottom-1/3 right-24">
            <div className="relative w-20 h-20">
              {Array.from({length: 8}).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-10 bg-purple-300 origin-bottom"
                  style={{
                    left: '50%',
                    bottom: 0,
                    transform: `rotate(${i * 22.5}deg) translateX(-50%)`
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Large Dark Circle Bottom Right */}
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-950 rounded-full transform translate-x-32 translate-y-32"></div>
          
          {/* Large Purple Circle overlapping */}
          <div className="absolute bottom-12 right-24 w-72 h-72 bg-purple-700 rounded-full opacity-60"></div>

          {/* Cyan accent bottom right */}
          <div className="absolute bottom-0 right-0 w-48 h-64 bg-cyan-400 opacity-80"></div>

          {/* Dots grid bottom right */}
          <div className="absolute bottom-16 right-8 grid grid-cols-5 gap-1.5">
            {Array.from({length: 15}).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
            ))}
          </div>

          {/* Wavy lines bottom */}
          <div className="absolute bottom-32 left-1/3 space-y-2">
            {Array.from({length: 3}).map((_, i) => (
              <svg key={i} width="100" height="10" className="opacity-50">
                <path d="M0,5 Q25,0 50,5 T100,5" stroke="#a5b4fc" fill="none" strokeWidth="2"/>
              </svg>
            ))}
          </div>

          {/* Circles decoration bottom center */}
          <div className="absolute bottom-1/4 left-1/2 flex gap-3">
            <div className="w-4 h-4 border-2 border-indigo-300 rounded-full opacity-60"></div>
            <div className="w-6 h-6 border-2 border-indigo-300 rounded-full opacity-60"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full opacity-60"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
