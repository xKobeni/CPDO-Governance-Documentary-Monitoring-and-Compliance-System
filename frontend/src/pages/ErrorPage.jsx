export default function ErrorPage({ 
  errorCode = '404',
  title = 'Page Not Found',
  message = 'Sorry, we couldn\'t find the page you\'re looking for.',
  showRetry = false,
  onRetry 
}) {

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-violet-50 to-purple-50 p-4">
      <div className="max-w-2xl w-full text-center">
        
        {/* Error Illustration */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Large Error Code */}
            <div className="text-[150px] font-bold text-violet-200 leading-none select-none">
              {errorCode}
            </div>
            
            {/* Sad Face Icon Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg 
                className="w-24 h-24 text-violet-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          {title}
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          
          {showRetry && (
            <button
              onClick={handleRetry}
              className="btn bg-violet-600 hover:bg-violet-700 text-white border-none px-6 normal-case"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              Try Again
            </button>
          )}

          <button
            onClick={handleGoBack}
            className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 px-6 normal-case"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Go Back
          </button>

          <button
            onClick={handleGoHome}
            className="btn btn-ghost text-violet-600 hover:bg-violet-100 px-6 normal-case"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
            Home
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-violet-200">
          <p className="text-gray-600 text-sm mb-2">
            Need assistance?
          </p>
          <a 
            href="#contact" 
            className="text-violet-600 hover:text-violet-700 font-semibold text-sm hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

// Preset error configurations
export function Error404() {
  return (
    <ErrorPage
      errorCode="404"
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      showRetry={false}
    />
  );
}

export function Error500() {
  return (
    <ErrorPage
      errorCode="500"
      title="Server Error"
      message="Something went wrong on our end. Please try again later or contact support if the problem persists."
      showRetry={true}
    />
  );
}

export function Error403() {
  return (
    <ErrorPage
      errorCode="403"
      title="Access Denied"
      message="You don't have permission to access this resource. Please contact your administrator."
      showRetry={false}
    />
  );
}

export function ErrorNetwork() {
  return (
    <ErrorPage
      errorCode="!"
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      showRetry={true}
    />
  );
}
