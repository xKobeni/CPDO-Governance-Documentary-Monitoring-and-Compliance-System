import { useState, useEffect } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Account Settings State
  const [accountForm, setAccountForm] = useState({
    fullName: 'John Doe',
    email: 'john.doe@cpdo.gov',
    role: 'STAFF', // Role code from roles table (ADMIN, STAFF, OFFICE)
    office: 'Planning Division'
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    loginAlerts: true,
    sessionTimeout: '30',
    passwordExpiry: '90'
  });

  // Theme Settings State
  const [themeSettings, setThemeSettings] = useState({
    theme: localStorage.getItem('cpdo-theme') || 'light'
  });

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('cpdo-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleThemeChange = (e) => {
    const { name, value } = e.target;
    setThemeSettings(prev => ({
      ...prev,
      [name]: value
    }));
    // Apply theme to document and save to localStorage
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('cpdo-theme', value);
  };

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      console.log('Settings saved successfully');
    }, 1000);
  };

  const tabs = [
    {
      id: 'account',
      label: 'Account',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      description: 'Personal information'
    },
    {
      id: 'security',
      label: 'Security',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      description: 'Password and security'
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      description: 'Theme and colors'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-6 border-b border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account, security, and preferences</p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="alert alert-success bg-green-50 border border-green-200 shadow-lg rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-green-800 font-medium">Settings saved successfully!</span>
        </div>
      )}

      {/* Settings Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="space-y-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-violet-50 border-2 border-violet-600 shadow-md'
                    : 'bg-white border-2 border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                }`}
              >
                <div className={`shrink-0 p-3 rounded-lg ${
                  activeTab === tab.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.icon}
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${activeTab === tab.id ? 'text-violet-600' : 'text-gray-800'}`}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{tab.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Personal Information Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-violet-100">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="card-title text-gray-800">Personal Information</h2>
                      <p className="text-sm text-gray-600">Update your account details</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {/* Full Name - Editable */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Full Name</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={accountForm.fullName}
                        onChange={handleAccountChange}
                        className="input input-bordered w-full bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 rounded-lg"
                      />
                    </div>

                    {/* Email - Read Only */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Email Address</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={accountForm.email}
                        disabled
                        className="input input-bordered w-full bg-gray-100 text-gray-600 cursor-not-allowed rounded-lg"
                      />
                      <label className="label pt-2">
                        <span className="label-text-alt text-gray-500">This is your login email address</span>
                      </label>
                    </div>

                    {/* Role - Read Only */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Role</span>
                      </label>
                      <input
                        type="text"
                        name="role"
                        value={accountForm.role}
                        disabled
                        className="input input-bordered w-full bg-gray-100 text-gray-600 cursor-not-allowed rounded-lg"
                      />
                      <label className="label pt-2">
                        <span className="label-text-alt text-gray-500">Assigned by system administrator</span>
                      </label>
                    </div>

                    {/* Office - Read Only */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Office</span>
                      </label>
                      <input
                        type="text"
                        name="office"
                        value={accountForm.office}
                        disabled
                        className="input input-bordered w-full bg-gray-100 text-gray-600 cursor-not-allowed rounded-lg"
                      />
                      <label className="label pt-2">
                        <span className="label-text-alt text-gray-500">Your assigned department</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-amber-100">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Change Password</h3>
                      <p className="text-sm text-gray-600">Update your password regularly</p>
                    </div>
                  </div>
                  <button className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 rounded-lg w-full sm:w-auto">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Update Password
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6">
                <button className="btn btn-ghost rounded-lg">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white border-none rounded-lg disabled:bg-violet-400"
                >
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Security Features Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-red-100">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="card-title text-gray-800">Security Features</h2>
                      <p className="text-sm text-gray-600">Protect your account with additional security</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Two-Factor Authentication */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-linear-to-r from-violet-50 to-purple-50 border-2 border-violet-100 hover:border-violet-300 transition-colors">
                      <div>
                        <h3 className="font-semibold text-gray-800">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600 mt-1">Add an extra layer of security</p>
                      </div>
                      <div className="form-control">
                        <label className="label cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            name="twoFactorAuth"
                            checked={securitySettings.twoFactorAuth}
                            onChange={handleSecurityChange}
                            className="checkbox checkbox-primary"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Login Alerts */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-linear-to-r from-blue-50 to-cyan-50 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                      <div>
                        <h3 className="font-semibold text-gray-800">Login Alerts</h3>
                        <p className="text-sm text-gray-600 mt-1">Get notified of unusual activity</p>
                      </div>
                      <div className="form-control">
                        <label className="label cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            name="loginAlerts"
                            checked={securitySettings.loginAlerts}
                            onChange={handleSecurityChange}
                            className="checkbox checkbox-primary"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-orange-100">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Security Configuration</h3>
                      <p className="text-sm text-gray-600">Adjust timeout and expiration settings</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Session Timeout */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Session Timeout</span>
                        <span className="label-text-alt text-violet-600 font-medium">{securitySettings.sessionTimeout} min</span>
                      </label>
                      <select
                        name="sessionTimeout"
                        value={securitySettings.sessionTimeout}
                        onChange={handleSecurityChange}
                        className="select select-bordered w-full bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 rounded-lg"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </select>
                      <label className="label pt-2">
                        <span className="label-text-alt text-gray-500">You'll be logged out after inactivity</span>
                      </label>
                    </div>

                    {/* Password Expiry */}
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-gray-800">Password Expiry</span>
                        <span className="label-text-alt text-violet-600 font-medium">{securitySettings.passwordExpiry} days</span>
                      </label>
                      <select
                        name="passwordExpiry"
                        value={securitySettings.passwordExpiry}
                        onChange={handleSecurityChange}
                        className="select select-bordered w-full bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 rounded-lg"
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                      </select>
                      <label className="label pt-2">
                        <span className="label-text-alt text-gray-500">You'll be prompted to change password</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Sessions Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-green-100">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Active Sessions</h3>
                      <p className="text-sm text-gray-600">Devices currently logged in</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-violet-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-linear-to-br from-blue-100 to-purple-100">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 2a2 2 0 012-2h10a2 2 0 012 2v18a2 2 0 01-2 2H7a2 2 0 01-2-2V2zm4 2a1 1 0 000 2h2a1 1 0 100-2H9zm0 11a1 1 0 100 2h2a1 1 0 100-2H9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Windows Chrome</p>
                          <p className="text-sm text-gray-600">Last active now</p>
                        </div>
                      </div>
                      <span className="badge badge-success gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6">
                <button className="btn btn-ghost rounded-lg">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white border-none rounded-lg disabled:bg-violet-400"
                >
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Selection Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-violet-100">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="card-title text-gray-800">Theme Selection</h2>
                      <p className="text-sm text-gray-600">Choose your preferred color scheme</p>
                    </div>
                  </div>
                  
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-gray-800">Current Theme</span>
                      <span className="label-text-alt text-violet-600 font-medium capitalize">{themeSettings.theme}</span>
                    </label>
                    <select
                      name="theme"
                      value={themeSettings.theme}
                      onChange={handleThemeChange}
                      className="select select-bordered w-full bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 rounded-lg text-base"
                    >
                      <option value="light">☀️ Light</option>
                      <option value="dark">🌙 Dark</option>
                      <option value="cupcake">🧁 Cupcake</option>
                      <option value="bumblebee">🐝 Bumblebee</option>
                      <option value="emerald">💚 Emerald</option>
                      <option value="corporate">🏢 Corporate</option>
                      <option value="synthwave">🌆 Synthwave</option>
                      <option value="retro">📻 Retro</option>
                      <option value="cyberpunk">🤖 Cyberpunk</option>
                      <option value="valentine">💝 Valentine</option>
                      <option value="halloween">🎃 Halloween</option>
                      <option value="garden">🌸 Garden</option>
                      <option value="forest">🌲 Forest</option>
                      <option value="aqua">💧 Aqua</option>
                      <option value="lofi">🎵 Lo-Fi</option>
                      <option value="pastel">🎨 Pastel</option>
                      <option value="fantasy">🦄 Fantasy</option>
                      <option value="wireframe">📐 Wireframe</option>
                      <option value="black">⚫ Black</option>
                      <option value="luxury">💎 Luxury</option>
                      <option value="dracula">🧛 Dracula</option>
                      <option value="cmyk">🖨️ CMYK</option>
                      <option value="autumn">🍂 Autumn</option>
                      <option value="business">💼 Business</option>
                      <option value="acid">🧪 Acid</option>
                      <option value="lemonade">🍋 Lemonade</option>
                      <option value="night">🌃 Night</option>
                      <option value="coffee">☕ Coffee</option>
                      <option value="winter">❄️ Winter</option>
                      <option value="dim">🔅 Dim</option>
                      <option value="nord">🏔️ Nord</option>
                      <option value="sunset">🌅 Sunset</option>
                    </select>
                    <label className="label pt-2">
                      <span className="label-text-alt text-gray-500">DaisyUI theme will be applied across the entire application</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Theme Preview Card */}
              <div className="card bg-linear-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl">
                <div className="card-body">
                  <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="btn btn-primary">Primary</div>
                    <div className="btn btn-secondary">Secondary</div>
                    <div className="btn btn-accent">Accent</div>
                    <div className="btn btn-neutral">Neutral</div>
                    <div className="badge badge-primary badge-lg">Badge</div>
                    <div className="badge badge-secondary badge-lg">Badge</div>
                    <div className="badge badge-accent badge-lg">Badge</div>
                    <div className="badge badge-neutral badge-lg">Badge</div>
                  </div>
                </div>
              </div>

              {/* Theme Info Card */}
              <div className="card bg-white shadow-sm border border-gray-200 rounded-2xl">
                <div className="card-body">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">About Themes</h3>
                      <p className="text-sm text-gray-700">
                        DaisyUI offers 32 beautiful themes. Your selection will be saved and applied automatically when you return.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6">
                <button className="btn btn-ghost rounded-lg">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white border-none rounded-lg disabled:bg-violet-400"
                >
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
