/**
 * Google Sheets API Integration Utility
 * 
 * This file contains functions for interacting with the Google Sheets API.
 * In a production environment, you'd want to handle this on a server to keep your API key secure.
 */

// Configuration (would be stored securely in a real application)
const API_KEY = 'AIzaSyBMd8nlalBxzf3xyhIEBHrfKbK2Dd5WgJ4';
const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets/';

export async function getSpreadsheetTitle(spreadsheetId) {
    try {
      const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      return response.result.properties.title;
    } catch (error) {
      console.error('Error fetching spreadsheet title:', error);
      throw error;
    }
  }

/**
 * Fetches data from a Google Sheet using Google's JavaScript client library
 * @param {string} spreadsheetId - The ID of the Google Sheet
 * @param {string} sheetName - Optional sheet name. If not provided, the first sheet will be used
 * @returns {Promise} - Promise that resolves with the sheet data
 */
export async function fetchSheetData(spreadsheetId, sheetName = null) {
    // Make sure we're only initializing gapi once
    if (!window.gapiInitialized) {
        try {
            // Load and initialize the API client
            await new Promise((resolve, reject) => {
                // Add the script if it doesn't exist
                if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                } else {
                    resolve();
                }
            });

            // Load the client library and auth2 library
            await new Promise((resolve, reject) => {
                gapi.load('client', resolve);
            });

            // Initialize the client with your API key
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });

            window.gapiInitialized = true;
        } catch (error) {
            console.error('Error initializing Google API client:', error);
            throw new Error('Failed to initialize Google API client. Please try again.');
        }
    }

    try {
        // If no sheet name provided, get the first sheet
        let targetSheet = sheetName;
        if (!targetSheet) {
            const sheets = await getSheetNames(spreadsheetId);
            if (!sheets || sheets.length === 0) {
                throw new Error('No sheets found in this spreadsheet.');
            }
            targetSheet = sheets[0];
            console.log('Using first sheet:', targetSheet);
        }
        
        // Make the API request through the client library
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${targetSheet}!A1:Z1000` // Get a reasonably large range of cells
        });

        return response.result        
    } catch (error) {
        console.error('Error fetching Google Sheet data:', error);
        
        // Provide more helpful error messages
        if (error.status === 403) {
            throw new Error('Access denied. Make sure the spreadsheet is shared publicly or with your Google account.');
        } else if (error.status === 404) {
            throw new Error('Spreadsheet not found. Please check the spreadsheet ID.');
        } else {
            throw new Error(`Failed to fetch sheet data: ${error.message || 'Unknown error'}`);
        }
    }
}

/**
 * Gets the sheet names from a spreadsheet using Google's JavaScript client library
 * @param {string} spreadsheetId - The ID of the Google Sheet
 * @returns {Promise} - Promise that resolves with an array of sheet names
 */
export async function getSheetNames(spreadsheetId) {
    // Ensure gapi is initialized
    if (!window.gapiInitialized) {
        await fetchSheetData(spreadsheetId, ''); // This will initialize gapi
    }
    
    try {
        // Call the sheets API to get the spreadsheet metadata
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties.title'
        });
        
        // Extract sheet names from the response
        return response.result.sheets.map(sheet => sheet.properties.title);
    } catch (error) {
        console.error('Error fetching sheet names:', error);
        
        if (error.status === 403) {
            throw new Error('Access denied. Make sure the spreadsheet is shared publicly or with your Google account.');
        } else if (error.status === 404) {
            throw new Error('Spreadsheet not found. Please check the spreadsheet ID.');
        } else {
            throw new Error(`Failed to fetch sheet names: ${error.message || 'Unknown error'}`);
        }
    }
}

/**
 * Extracts header row from sheet data
 * @param {Array} data - The sheet data with headers in the first row
 * @returns {Array} - Array of header names
 */
function extractHeaders(data) {
    if (!data || data.length === 0) {
        return [];
    }
    return data[0];
}

/**
 * Transforms sheet data into an array of objects with named properties
 * @param {Array} data - The raw sheet data (2D array)
 * @returns {Array} - Array of objects with properties named after column headers
 */
export function transformSheetData(data) {
    if (!data || data.length < 2) {
        return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

/**
 * Extracts a specific column from sheet data
 * @param {Array} data - The transformed sheet data (array of objects)
 * @param {string} columnName - The name of the column to extract
 * @returns {Array} - Array of values from the specified column
 */
export function extractColumn(data, columnName) {
    return data.map(row => {
        return {
            text: row[columnName] || '',
            // Additional metadata could be added here
            date: new Date().toLocaleDateString() // Mock date for demonstration
        };
    }).filter(item => item.text.trim() !== '');
}

/**
 * Find column by letter or name
 * @param {Array} headers - Array of header names
 * @param {string} columnIdentifier - Column letter (A, B, C...) or column name
 * @returns {string} - The matching column name or null if not found
 */
export function findColumn(headers, columnIdentifier) {
    // If it's a column letter (A, B, C...)
    if (/^[A-Z]$/i.test(columnIdentifier)) {
        const index = columnIdentifier.toUpperCase().charCodeAt(0) - 65; // Convert A->0, B->1, etc.
        return (index >= 0 && index < headers.length) ? headers[index] : null;
    }
    
    // If it's a column name, find exact or partial match
    const exactMatch = headers.find(header => header === columnIdentifier);
    if (exactMatch) return exactMatch;
    
    const partialMatch = headers.find(header => 
        header.toLowerCase().includes(columnIdentifier.toLowerCase())
    );
    
    return partialMatch || null;
}