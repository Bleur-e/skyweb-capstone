"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import supabase from "../supabaseClient"; 
import Swal from 'sweetalert2';

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [secretMode, setSecretMode] = useState(false);
  const [isPowerUserLoggedIn, setIsPowerUserLoggedIn] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
    contact_no: "",
    address: "",
    position: "Administrator"
  });
  const [formMessage, setFormMessage] = useState("");
  const [actionType, setActionType] = useState("create"); // "create" or "reset"
  const [isPowerFormFocused, setIsPowerFormFocused] = useState(false);
  const router = useRouter();

  // Enhanced currentUser storage helper using sessionStorage
  const storeCurrentUser = (userData) => {
    const safeUser = {
      id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      role: userData.role,
      account_photo: userData.account_photo || null,
      isPowerUser: userData.isPowerUser || false,
      loginTime: new Date().toISOString(), // timestamp for validation
    };
    sessionStorage.setItem("currentUser", JSON.stringify(safeUser));
    return safeUser;
  };

  // Enhanced get current user helper using sessionStorage
  const getCurrentUser = () => {
    try {
      const storedUser = sessionStorage.getItem("currentUser");
      if (!storedUser) return null;

      const user = JSON.parse(storedUser);
      if (!user.id || !user.role) {
        console.warn("Invalid user data in sessionStorage");
        sessionStorage.removeItem("currentUser");
        return null;
      }
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      sessionStorage.removeItem("currentUser");
      return null;
    }
  };

  // Function to log audit events
  const logAuditEvent = async (userData, action, description = null) => {
    try {
      const auditData = {
        user_id: userData.id,
        role: userData.role,
        action: action,
        table_name: 'logins',
        description: description,
        username: userData.username,
        record_id: userData.id
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditData]);

      if (error) {
        console.error('Error logging audit event:', error);
      } else {
        console.log('Audit event logged successfully:', action);
      }
    } catch (error) {
      console.error('Error in logAuditEvent:', error);
    }
  };

  // Function to log failed login attempts
  const logFailedLogin = async (username, reason = "Invalid credentials") => {
    try {
      const auditData = {
        user_id: null,
        role: null,
        action: 'Login',
        table_name: 'users',
        description: `Failed login attempt for username: ${username}. Reason: ${reason}`,
        username: username,
        record_id: null
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditData]);

      if (error) {
        console.error('Error logging failed login:', error);
      }
    } catch (error) {
      console.error('Error in logFailedLogin:', error);
    }
  };

  // Show success SweetAlert
  const showSuccessAlert = (title, message, isPowerUser = false) => {
    Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      timer: isPowerUser ? 4000 : 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      background: isPowerUser ? '#f0e6ff' : '#f0f9ff',
      color: '#1f2937',
      iconColor: isPowerUser ? '#9333ea' : '#059669'
    });
  };

  // Show error SweetAlert
  const showErrorAlert = (title, message) => {
    Swal.fire({
      title: title,
      text: message,
      icon: 'error',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      background: '#fef2f2',
      color: '#dc2626',
      iconColor: '#dc2626'
    });
  };

  // Show loading SweetAlert
  const showLoadingAlert = (title) => {
    Swal.fire({
      title: title,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  // Close any active SweetAlert
  const closeAlert = () => {
    Swal.close();
  };

  // Check if user is already logged in on component mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      if (currentUser.isPowerUser) {
        setIsPowerUserLoggedIn(true);
      } else {
        // Redirect based on role if already logged in
        redirectUser(currentUser.role);
      }
    }
  }, []);

  // Handle keyboard shortcut for secret mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key === 'f') {
        setSecretMode(true);
        // Show SweetAlert for secret mode activation
        Swal.fire({
          title: 'Power Mode Activated!',
          text: 'Secret power user mode is now active for 5 seconds',
          icon: 'info',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          background: '#f0e6ff',
          color: '#9333ea',
          iconColor: '#9333ea'
        });
        // Secret mode stays active for 5 seconds
        setTimeout(() => {
          setSecretMode(false);
        }, 5000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Redirect user based on role
  const redirectUser = (role) => {
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "user") {
      router.push("/user/dashboard");
    } else {
      console.error("Unknown role:", role);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Check if secret mode is active
    if (secretMode) {
      // Secret power user login - bypass database check
      console.log("Secret power user login activated!");
      
      // Create a mock power user object
      const powerUser = {
        id: "power-user-001",
        username: "system_power_user",
        full_name: "System Power User",
        role: "power_user",
        account_photo: null,
        isPowerUser: true
      };

      // Save the power user using our enhanced helper
      storeCurrentUser(powerUser);
      setIsPowerUserLoggedIn(true);
      
      // Log power user login to audit logs
      await logAuditEvent(powerUser, 'Login', 'Power user login via secret mode');
      
      // Show SweetAlert success for power user
      showSuccessAlert(
        '⚡ Power Access Granted!', 
        'System Power User mode activated successfully!',
        true
      );
      
      return;
    }

    // Normal login flow
    try {
      // Show loading alert
      showLoadingAlert('Authenticating...');

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      // Close loading alert
      closeAlert();

      if (error || !data) {
        setIsLoading(false);
        
        // Log failed login attempt
        await logFailedLogin(username, "Invalid username or password");
        
        // Show SweetAlert error
        showErrorAlert('Login Failed', 'Wrong username or password!');
        return;
      }

      // Save the logged-in user using our enhanced helper
      const safeUser = storeCurrentUser(data);

      // Log successful login to audit logs
      await logAuditEvent(data, 'Login', 'User logged in successfully');

      // Show SweetAlert success
      showSuccessAlert(
        'Login Successful!', 
        `Welcome back, ${data.full_name || data.username}! Redirecting...`
      );
      
      // Redirect after showing success message
      setTimeout(() => {
        redirectUser(data.role);
      }, 2000);

    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      
      // Close any open alerts
      closeAlert();
      
      // Log failed login attempt due to error
      await logFailedLogin(username, `System error: ${error.message}`);
      
      // Show SweetAlert error
      showErrorAlert('Login Error', 'An error occurred during login. Please try again.');
    }
  };

  const handleAdminCreate = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!adminFormData.username || adminFormData.username.length < 3) {
      setFormMessage("Username must be at least 3 characters");
      return;
    }

    if (adminFormData.password !== adminFormData.confirmPassword) {
      setFormMessage("Passwords do not match");
      return;
    }

    if (adminFormData.password.length < 6) {
      setFormMessage("Password must be at least 6 characters");
      return;
    }

    try {
      setFormMessage("Creating admin account...");
      
      // Show loading alert
      showLoadingAlert('Creating Admin Account...');

      // Prepare admin data
      const adminData = {
        username: adminFormData.username,
        password: adminFormData.password,
        role: "admin",
        full_name: adminFormData.full_name || null,
        email: adminFormData.email || null,
        contact_no: adminFormData.contact_no || null,
        address: adminFormData.address || null,
        position: adminFormData.position || "Administrator",
        created_at: new Date().toISOString()
      };

      // Create admin account in database
      const { data, error } = await supabase
        .from("users")
        .insert([adminData])
        .select();

      // Close loading alert
      closeAlert();

      if (error) {
        if (error.code === '23505') { // Unique violation
          setFormMessage("❌ Username already exists");
          showErrorAlert('Creation Failed', 'Username already exists!');
        } else {
          throw error;
        }
        return;
      }

      if (data && data.length > 0) {
        setFormMessage(`✅ Success! Admin account "${adminFormData.username}" has been created.`);
        
        // Log admin account creation to audit logs
        const currentUser = getCurrentUser();
        if (currentUser) {
          await logAuditEvent(
            currentUser, 
            'Add', 
            `Created admin account: ${adminFormData.username}`
          );
        }
        
        // Show success SweetAlert
        showSuccessAlert(
          'Admin Created!', 
          `Admin account "${adminFormData.username}" has been created successfully!`
        );
        
        // Clear the form
        setAdminFormData({
          username: "",
          password: "",
          confirmPassword: "",
          full_name: "",
          email: "",
          contact_no: "",
          address: "",
          position: "Administrator"
        });

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setFormMessage("");
        }, 5000);
      }
    } catch (error) {
      console.error('Error creating admin account:', error);
      setFormMessage("❌ Error creating admin account");
      showErrorAlert('Creation Failed', 'Error creating admin account');
    }
  };

  const handleAdminReset = async (e) => {
    e.preventDefault();
    
    if (!adminFormData.username) {
      setFormMessage("Please enter the admin username");
      return;
    }

    if (adminFormData.password !== adminFormData.confirmPassword) {
      setFormMessage("Passwords do not match");
      return;
    }

    if (adminFormData.password.length < 6) {
      setFormMessage("Password must be at least 6 characters");
      return;
    }

    try {
      setFormMessage("Resetting admin password...");
      
      // Show loading alert
      showLoadingAlert('Resetting Password...');

      // Update the admin password in the database
      const { data, error } = await supabase
        .from("users")
        .update({ 
          password: adminFormData.password 
        })
        .eq("username", adminFormData.username)
        .eq("role", "admin")
        .select();

      // Close loading alert
      closeAlert();

      if (error) throw error;

      if (data && data.length > 0) {
        setFormMessage(`✅ Success! Password for admin "${adminFormData.username}" has been reset.`);
        
        // Log password reset to audit logs
        const currentUser = getCurrentUser();
        if (currentUser) {
          await logAuditEvent(
            currentUser, 
            'Edit', 
            `Reset password for admin account: ${adminFormData.username}`
          );
        }
        
        // Show success SweetAlert
        showSuccessAlert(
          'Password Reset!', 
          `Password for admin "${adminFormData.username}" has been reset successfully!`
        );
        
        // Clear the form
        setAdminFormData({
          username: "",
          password: "",
          confirmPassword: "",
          full_name: "",
          email: "",
          contact_no: "",
          address: "",
          position: "Administrator"
        });

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setFormMessage("");
        }, 5000);
      } else {
        setFormMessage("❌ No admin user found with that username");
        showErrorAlert('Reset Failed', 'No admin user found with that username!');
      }
    } catch (error) {
      console.error('Error resetting admin password:', error);
      setFormMessage("❌ Error resetting admin password");
      showErrorAlert('Reset Failed', 'Error resetting admin password');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdminFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormFocus = () => {
    setIsFormFocused(true);
  };

  const handleFormBlur = () => {
    setIsFormFocused(false);
  };

  const handlePowerFormFocus = () => {
    setIsPowerFormFocused(true);
  };

  const handlePowerFormBlur = () => {
    setIsPowerFormFocused(false);
  };

  const logoutPowerUser = async () => {
    // Show confirmation dialog before logout
    const result = await Swal.fire({
      title: 'Exit Power Mode?',
      text: 'Are you sure you want to exit System Power Access?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#9333ea',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Exit',
      cancelButtonText: 'Cancel',
      background: '#f8fafc',
      color: '#1f2937'
    });

    if (result.isConfirmed) {
      // Log power user logout to audit logs
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.isPowerUser) {
        await logAuditEvent(currentUser, 'Logout', 'Power user logged out');
      }
      
      // Show logout success message
      showSuccessAlert('Logged Out', 'Successfully exited Power Mode!');
      
      // Clear all states completely
      sessionStorage.removeItem("currentUser");
      setIsPowerUserLoggedIn(false);
      setSecretMode(false);
      setFormMessage("");
      setActionType("create");
      setShowSuccessPopup(false);
      setShowErrorPopup(false);
      setUsername("");
      setPassword("");
      setIsLoading(false);
      
      // Clear the admin form data
      setAdminFormData({
        username: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        email: "",
        contact_no: "",
        address: "",
        position: "Administrator"
      });
    }
  };

  const clearForm = () => {
    setAdminFormData({
      username: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      email: "",
      contact_no: "",
      address: "",
      position: "Administrator"
    });
    setFormMessage("");
  };

  // Power User Admin Management Interface
  if (isPowerUserLoggedIn) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center relative transition-all duration-500 p-4"
        style={{
          backgroundImage: "url('/dwew.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dimmed Blurry Overlay - Added dark background with opacity */}
        <div 
          className={`absolute inset-0 backdrop-blur-md transition-all duration-500 ${
            isPowerFormFocused ? "opacity-100 bg-black/40" : "opacity-0 bg-black/0"
          }`}
        />
        
        <div 
          className="relative z-10 transition-all duration-500 w-full max-w-4xl"
          onMouseEnter={handlePowerFormFocus}
          onMouseLeave={handlePowerFormBlur}
          onFocus={handlePowerFormFocus}
          onBlur={handlePowerFormBlur}
        >
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-purple-900 shadow-lg rounded-t-2xl p-6 text-center">
              <h1 className="text-2xl font-bold text-white mb-2">⚡ System Power Access</h1>
              <p className="text-purple-200 font-medium">Admin Account Management</p>
            </div>

            {/* Action Toggle */}
            <div className="bg-white p-4 border-b">
              <div className="flex space-x-4">
                <button
                  onClick={() => { setActionType("create"); clearForm(); }}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold text-lg transition-colors ${
                    actionType === "create" 
                      ? "bg-purple-600 text-white shadow-md" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Create Admin
                </button>
                <button
                  onClick={() => { setActionType("reset"); clearForm(); }}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold text-lg transition-colors ${
                    actionType === "reset" 
                      ? "bg-purple-600 text-white shadow-md" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <i className="fas fa-key mr-2"></i>
                  Reset Password
                </button>
              </div>
            </div>

            {/* Admin Form */}
            <div className="bg-white p-8 rounded-b-2xl shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className={`fas ${
                    actionType === "create" ? "fa-user-shield" : "fa-key"
                  } text-purple-600 text-2xl`}></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {actionType === "create" ? "Create New Admin Account" : "Reset Admin Password"}
                </h2>
              </div>

              {formMessage && (
                <div className={`p-4 rounded-lg mb-6 text-center font-bold ${
                  formMessage.includes("✅") 
                    ? "bg-green-50 text-green-800 border border-green-200" 
                    : formMessage.includes("❌")
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}>
                  {formMessage}
                </div>
              )}

              <form onSubmit={actionType === "create" ? handleAdminCreate : handleAdminReset} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-lg font-bold text-gray-900 mb-3">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={adminFormData.username}
                      onChange={handleInputChange}
                      placeholder="Enter admin username"
                      className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                      required
                      autoFocus
                    />
                  </div>

                  {actionType === "create" && (
                    <>
                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-3">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={adminFormData.full_name}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                          className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                        />
                      </div>

                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-3">
                          Position
                        </label>
                        <input
                          type="text"
                          name="position"
                          value={adminFormData.position}
                          onChange={handleInputChange}
                          placeholder="Enter position"
                          className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                        />
                      </div>

                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-3">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={adminFormData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email"
                          className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                        />
                      </div>

                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-3">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          name="contact_no"
                          value={adminFormData.contact_no}
                          onChange={handleInputChange}
                          placeholder="Enter contact number"
                          className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-lg font-bold text-gray-900 mb-3">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={adminFormData.address}
                          onChange={handleInputChange}
                          placeholder="Enter address"
                          className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">
                      {actionType === "create" ? "Password *" : "New Password *"}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={adminFormData.password}
                      onChange={handleInputChange}
                      placeholder={actionType === "create" ? "Enter password" : "Enter new password"}
                      className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                      required
                      minLength="6"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">
                      {actionType === "create" ? "Confirm Password *" : "Confirm New Password *"}
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={adminFormData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder={actionType === "create" ? "Confirm password" : "Confirm new password"}
                      className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-gray-900 bg-white transition-all duration-300"
                      required
                      minLength="6"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={logoutPowerUser}
                    className="flex-1 bg-gray-500 text-white py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-bold text-lg shadow-md transform hover:scale-105"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Exit Power Mode
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white py-4 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-bold text-lg shadow-md transform hover:scale-105"
                  >
                    <i className={`fas ${actionType === "create" ? "fa-user-plus" : "fa-key"} mr-2`}></i>
                    {actionType === "create" ? "Create Admin" : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal Login Interface
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative transition-all duration-500"
      style={{
        backgroundImage: "url('/dwew.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dimmed Blurry Overlay - Added dark background with opacity */}
      <div 
        className={`absolute inset-0 backdrop-blur-md transition-all duration-500 ${
          isFormFocused ? "opacity-100 bg-black/40" : "opacity-0 bg-black/0"
        }`}
      />
      
      {/* Secret Mode Indicator */}
      {secretMode && (
        <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium z-50 animate-pulse">
          Power Mode Active
        </div>
      )}
      
      <div 
        className="relative z-10 transition-all duration-500"
        onMouseEnter={handleFormFocus}
        onMouseLeave={handleFormBlur}
        onFocus={handleFormFocus}
        onBlur={handleFormBlur}
      >
        <div className={`bg-white p-8 rounded-lg shadow-2xl w-96 transform transition-all duration-300 hover:scale-105 hover:shadow-xl border ${
          secretMode ? "border-purple-500 ring-2 ring-purple-300" : "border-gray-100"
        }`}>
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {secretMode ? "⚡ Power Login" : "Login"}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            {secretMode ? "System Power Access" : "Skyweb Motorpool"}
          </p>
          
          <form onSubmit={handleSubmit}>
            {/* Username Field with Icon */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-700 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={secretMode}
                />
              </div>
            </div>
            
            {/* Password Field with Icon */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-700 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={secretMode}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full text-white py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 ${
                secretMode 
                  ? "bg-purple-600 hover:bg-purple-700" 
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>
                    {secretMode ? "Power Access..." : "Logging in..."}
                  </span>
                </>
              ) : (
                <span>
                  {secretMode ? "⚡ Power Login" : "Login"}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}