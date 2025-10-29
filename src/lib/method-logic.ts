/**
 * Method Logic - Video Search Pattern Manager
 *
 * This module handles the organization and parsing of video search patterns
 * Each pattern consists of multiple components that define how to search for videos
 */

// ============================================================================
// DATA STRUCTURE
// ============================================================================
// JSON file: "search-terms.json"
// {
//   "patterns": [
//     {
//       "name": "KakaoTalk Video",
//       "specifier": "YYYY MM",
//       "genre": "Misc",
//       "age": "old",  // "new" | "old" | ""
//       "constraints": [
//         { "type": "year", "value": 2012 }
//       ]
//     },
//     {
//       "name": "My Stupeflix Video",
//       "specifier": "XXXX",
//       "genre": "Misc",
//       "age": "",
//       "constraints": [
//         { "type": "range", "value": "0000-1050" }
//       ]
//     },
//     {
//       "name": "HMS",
//       "specifier": "HMS",
//       "genre": "Misc",
//       "age": "",
//       "constraints": [
//         { "type": "time-range", "value": "000000-235959" },
//         { "type": "category", "value": "Time of Day" }
//       ]
//     },
//     {
//       "name": "Copy of Copy Of",
//       "specifier": "",
//       "genre": "Misc",
//       "age": "",
//       "constraints": []
//     }
//   ]
// }

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Constraint {
  type: 'year' | 'range' | 'time-range' | 'letter-range' | 'filter' | 'category';
  value: string | number;
}

interface SearchPattern {
  name: string;
  specifier: string;  // "YYYY MM" | "YMD" | "HMS" | "Y" | "Month DD, YYYY" | "XXXX" | ""
  genre: string;
  age: 'new' | 'old' | '';
  constraints: Constraint[];
}

interface SearchTermsData {
  patterns: SearchPattern[];
}

// ============================================================================
// PSEUDOCODE: READ FROM JSON FILE
// ============================================================================
// function loadSearchTerms(filePath = "search-terms.json"):
//   try:
//     // Read the file contents
//     fileContent = readFileSync(filePath, 'utf-8')
//
//     // Parse JSON string into object
//     data = JSON.parse(fileContent)
//
//     // Validate structure (ensure patterns array exists)
//     if (!data.patterns || !Array.isArray(data.patterns)):
//       throw new Error("Invalid search terms file structure")
//
//     // Return the parsed data
//     return data as SearchTermsData
//
//   catch (FileNotFoundError):
//     // If file doesn't exist, return empty structure
//     console.log("Search terms file not found, creating new one")
//     return { patterns: [] }
//
//   catch (JSONParseError):
//     console.error("Failed to parse search terms JSON")
//     throw error

// ============================================================================
// PSEUDOCODE: WRITE TO JSON FILE
// ============================================================================
// function saveSearchTerms(data: SearchTermsData, filePath = "search-terms.json"):
//   try:
//     // Convert object to formatted JSON string (with 2-space indentation)
//     jsonString = JSON.stringify(data, null, 2)
//
//     // Write to file
//     writeFileSync(filePath, jsonString, 'utf-8')
//
//     console.log("Search terms saved successfully")
//     return true
//
//   catch (error):
//     console.error("Failed to save search terms:", error)
//     throw error

// ============================================================================
// PSEUDOCODE: ADD NEW PATTERN
// ============================================================================
// function addPattern(newPattern: SearchPattern):
//   // Load existing data
//   data = loadSearchTerms()
//
//   // Check for duplicate names (optional validation)
//   existingPattern = data.patterns.find(p => p.name === newPattern.name)
//   if (existingPattern):
//     throw new Error("Pattern with this name already exists")
//
//   // Add new pattern to array
//   data.patterns.push(newPattern)
//
//   // Save back to file
//   saveSearchTerms(data)
//
//   return newPattern

// ============================================================================
// PSEUDOCODE: GET ALL PATTERNS
// ============================================================================
// function getAllPatterns():
//   data = loadSearchTerms()
//   return data.patterns

// ============================================================================
// PSEUDOCODE: GET PATTERN BY NAME
// ============================================================================
// function getPatternByName(name: string):
//   data = loadSearchTerms()
//   pattern = data.patterns.find(p => p.name === name)
//
//   if (!pattern):
//     throw new Error("Pattern not found: " + name)
//
//   return pattern

// ============================================================================
// PSEUDOCODE: UPDATE PATTERN
// ============================================================================
// function updatePattern(name: string, updatedPattern: SearchPattern):
//   // Load existing data
//   data = loadSearchTerms()
//
//   // Find pattern index
//   index = data.patterns.findIndex(p => p.name === name)
//
//   if (index === -1):
//     throw new Error("Pattern not found: " + name)
//
//   // Replace pattern at index
//   data.patterns[index] = updatedPattern
//
//   // Save back to file
//   saveSearchTerms(data)
//
//   return updatedPattern

// ============================================================================
// PSEUDOCODE: DELETE PATTERN
// ============================================================================
// function deletePattern(name: string):
//   // Load existing data
//   data = loadSearchTerms()
//
//   // Filter out the pattern to delete
//   originalLength = data.patterns.length
//   data.patterns = data.patterns.filter(p => p.name !== name)
//
//   if (data.patterns.length === originalLength):
//     throw new Error("Pattern not found: " + name)
//
//   // Save back to file
//   saveSearchTerms(data)
//
//   return true

// ============================================================================
// PSEUDOCODE: FILTER PATTERNS BY AGE
// ============================================================================
// function getPatternsByAge(age: 'new' | 'old'):
//   data = loadSearchTerms()
//
//   // Return patterns that match the age OR have empty age (works for both)
//   return data.patterns.filter(p => p.age === age || p.age === '')

// ============================================================================
// PSEUDOCODE: FILTER PATTERNS BY GENRE
// ============================================================================
// function getPatternsByGenre(genre: string):
//   data = loadSearchTerms()
//   return data.patterns.filter(p => p.genre === genre)
