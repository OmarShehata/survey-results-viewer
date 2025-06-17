import DragAndDrop from './DragAndDrop.js';

document.addEventListener('DOMContentLoaded', function() {
    const viewButton = document.getElementById('view-button');
    const semanticButton = document.getElementById('semantic-button');

    const sheetsUrlInput = document.getElementById('sheets-url');
    const urlError = document.getElementById('url-error');

    const csvInput = document.querySelector("#csv")
    csvInput.oninput = () => {
        localStorage.setItem('csv', csvInput.value)
    }
    if (localStorage.getItem('csv')) {
        csvInput.value = localStorage.getItem('csv')
    }
    

    function validateGoogleSheetsInput() {
      // Get the Google Sheets URL
      const sheetsUrl = sheetsUrlInput.value.trim();
      // Validate URL format
      if (!sheetsUrl) {
          urlError.style.display = 'block';
          return;
      }

      // Extract spreadsheet ID from the URL
      const match = sheetsUrl.match(/\/d\/(.*?)([\/\?]|$)/);
      if (!match) {
          urlError.style.display = 'block';
          return;
      }

      const spreadsheetId = match[1];
      urlError.style.display = 'none';

      return spreadsheetId
    }

    // viewButton.addEventListener('click', function() {
    //     const spreadsheetId = validateGoogleSheetsInput()          
    //     window.location.href = 
    //     `results.html?id=${encodeURIComponent(spreadsheetId)}`;
    // });

    semanticButton.addEventListener('click', function() {
        console.log(`>${csvInput.value}<`)
        if (csvInput.value != "") {
            window.location.href = 'semantic-results.html'
            return
        }

      const spreadsheetId = validateGoogleSheetsInput()      
      if (spreadsheetId) {
        window.location.href = `semantic-results.html?id=${encodeURIComponent(spreadsheetId)}`;

      }    
  });

  DragAndDrop(document.querySelector('#csv-input-form'), async (files) => {
    const csvText = await files[0].text();
    csvInput.value = csvText
    localStorage.setItem('csv', csvInput.value)
  })
    

    // sheetsUrlInput.addEventListener('keypress', function(e) {
    //     if (e.key === 'Enter') {
    //         viewButton.click();
    //     }
    // });

});
