import React, { useState, useEffect } from 'react';
import { vocabularyService } from '../services/api';

const Vocabulary = () => {
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [filter, setFilter] = useState('all'); // all, low, medium, high
  
  // Fetch vocabulary from API
  useEffect(() => {
    fetchVocabulary();
  }, []);
  
  const fetchVocabulary = async () => {
    setLoading(true);
    try {
      const data = await vocabularyService.getAllVocabulary();
      setVocabulary(data);
    } catch (err) {
      setError('Failed to load vocabulary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const addVocabulary = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    
    try {
      await vocabularyService.addVocabulary(newWord, newTranslation);
      setNewWord('');
      setNewTranslation('');
      fetchVocabulary(); // Refresh the list
    } catch (err) {
      setError('Failed to add vocabulary');
      console.error(err);
    }
  };
  
  const updateProficiency = async (word, change) => {
    try {
      await vocabularyService.updateProficiency(word, change);
      
      // Update locally without refetching
      setVocabulary(prevVocab => 
        prevVocab.map(item => {
          if (item.word === word) {
            const newProficiency = Math.min(1, Math.max(0, item.proficiency + change));
            return { ...item, proficiency: newProficiency };
          }
          return item;
        })
      );
    } catch (err) {
      setError('Failed to update proficiency');
      console.error(err);
    }
  };
  
  // Filter vocabulary based on proficiency
  const filteredVocabulary = vocabulary.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'low') return item.proficiency < 0.33;
    if (filter === 'medium') return item.proficiency >= 0.33 && item.proficiency < 0.66;
    if (filter === 'high') return item.proficiency >= 0.66;
    return true;
  });
  
  // Get proficiency class for styling
  const getProficiencyClass = (proficiency) => {
    if (proficiency < 0.33) return 'low';
    if (proficiency < 0.66) return 'medium';
    return 'high';
  };

  return (
    <div className="vocabulary-container">
      <h1 className="text-2xl font-bold mb-6">My Vocabulary</h1>
      
      {error && <div className="error-message mb-4">{error}</div>}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Word</h2>
        <form onSubmit={addVocabulary} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="new-word" className="block text-gray-700 font-medium mb-2">
              Word
            </label>
            <input
              type="text"
              id="new-word"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter word in target language"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="new-translation" className="block text-gray-700 font-medium mb-2">
              Translation
            </label>
            <input
              type="text"
              id="new-translation"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter translation in your language"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn btn-primary h-[42px] mt-auto"
              disabled={!newWord.trim()}
            >
              Add Word
            </button>
          </div>
        </form>
      </div>
      
      <div className="vocabulary-list-container bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Word List</h2>
          <div>
            <label htmlFor="filter" className="mr-2">Filter:</label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md"
            >
              <option value="all">All Words</option>
              <option value="low">Needs Practice</option>
              <option value="medium">Learning</option>
              <option value="high">Well Known</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {filteredVocabulary.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                {vocabulary.length === 0
                  ? 'No vocabulary words yet. Add your first word above!'
                  : 'No words match the current filter.'
                }
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="vocab-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-4">Word</th>
                      <th className="text-left py-2 px-4">Translation</th>
                      <th className="text-left py-2 px-4">Level</th>
                      <th className="text-left py-2 px-4">Proficiency</th>
                      <th className="text-left py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVocabulary.map((item) => (
                      <tr key={item.word} className="border-t">
                        <td className="py-2 px-4 font-medium">{item.word}</td>
                        <td className="py-2 px-4">{item.translation}</td>
                        <td className="py-2 px-4">{item.level}</td>
                        <td className="py-2 px-4 w-40">
                          <div className={`mastery-meter ${getProficiencyClass(item.proficiency)}`}>
                            <div 
                              className="mastery-fill" 
                              style={{ width: `${item.proficiency * 100}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateProficiency(item.word, 0.1)}
                              className="btn btn-small btn-primary"
                              title="I know this word"
                            >
                              +
                            </button>
                            <button 
                              onClick={() => updateProficiency(item.word, -0.1)}
                              className="btn btn-small btn-secondary"
                              title="I need to practice this word"
                            >
                              -
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 text-gray-600 text-sm">
              Showing {filteredVocabulary.length} of {vocabulary.length} words
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Vocabulary;