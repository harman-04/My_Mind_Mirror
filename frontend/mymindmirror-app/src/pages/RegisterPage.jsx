import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/api/auth/register', {
        username,
        email,
        password,
      });
      console.log('Registration successful:', response.data);
      setMessage(response.data.message || 'Registration successful! You can now login.');
      setError(''); // Clear any previous errors
      // Optionally navigate to login page after successful registration
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Navigate to login after 2 seconds
      
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
      setMessage(''); // Clear any previous success messages
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-xl
                    bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                    transition-all duration-500">
      <h2 className="text-3xl font-poppins font-semibold text-center mb-6 text-[#B399D4] dark:text-[#5CC8C2]">
        Register
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && <p className="text-green-600 dark:text-green-400 text-sm text-center font-inter">{message}</p>}
        {error && <p className="text-[#FF8A7A] text-sm text-center font-inter">{error}</p>}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 font-inter" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            className="shadow appearance-none border rounded w-full py-2 px-3 
                       text-gray-700 leading-tight focus:outline-none focus:shadow-outline
                       bg-white/80 dark:bg-gray-700/80 dark:text-gray-200 border-gray-300 dark:border-gray-600
                       font-inter"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Username"
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 font-inter" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded w-full py-2 px-3 
                       text-gray-700 leading-tight focus:outline-none focus:shadow-outline
                       bg-white/80 dark:bg-gray-700/80 dark:text-gray-200 border-gray-300 dark:border-gray-600
                       font-inter"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 font-inter" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 
                       text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline
                       bg-white/80 dark:bg-gray-700/80 dark:text-gray-200 border-gray-300 dark:border-gray-600
                       font-inter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 font-inter" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            className="shadow appearance-none border rounded w-full py-2 px-3 
                       text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline
                       bg-white/80 dark:bg-gray-700/80 dark:text-gray-200 border-gray-300 dark:border-gray-600
                       font-inter"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-label="Confirm Password"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 rounded-full font-poppins font-semibold text-white
                     bg-[#5CC8C2] hover:bg-[#47A9A1] active:bg-[#3A8D86]
                     shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5CC8C2] focus:ring-opacity-75
                     transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4 font-inter">
        Already have an account?{' '}
        <Link to="/login" className="text-[#B399D4] hover:text-[#5CC8C2] dark:text-[#5CC8C2] dark:hover:text-[#B399D4] font-semibold transition-colors duration-300">
          Login here
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
