const fs = require('fs');

function generateReport(testResults, format = 'json') {
  console.log(`Generating report in ${format} format...`);
  const reportContent = JSON.stringify(testResults, null, 2);
  const fileName = `report_${Date.now()}.${format}`;
  fs.writeFileSync(fileName, reportContent);
  console.log(`Report saved to ${fileName}`);
  return fileName;
}

module.exports = { generateReport };
