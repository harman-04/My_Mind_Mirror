import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password,
      });
      console.log('Login successful:', response.data);
      // Store JWT token (e.g., in localStorage)
      localStorage.setItem('jwtToken', response.data.token);
      // Navigate to the dashboard or journal page
      navigate('/journal'); 
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-xl
                    bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                    transition-all duration-500">
      <h2 className="text-3xl font-poppins font-semibold text-center mb-6 text-[#B399D4] dark:text-[#5CC8C2]">
        Login
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <button
          type="submit"
          className="w-full py-2 px-4 rounded-full font-poppins font-semibold text-white
                     bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                     shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                     transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Logging In...' : 'Login'}
        </button>
      </form>
      <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4 font-inter">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#B399D4] hover:text-[#5CC8C2] dark:text-[#5CC8C2] dark:hover:text-[#B399D4] font-semibold transition-colors duration-300">
          Register here
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
