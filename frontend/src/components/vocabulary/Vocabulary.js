import React, { useState } from 'react';

function Vocabulary() {
  // State for vocabulary entries
  const [vocabularyList, setVocabularyList] = useState([
    { id: 1, word: 'hola', translation: 'hello', proficiency: 0.85, level: 'A1', tags: ['greeting'] },
    { id: 2, word: 'gracias', translation: 'thank you', proficiency: 0.75, level: 'A1', tags: ['gratitude'] },
    { id: 3, word: 'por favor', translation: 'please', proficiency: 0.60, level: 'A1', tags: ['courtesy'] },
    { id: 4, word: 'comer', translation: 'to eat', proficiency: 0.45, level: 'A1', tags: ['verb', 'food'] },
    { id: 5, word: 'bebida', translation: 'drink', proficiency: 0.30, level: 'A1', tags: ['food'] },
  ]);
  
  // State for modal visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false);
  
  // State for filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    proficiencyFilter: 'all',
    tagFilter: 'all',
  });
  
  // State for new vocabulary entry
  const [newVocabulary, setNewVocabulary] = useState({
    word: '',
    translation: '',
    level: 'A1',
    tags: '',
  });
  
  // State for editing existing entry
  const [editingVocabulary, setEditingVocabulary] = useState(null);
  
  // State for flashcard mode
  const [flashcards, setFlashcards] = useState({
    currentIndex: 0,
    flipped: false,
    deck: []
  });
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Filter vocabulary list
  const filteredVocabulary = vocabularyList.filter(item => {
    // Filter by search term
    if (filters.searchTerm && 
        !item.word.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
        !item.translation.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by proficiency
    if (filters.proficiencyFilter !== 'all') {
      if (filters.proficiencyFilter === 'high' && item.proficiency < 0.7) return false;
      if (filters.proficiencyFilter === 'medium' && (item.proficiency < 0.4 || item.proficiency >= 0.7)) return false;
      if (filters.proficiencyFilter === 'low' && item.proficiency >= 0.4) return false;
    }
    
    // Filter by tag
    if (filters.tagFilter !== 'all' && !item.tags.includes(filters.tagFilter)) {
      return false;
    }
    
    return true;
  });
  
  // Get all unique tags from vocabulary
  const allTags = [...new Set(vocabularyList.flatMap(item => item.tags))];
  
  // Handle adding new vocabulary
  const handleAddVocabulary = (e) => {
    e.preventDefault();
    const newEntry = {
      id: vocabularyList.length + 1,
      word: newVocabulary.word,
      translation: newVocabulary.translation,
      proficiency: 0.1, // Start with low proficiency
      level: newVocabulary.level,
      tags: newVocabulary.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };
    
    setVocabularyList([...vocabularyList, newEntry]);
    setNewVocabulary({ word: '', translation: '', level: 'A1', tags: '' });
    setIsAddModalOpen(false);
  };
  
  // Open edit modal for a vocabulary item
  const openEditModal = (item) => {
    setEditingVocabulary({
      ...item,
      tags: item.tags.join(', ')
    });
    setIsEditModalOpen(true);
  };
  
  // Handle updating vocabulary
  const handleUpdateVocabulary = (e) => {
    e.preventDefault();
    
    const updatedVocabulary = vocabularyList.map(item => {
      if (item.id === editingVocabulary.id) {
        return {
          ...editingVocabulary,
          tags: editingVocabulary.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
      }
      return item;
    });
    
    setVocabularyList(updatedVocabulary);
    setIsEditModalOpen(false);
  };
  
  // Handle deleting vocabulary
  const handleDeleteVocabulary = (id) => {
    if (window.confirm('Are you sure you want to delete this vocabulary item?')) {
      const updatedVocabulary = vocabularyList.filter(item => item.id !== id);
      setVocabularyList(updatedVocabulary);
    }
  };
  
  // Start flashcards practice
  const startFlashcards = () => {
    // Use filtered list for flashcards
    setFlashcards({
      currentIndex: 0,
      flipped: false,
      deck: [...filteredVocabulary]
    });
    setIsFlashcardsModalOpen(true);
  };
  
  // Flashcard navigation
  const nextFlashcard = () => {
    if (flashcards.currentIndex < flashcards.deck.length - 1) {
      setFlashcards(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        flipped: false
      }));
    }
  };
  
  const prevFlashcard = () => {
    if (flashcards.currentIndex > 0) {
      setFlashcards(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        flipped: false
      }));
    }
  };
  
  // Flip flashcard
  const flipFlashcard = () => {
    setFlashcards(prev => ({
      ...prev,
      flipped: !prev.flipped
    }));
  };
  
  // Mark flashcard as known
  const markAsKnown = () => {
    const currentId = flashcards.deck[flashcards.currentIndex]?.id;
    if (currentId) {
      setVocabularyList(prev => 
        prev.map(item => 
          item.id === currentId
            ? { ...item, proficiency: Math.min(1, item.proficiency + 0.1) }
            : item
        )
      );
      nextFlashcard();
    }
  };
  
  // Mark flashcard as not known
  const markAsNotKnown = () => {
    const currentId = flashcards.deck[flashcards.currentIndex]?.id;
    if (currentId) {
      setVocabularyList(prev => 
        prev.map(item => 
          item.id === currentId
            ? { ...item, proficiency: Math.max(0, item.proficiency - 0.1) }
            : item
        )
      );
      nextFlashcard();
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-8 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">Vocabulary</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Add Word
            </button>
            <button
              onClick={startFlashcards}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Practice Flashcards
            </button>
          </div>
        </div>
      </header>
      
      <div className="p-8">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="searchTerm"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Search words or translations"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="proficiencyFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Proficiency
              </label>
              <select
                id="proficiencyFilter"
                name="proficiencyFilter"
                value={filters.proficiencyFilter}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="high">High (70-100%)</option>
                <option value="medium">Medium (40-69%)</option>
                <option value="low">Low (0-39%)</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="tagFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Tag
              </label>
              <select
                id="tagFilter"
                name="tagFilter"
                value={filters.tagFilter}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Word
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Translation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVocabulary.length > 0 ? (
                filteredVocabulary.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{item.word}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.translation}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-full rounded-full ${
                              item.proficiency >= 0.7 ? 'bg-green-500' : 
                              item.proficiency >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.proficiency * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{Math.round(item.proficiency * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteVocabulary(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No vocabulary items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Vocabulary Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Add New Vocabulary</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddVocabulary} className="p-6">
              <div className="mb-4">
                <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-1">
                  Word
                </label>
                <input
                  type="text"
                  id="word"
                  value={newVocabulary.word}
                  onChange={(e) => setNewVocabulary({...newVocabulary, word: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="translation" className="block text-sm font-medium text-gray-700 mb-1">
                  Translation
                </label>
                <input
                  type="text"
                  id="translation"
                  value={newVocabulary.translation}
                  onChange={(e) => setNewVocabulary({...newVocabulary, translation: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  id="level"
                  value={newVocabulary.level}
                  onChange={(e) => setNewVocabulary({...newVocabulary, level: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A1">A1 (Beginner)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced)</option>
                  <option value="C2">C2 (Proficient)</option>
                </select>
              </div>
              <div className="mb-6">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={newVocabulary.tags}
                  onChange={(e) => setNewVocabulary({...newVocabulary, tags: e.target.value})}
                  placeholder="e.g. food, verb, greeting"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  Add Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Vocabulary Modal */}
      {isEditModalOpen && editingVocabulary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Edit Vocabulary</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateVocabulary} className="p-6">
              <div className="mb-4">
                <label htmlFor="edit-word" className="block text-sm font-medium text-gray-700 mb-1">
                  Word
                </label>
                <input
                  type="text"
                  id="edit-word"
                  value={editingVocabulary.word}
                  onChange={(e) => setEditingVocabulary({...editingVocabulary, word: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-translation" className="block text-sm font-medium text-gray-700 mb-1">
                  Translation
                </label>
                <input
                  type="text"
                  id="edit-translation"
                  value={editingVocabulary.translation}
                  onChange={(e) => setEditingVocabulary({...editingVocabulary, translation: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-level" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  id="edit-level"
                  value={editingVocabulary.level}
                  onChange={(e) => setEditingVocabulary({...editingVocabulary, level: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A1">A1 (Beginner)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced)</option>
                  <option value="C2">C2 (Proficient)</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="edit-tags"
                  value={editingVocabulary.tags}
                  onChange={(e) => setEditingVocabulary({...editingVocabulary, tags: e.target.value})}
                  placeholder="e.g. food, verb, greeting"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="edit-proficiency" className="block text-sm font-medium text-gray-700 mb-1">
                  Proficiency: {Math.round(editingVocabulary.proficiency * 100)}%
                </label>
                <input
                  type="range"
                  id="edit-proficiency"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editingVocabulary.proficiency}
                  onChange={(e) => setEditingVocabulary({...editingVocabulary, proficiency: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  Update Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Flashcards Modal */}
      {isFlashcardsModalOpen && flashcards.deck.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Practice Flashcards</h3>
              <button 
                onClick={() => setIsFlashcardsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div 
                onClick={flipFlashcard}
                className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-6 h-48 flex items-center justify-center cursor-pointer text-center relative shadow-md transition-all hover:shadow-lg"
              >
                {flashcards.flipped ? (
                  <div className="text-2xl font-medium">{flashcards.deck[flashcards.currentIndex].translation}</div>
                ) : (
                  <div className="text-2xl font-medium">{flashcards.deck[flashcards.currentIndex].word}</div>
                )}
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  Click to flip
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={prevFlashcard}
                  disabled={flashcards.currentIndex === 0}
                  className={`px-3 py-1 rounded ${
                    flashcards.currentIndex === 0 
                      ? 'bg-gray-100 text-gray-400' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-500">
                  {flashcards.currentIndex + 1} of {flashcards.deck.length}
                </span>
                
                <button
                  onClick={nextFlashcard}
                  disabled={flashcards.currentIndex === flashcards.deck.length - 1}
                  className={`px-3 py-1 rounded ${
                    flashcards.currentIndex === flashcards.deck.length - 1 
                      ? 'bg-gray-100 text-gray-400' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Next
                </button>
              </div>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={markAsNotKnown}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  Don't Know
                </button>
                <button
                  onClick={markAsKnown}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Know
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Vocabulary;