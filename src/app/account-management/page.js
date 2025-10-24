"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from '../../supabaseClient';

export default function AccountManagement() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState(null);
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    full_name: '',
    email: '',
    contact_no: '',
    address: '',
    position: ''
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmNewPassword: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!user) {
      router.push("/");
      return;
    }
    
    // For regular users, they can only manage their own account
    if (user.role !== 'admin') {
      setCurrentUser(user);
      fetchCurrentUserOnly(user.id);
      return;
    }
    
    // For admins, show password verification first
    setCurrentUser(user);
    setShowPasswordVerification(true);
  }, [router]);

  // Validation functions
  const validateFullName = (name) => {
    if (!name) return '';
    if (name.length > 50) return 'Full name must be 50 characters or less';
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name)) {
      return 'Full name cannot contain numbers or symbols';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return '';
    const validDomains = ['@gmail.com', '@yahoo.com', '@hotmail.com'];
    const isValidDomain = validDomains.some(domain => email.endsWith(domain));
    if (!isValidDomain) {
      return 'Email must end with @gmail.com, @yahoo.com, or @hotmail.com';
    }
    return '';
  };

  const validateContactNo = (contact) => {
    if (!contact) return '';
    if (!contact.startsWith('09')) {
      return 'Contact number must start with &quot;09&quot;';
    }
    if (contact.length !== 11) {
      return 'Contact number must be exactly 11 digits';
    }
    if (!/^\d+$/.test(contact)) {
      return 'Contact number must contain only numbers';
    }
    return '';
  };

  const validatePosition = (position) => {
    if (!position) return '';
    if (position.length > 20) return 'Position must be 20 characters or less';
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(position)) {
      return 'Position cannot contain numbers or symbols';
    }
    return '';
  };

  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 30) return 'Username must be 30 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  // Real-time validation for form fields
  const validateField = (name, value) => {
    switch (name) {
      case 'full_name':
        return validateFullName(value);
      case 'email':
        return validateEmail(value);
      case 'contact_no':
        return validateContactNo(value);
      case 'position':
        return validatePosition(value);
      case 'username':
        return validateUsername(value);
      case 'password':
        return validatePassword(value);
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Apply input restrictions based on field type
    let processedValue = value;
    
    switch (name) {
      case 'full_name':
      case 'position':
        // Only allow letters and spaces
        processedValue = value.replace(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '');
        // Limit length
        if (name === 'full_name' && value.length > 50) return;
        if (name === 'position' && value.length > 20) return;
        break;
      
      case 'contact_no':
        // Only allow numbers and enforce 09 prefix
        processedValue = value.replace(/\D/g, '');
        if (processedValue.length > 11) return;
        // Auto-format to show 09 prefix
        if (processedValue.length === 1 && processedValue !== '0') {
          processedValue = '0' + processedValue;
        }
        if (processedValue.length === 2 && !processedValue.startsWith('09')) {
          processedValue = '09';
        }
        break;
      
      case 'email':
        // Limit length for email
        if (value.length > 100) return;
        break;
      
      case 'username':
        // Only allow alphanumeric and underscore, limit length
        processedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
        if (processedValue.length > 30) return;
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Real-time validation
    const error = validateField(name, processedValue);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleContactNoChange = (e) => {
    const { value } = e.target;
    const numbersOnly = value.replace(/\D/g, '');
    
    let processedValue = numbersOnly;
    if (numbersOnly.length > 11) {
      processedValue = numbersOnly.slice(0, 11);
    }
    
    // Ensure it starts with 09
    if (processedValue.length === 1 && processedValue !== '0') {
      processedValue = '0' + processedValue;
    }
    if (processedValue.length === 2 && !processedValue.startsWith('09')) {
      processedValue = '09';
    }

    setFormData(prev => ({
      ...prev,
      contact_no: processedValue
    }));

    const error = validateContactNo(processedValue);
    setErrors(prev => ({
      ...prev,
      contact_no: error
    }));
  };

  const handleResetPasswordChange = (e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch only current user for regular users
  const fetchCurrentUserOnly = async (userId) => {
    try {
      setLoading(true);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_archived', false)
        .single();

      if (error) throw error;

      setUsers([user]);
    } catch (error) {
      console.error('Error fetching user:', error);
      showToast('Error fetching user data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toast notification system
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all active users from the database
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error fetching users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Verify admin password
  const verifyAdminPassword = async (e) => {
    e.preventDefault();
    
    if (!adminPassword) {
      showToast('Please enter your admin password', 'error');
      return;
    }

    try {
      // Verify admin password by attempting to login
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', currentUser.username)
        .eq('password', adminPassword)
        .single();

      if (error || !data) {
        showToast('Invalid admin password', 'error');
        return;
      }

      setAccessGranted(true);
      setShowPasswordVerification(false);
      fetchUsers();
      showToast('Access granted to account management', 'success');
    } catch (error) {
      console.error('Error verifying password:', error);
      showToast('Error verifying password', 'error');
    }
  };

  // Start editing a user
  const startEditUser = (user) => {
    // Regular users can only edit their own account
    if (currentUser.role !== 'admin' && user.id !== currentUser.id) {
      showToast('You can only edit your own account', 'error');
      return;
    }

    // Admins cannot change other users' roles to admin
    if (currentUser.role === 'admin' && user.role === 'admin' && user.id !== currentUser.id) {
      showToast('You cannot modify other admin accounts', 'error');
      return;
    }

    setEditingUser(user);
    const userData = {
      username: user.username || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'user',
      full_name: user.full_name || '',
      email: user.email || '',
      contact_no: user.contact_no || '',
      address: user.address || '',
      position: user.position || ''
    };
    
    setFormData(userData);
    
    // Validate existing data when starting to edit
    const newErrors = {};
    Object.keys(userData).forEach(key => {
      if (key !== 'password' && key !== 'confirmPassword') {
        const error = validateField(key, userData[key]);
        if (error) newErrors[key] = error;
      }
    });
    setErrors(newErrors);
  };

  // Start resetting password for a user
  const startResetPassword = (user) => {
    // Regular users can only reset their own password
    if (currentUser.role !== 'admin' && user.id !== currentUser.id) {
      showToast('You can only reset your own password', 'error');
      return;
    }

    // Admins cannot reset other admin passwords
    if (currentUser.role === 'admin' && user.role === 'admin' && user.id !== currentUser.id) {
      showToast('You cannot reset other admin passwords', 'error');
      return;
    }

    setResettingPasswordUser(user);
    setResetPasswordData({
      newPassword: '',
      confirmNewPassword: ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ 
      username: '', 
      password: '', 
      confirmPassword: '', 
      role: 'user',
      full_name: '',
      email: '',
      contact_no: '',
      address: '',
      position: ''
    });
    setErrors({});
  };

  // Cancel password reset
  const cancelResetPassword = () => {
    setResettingPasswordUser(null);
    setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
  };

  // Validate all form data before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else {
      const usernameError = validateUsername(formData.username);
      if (usernameError) newErrors.username = usernameError;
    }

    // Optional fields validation
    if (formData.full_name) {
      const fullNameError = validateFullName(formData.full_name);
      if (fullNameError) newErrors.full_name = fullNameError;
    }

    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (formData.contact_no) {
      const contactError = validateContactNo(formData.contact_no);
      if (contactError) newErrors.contact_no = contactError;
    }

    if (formData.position) {
      const positionError = validatePosition(formData.position);
      if (positionError) newErrors.position = positionError;
    }

    // Password validation (only if password is being changed)
    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) newErrors.password = passwordError;
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update user information
  const updateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser) return;

    // Validate form before submission
    if (!validateForm()) {
      showToast('Please fix the validation errors before saving', 'error');
      return;
    }

    try {
      let updates = {
        username: formData.username,
        full_name: formData.full_name || null,
        email: formData.email || null,
        contact_no: formData.contact_no || null,
        address: formData.address || null,
        position: formData.position || null
      };

      // Only admins can change roles, but cannot create other admins
      if (currentUser.role === 'admin') {
        // Prevent changing role to admin for other users
        if (formData.role === 'admin' && editingUser.id !== currentUser.id) {
          showToast('You cannot change other users to admin role', 'error');
          return;
        }
        updates.role = formData.role;
      }

      // Remove empty strings and convert to null for database
      Object.keys(updates).forEach(key => {
        if (updates[key] === '') {
          updates[key] = null;
        }
      });

      // Update password if provided
      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          showToast('Passwords do not match', 'error');
          return;
        }

        if (formData.password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }

        updates.password = formData.password;
      }

      console.log('Updating user with data:', updates);

      // Update user in the database
      const { error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', editingUser.id);

      if (dbError) throw dbError;

      // If current user is updating themselves, update localStorage
      if (editingUser.id === currentUser.id) {
        const updatedUser = { ...currentUser, ...updates };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }

      showToast('User updated successfully', 'success');
      setEditingUser(null);
      setFormData({ 
        username: '', 
        password: '', 
        confirmPassword: '', 
        role: 'user',
        full_name: '',
        email: '',
        contact_no: '',
        address: '',
        position: ''
      });
      setErrors({});
      
      // Refresh users list
      if (currentUser.role === 'admin') {
        fetchUsers();
      } else {
        fetchCurrentUserOnly(currentUser.id);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Error updating user', 'error');
    }
  };

  // Reset password for user
  const resetUserPassword = async (e) => {
    e.preventDefault();
    
    if (!resettingPasswordUser) return;

    try {
      if (resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      if (resetPasswordData.newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }

      // Update password in the database
      const { error } = await supabase
        .from('users')
        .update({ 
          password: resetPasswordData.newPassword 
        })
        .eq('id', resettingPasswordUser.id);

      if (error) throw error;

      showToast(`Password reset successfully for ${resettingPasswordUser.username}`, 'success');
      setResettingPasswordUser(null);
      setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('Error resetting password', 'error');
    }
  };

  // Archive user - Only for admins and cannot archive other admins
  const archiveUser = async (userId) => {
    if (currentUser.role !== 'admin') {
      showToast('Only administrators can archive users', 'error');
      return;
    }

    if (userId === currentUser.id) {
      showToast('You cannot archive your own account', 'error');
      return;
    }

    // Find the user to check if they're an admin
    const userToArchive = users.find(user => user.id === userId);
    if (userToArchive && userToArchive.role === 'admin') {
      showToast('You cannot archive other admin accounts', 'error');
      return;
    }

    if (!confirm('Are you sure you want to archive this user? They will no longer appear in active users but can be restored from archives.')) {
      return;
    }

    try {
      // Archive user in database
      const { error } = await supabase
        .from('users')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      showToast('User archived successfully', 'success');
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error('Error archiving user:', error);
      showToast('Error archiving user', 'error');
    }
  };

  // Validate create user form
  const validateCreateForm = () => {
    const newErrors = {};
    
    // Required fields for creation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else {
      const usernameError = validateUsername(formData.username);
      if (usernameError) newErrors.username = usernameError;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordError = validatePassword(formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Optional fields validation
    if (formData.full_name) {
      const fullNameError = validateFullName(formData.full_name);
      if (fullNameError) newErrors.full_name = fullNameError;
    }

    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (formData.contact_no) {
      const contactError = validateContactNo(formData.contact_no);
      if (contactError) newErrors.contact_no = contactError;
    }

    if (formData.position) {
      const positionError = validatePosition(formData.position);
      if (positionError) newErrors.position = positionError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create new user - Only for admins and cannot create admin accounts
  const createUser = async (e) => {
    e.preventDefault();

    // Only admins can create new users
    if (currentUser.role !== 'admin') {
      showToast('Only administrators can create new users', 'error');
      return;
    }

    // Prevent creating admin accounts
    if (formData.role === 'admin') {
      showToast('You cannot create admin accounts. Only user accounts can be created.', 'error');
      return;
    }

    // Validate form before submission
    if (!validateCreateForm()) {
      showToast('Please fix the validation errors before creating user', 'error');
      return;
    }

    try {
      // Prepare user data for insertion - Force role to 'user'
      const userData = {
        username: formData.username,
        password: formData.password,
        role: 'user', // Force role to user
        full_name: formData.full_name || null,
        email: formData.email || null,
        contact_no: formData.contact_no || null,
        address: formData.address || null,
        position: formData.position || null,
        is_archived: false,
        created_at: new Date().toISOString()
      };

      // Remove empty strings and convert to null for database
      Object.keys(userData).forEach(key => {
        if (userData[key] === '') {
          userData[key] = null;
        }
      });

      console.log('Inserting user data:', userData);

      // Create user record in database
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      showToast('User created successfully', 'success');
      
      // Reset form
      setFormData({ 
        username: '', 
        password: '', 
        confirmPassword: '', 
        role: 'user',
        full_name: '',
        email: '',
        contact_no: '',
        address: '',
        position: ''
      });
      setErrors({});
      
      // Refresh users list
      fetchUsers();
      
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === '23505') {
        showToast('Username already exists', 'error');
      } else if (error.message) {
        showToast(`Error: ${error.message}`, 'error');
      } else {
        showToast('Error creating user', 'error');
      }
    }
  };

  // Helper function to render input field with validation
  const renderInputField = (field) => {
    const fieldConfig = {
      full_name: { label: 'Full Name', placeholder: 'Enter full name', type: 'text', maxLength: 50 },
      email: { label: 'Email', placeholder: 'Enter email', type: 'email', maxLength: 100 },
      contact_no: { label: 'Contact Number', placeholder: '09XXXXXXXXX', type: 'tel', maxLength: 11 },
      position: { label: 'Position', placeholder: 'Enter position', type: 'text', maxLength: 20 },
      username: { label: 'Username *', placeholder: 'Enter username', type: 'text', maxLength: 30 },
      password: { label: 'Password *', placeholder: 'Enter password', type: 'password' },
      confirmPassword: { label: 'Confirm Password *', placeholder: 'Confirm password', type: 'password' }
    };

    const config = fieldConfig[field];
    if (!config) return null;

    return (
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {config.label}
        </label>
        <input
          type={config.type}
          name={field}
          value={formData[field]}
          onChange={field === 'contact_no' ? handleContactNoChange : handleInputChange}
          placeholder={config.placeholder}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900 ${
            errors[field] ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={config.maxLength}
          required={field === 'username' || field === 'password' || field === 'confirmPassword'}
          minLength={field === 'password' ? 6 : undefined}
        />
        {errors[field] && (
          <p className="text-red-500 text-xs mt-1 font-medium">{errors[field]}</p>
        )}
        {field === 'contact_no' && (
          <p className="text-xs text-gray-600 mt-1">
            Must start with &quot;09&quot; and be exactly 11 digits total
          </p>
        )}
        {field === 'email' && (
          <p className="text-xs text-gray-600 mt-1">
            Must end with @gmail.com, @yahoo.com, or @hotmail.com
          </p>
        )}
      </div>
    );
  };

  // Password Verification Form for Admins
  if (showPasswordVerification && currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header matching Topbar */}
          <div className="bg-blue-900 shadow-lg rounded-t-2xl p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Skyland Motorpool</h1>
            <p className="text-blue-200 font-medium">Account Management - Admin Access Required</p>
          </div>

          {/* White Background Verification Form */}
          <div className="bg-white p-8 rounded-b-2xl shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-red-600 text-2xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Admin Verification Required</h2>
              <p className="text-gray-700 font-medium">Please enter your admin password to access account management</p>
            </div>

            <form onSubmit={verifyAdminPassword} className="space-y-6">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-3">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter your admin password"
                  className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900 bg-white"
                  required
                  autoFocus
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-500 text-white py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-bold text-lg shadow-md"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-bold text-lg shadow-md"
                >
                  <i className="fas fa-unlock mr-2"></i>
                  Verify & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Account Management Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header matching Topbar design */}
      <header className="bg-blue-900 shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="bg-blue-800 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg shadow-md"
              title="Go Back"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back
            </button>
            <h1 className="text-2xl font-bold text-white">Skyland Motorpool</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-bold text-white text-lg">{currentUser?.username}</p>
              <p className="text-sm text-blue-200 capitalize font-medium">{currentUser?.role}</p>
            </div>
            <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center border-2 border-blue-300">
              <i className="fas fa-user-cog text-white text-lg"></i>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {currentUser?.role === 'admin' ? 'User Account Management' : 'My Account'}
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              {currentUser?.role === 'admin' ? 'Admin Panel - Manage user accounts' : 'Manage your account information'}
            </p>
          </div>

          {/* Create New User Form - Only for Admins */}
          {currentUser?.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create New User</h3>
              
              <form onSubmit={createUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderInputField('username')}

                  {/* Role field removed for admin creation - all new users are 'user' role */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 font-medium text-gray-600">
                      User
                    </div>
                    <input type="hidden" name="role" value="user" />
                  </div>

                  {renderInputField('full_name')}
                  {renderInputField('email')}
                  {renderInputField('contact_no')}
                  {renderInputField('position')}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter address"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                    />
                  </div>

                  {renderInputField('password')}
                  {renderInputField('confirmPassword')}
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-bold text-lg shadow-md"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Create User Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {currentUser?.role === 'admin' ? 'Active Users' : 'My Account Information'}
              </h3>
              <span className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
                {users.length} {currentUser?.role === 'admin' ? 'active users' : 'account'}
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: currentUser?.role === 'admin' ? 5 : 1 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-users text-4xl text-gray-300 mb-3"></i>
                <p className="text-gray-500 font-bold text-lg">No active users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    {editingUser?.id === user.id ? (
                      // Edit Form
                      <form onSubmit={updateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {renderInputField('username')}

                          {/* Role field - Only visible to admins and only for non-admin users */}
                          {currentUser?.role === 'admin' && user.role !== 'admin' && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                Role *
                              </label>
                              <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                                required
                              >
                                <option value="user">User</option>
                                {/* Admin option removed - admins cannot create other admins */}
                              </select>
                            </div>
                          )}

                          {/* For admin users, show disabled role field */}
                          {currentUser?.role === 'admin' && user.role === 'admin' && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                Role
                              </label>
                              <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 font-medium text-gray-600">
                                Admin
                              </div>
                            </div>
                          )}

                          {renderInputField('full_name')}
                          {renderInputField('email')}
                          {renderInputField('contact_no')}
                          {renderInputField('position')}

                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Address
                            </label>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                            />
                          </div>

                          {renderInputField('password')}
                          {renderInputField('confirmPassword')}
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-lg shadow-md"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg shadow-md"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : resettingPasswordUser?.id === user.id ? (
                      // Reset Password Form
                      <form onSubmit={resetUserPassword} className="space-y-4">
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                          <div className="flex items-center">
                            <i className="fas fa-key text-yellow-600 mr-2 text-lg"></i>
                            <span className="text-yellow-800 font-bold text-lg">
                              Reset Password for {user.username}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              New Password *
                            </label>
                            <input
                              type="password"
                              name="newPassword"
                              value={resetPasswordData.newPassword}
                              onChange={handleResetPasswordChange}
                              placeholder="Enter new password"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                              minLength="6"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Confirm New Password *
                            </label>
                            <input
                              type="password"
                              name="confirmNewPassword"
                              value={resetPasswordData.confirmNewPassword}
                              onChange={handleResetPasswordChange}
                              placeholder="Confirm new password"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                              minLength="6"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={cancelResetPassword}
                            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-lg shadow-md"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg shadow-md"
                          >
                            Reset Password
                          </button>
                        </div>
                      </form>
                    ) : (
                      // User Info Display
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                            user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}>
                            <i className="fas fa-user text-white text-lg"></i>
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <p className="font-bold text-gray-900 text-lg">{user.username}</p>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {user.role}
                              </span>
                              {user.id === currentUser?.id && (
                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300">
                                  Current User
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 space-y-1 font-medium">
                              {user.full_name && <div><strong>Name:</strong> {user.full_name}</div>}
                              {user.email && <div><strong>Email:</strong> {user.email}</div>}
                              {user.position && <div><strong>Position:</strong> {user.position}</div>}
                              {user.contact_no && <div><strong>Contact:</strong> {user.contact_no}</div>}
                              {user.address && <div><strong>Address:</strong> {user.address}</div>}
                              <div className="text-xs text-gray-500 font-normal">
                                <strong>ID:</strong> {user.id.substring(0, 8)}... • <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          {/* Edit button - Restricted for admin accounts */}
                          {(user.role !== "admin" || user.id === currentUser?.id) && (
                            <button
                              onClick={() => startEditUser(user)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-md"
                              title="Edit User"
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </button>
                          )}
                          
                          {/* Reset Password button - Restricted for admin accounts */}
                          {(user.role !== "admin" || user.id === currentUser?.id) && (
                            <button
                              onClick={() => startResetPassword(user)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm shadow-md"
                              title="Reset Password"
                            >
                              <i className="fas fa-key mr-1"></i>
                              Reset Password
                            </button>
                          )}
                          
                          {/* Archive button - Only for admins, not for current user, and not for other admins */}
                          {currentUser?.role === "admin" && user.id !== currentUser?.id && user.role !== "admin" && (
                            <button
                              onClick={() => archiveUser(user.id)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold text-sm shadow-md"
                              title="Archive User"
                            >
                              <i className="fas fa-archive mr-1"></i>
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 max-w-sm transition-all duration-300 font-bold ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-800' 
                : notification.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}
          >
            <div className="flex items-center">
              <i className={`fas ${
                notification.type === 'success' 
                  ? 'fa-check-circle' 
                  : notification.type === 'error'
                  ? 'fa-exclamation-circle'
                  : 'fa-info-circle'
              } mr-2 text-lg`}></i>
              <span className="font-bold">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}