import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Added props: initialText for pre-filling, entryIdToUpdate for PUT requests, onCancelEdit for closing edit form
function JournalInput({ onNewEntry, initialText = '', entryIdToUpdate = null, onCancelEdit }) {
  const [text, setText] = useState(initialText);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Effect to update text state if initialText prop changes (e.g., when a different entry is selected for edit)
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const token = localStorage.getItem('jwtToken');
    if (!token) {
      setError('You are not logged in. Please log in to submit a journal entry.');
      setLoading(false);
      return;
    }
    if (text.trim() === '') {
      setError('Journal entry cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      if (entryIdToUpdate) {
        // This is an UPDATE request (PUT)
        const response = await axios.put(`http://localhost:8080/api/journal/${entryIdToUpdate}`, { text }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Entry updated and re-analyzed:', response.data);
        setMessage('Entry updated and re-analyzed successfully!');
      } else {
        // This is a NEW entry request (POST)
        const response = await axios.post('http://localhost:8080/api/journal', { text }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Entry saved and analyzed:', response.data);
        setMessage('Entry saved and analyzed successfully!');
      }
      
      setText(''); // Clear textarea after successful submission/update
      if (onNewEntry) { // Call parent callback
        onNewEntry(); 
      }
      if (onCancelEdit && entryIdToUpdate) { // Close edit form if this was an update
        onCancelEdit();
      }

    } catch (err) {
      console.error('Error saving/updating entry:', err.response ? err.response.data : err.message);
      setError('Failed to save/update entry. Please ensure backend services are running and you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-6 rounded-lg
                                         bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
      <h2 className="text-2xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2]">
        {entryIdToUpdate ? `Edit Entry for ${initialText.substring(0, 30)}...` : "What's on your mind today?"}
      </h2>
      {message && <p className="text-green-600 dark:text-green-400 font-inter">{message}</p>}
      {error && <p className="text-[#FF8A7A] font-inter">{error}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your thoughts here... The AI will help you understand them."
        rows="10"
        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                   focus:outline-none focus:ring-2 focus:ring-[#B399D4] dark:focus:ring-[#5CC8C2]
                   font-inter resize-y transition-colors duration-300"
        aria-label="Journal Entry Text Area"
      ></textarea>
      <div className="flex space-x-4">
        <button
          type="submit"
          className="flex-grow rounded-full font-poppins font-semibold text-white
                     bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                     shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                     transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed
                     
                     // Responsive classes for padding and font size
                     py-2 px-4 text-base // Default for small screens (mobile)
                     sm:py-3 sm:px-6 sm:text-lg // Medium screens (tablets)
                     md:py-4 md:px-8 md:text-xl // Larger screens (desktops)
                    "
          disabled={loading}
        >
          {loading ? (entryIdToUpdate ? 'Updating...' : 'Analyzing & Saving...') : (entryIdToUpdate ? 'Update Entry' : 'Analyze & Save Entry')}
        </button>
        {entryIdToUpdate && ( // Show cancel button only in edit mode
          <button
            type="button" // Important: type="button" to prevent form submission
            onClick={onCancelEdit}
            className="rounded-full font-poppins font-semibold text-white
                       bg-gray-500 hover:bg-gray-600 active:bg-gray-700
                       shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75
                       transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed

                       // Responsive classes for padding and font size
                       py-2 px-4 text-base // Default for small screens (mobile)
                       sm:py-3 sm:px-6 sm:text-lg // Medium screens (tablets)
                       md:py-4 md:px-8 md:text-xl // Larger screens (desktops)
                      "
            disabled={loading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default JournalInput;
