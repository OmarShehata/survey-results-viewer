document.addEventListener('DOMContentLoaded', function() {
    const viewButton = document.getElementById('view-button');
    const semanticButton = document.getElementById('semantic-button');

    const sheetsUrlInput = document.getElementById('sheets-url');
    const urlError = document.getElementById('url-error');

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

    viewButton.addEventListener('click', function() {
        const spreadsheetId = validateGoogleSheetsInput()          
        window.location.href = 
        `results.html?id=${encodeURIComponent(spreadsheetId)}`;
    });

    semanticButton.addEventListener('click', function() {
      const spreadsheetId = validateGoogleSheetsInput()          
      window.location.href = 
      `semantic-results.html?id=${encodeURIComponent(spreadsheetId)}`;
  });
    

    // sheetsUrlInput.addEventListener('keypress', function(e) {
    //     if (e.key === 'Enter') {
    //         viewButton.click();
    //     }
    // });

});
