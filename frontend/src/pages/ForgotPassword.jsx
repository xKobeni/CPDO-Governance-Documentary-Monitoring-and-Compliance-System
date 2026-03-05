import { useState } from 'react';

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Password reset email sent to:', email);
      setSubmitted(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleBackToLogin = () => {
    // Call the onBackToLogin callback
    if (onBackToLogin) {
      onBackToLogin();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
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

          {!submitted ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  Forgot Password?
                </h1>
                <p className="text-gray-500 text-sm">
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Email Input */}
                <div className="form-control">
                  <label className="label pb-1">
                    <span className="label-text text-gray-700 text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="input input-bordered w-full bg-gray-50 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                    required
                  />
                  <label className="label pt-2">
                    <span className="label-text-alt text-gray-500 text-xs">
                      We'll send a password reset link to this email
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed border-none text-white font-medium text-base normal-case h-12 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Remember your password?
                </p>
                <button
                  onClick={handleBackToLogin}
                  className="text-violet-600 hover:text-violet-700 font-medium text-sm hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="mb-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-3">
                  Check Your Email
                </h1>
                <p className="text-gray-600 text-sm mb-1">
                  We've sent a password reset link to:
                </p>
                <p className="text-gray-800 font-medium mb-6">
                  {email}
                </p>
                <p className="text-gray-500 text-sm">
                  Click the link in the email to reset your password. The link will expire in 24 hours.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="btn w-full bg-violet-600 hover:bg-violet-700 border-none text-white font-medium text-base normal-case h-12"
                >
                  Back to Login
                </button>
                
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 w-full font-medium text-base normal-case h-12"
                >
                  Try Another Email
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the email?
                </p>
                <p className="text-xs text-gray-500">
                  Check your spam folder or{' '}
                  <a href="#contact" className="text-violet-600 hover:text-violet-700 font-medium hover:underline">
                    contact support
                  </a>
                </p>
              </div>
            </>
          )}
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
            <div className="w-0 h-0 border-l-30 border-l-transparent border-r-30 border-r-transparent border-b-50 border-b-indigo-400 opacity-60"></div>
            <div className="w-0 h-0 border-l-30 border-l-transparent border-r-30 border-r-transparent border-b-50 border-b-indigo-400 opacity-60 ml-4"></div>
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
