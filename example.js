const { google } = require("googleapis");

const { Collection } = require('discord.js') 
// const cron = require("node-cron");

const { JWT } = require("google-auth-library");

const keys = require("./jwt.json");

const sheets = google.sheets("v4");

const auth = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const spreadsheetId = "18tk_EXQKR9l_tRocL0vma9HxT0DERfg0tkUNGd_ATs8"; // Replace with your Google Sheet ID


// let lastProcessedRow = 0;
// let maxNewRowsToPrint = 5; // Change this value to limit the number of new rows, set to a high number or disable by setting to -1
// let newDataQueue = [];

async function fetchAndProcessData() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      // range: 'Aescripts + Aeplugins', // Replace 'Sheet1' with the name of your specific sheet
      auth,
      includeGridData: true
    });

    console.log(response.data.sheets[0].data[0].rowData[2].values)
    // if (!values) {
    //   console.log('No data found.');
    //   return;
    // }
 
    // const titleRow = values.shift(); // Assuming the first row contains titles
    // for (let i = 0; i < values.length; i++) {
    //   const rowData = values[i];
    //   if (i <= lastProcessedRow) {
    //     // Skip rows that have already been processed
    //     continue;
    //   }

    //   if (newDataQueue.length >= maxNewRowsToPrint) {
    //     const backlog = newDataQueue.shift(); // Remove the oldest row from the queue
    //     console.log('Changes to old content:');
    //     console.log(`row${backlog.row}: (${compareRows(titleRow, backlog.data, rowData).join(', ')})`);
    //   }

    //   console.log('New content added:');
    //   console.log(`row${i}: (${formatRowData(titleRow, rowData)})`);

    //   newDataQueue.push({ row: i, data: rowData });
    //   lastProcessedRow = i;
    // }
  } catch (err) {
    console.error('The API returned an error:', err);
  }
}


fetchAndProcessData();

// function compareRows(titleRow, oldRow, newRow) {
//     const changes = [];
//     for (let j = 0; j < titleRow.length; j++) {
//         const title = titleRow[j];
//         const oldData = oldRow[j];
//         const newData = newRow[j];
//         if (oldData !== newData) {
//             changes.push(`${title}: ${oldData} → ${newData}`);
//         }
//     }
//     return changes;
// }

// function formatRowData(titleRow, data) {
//     return titleRow.map((title, i) => `${title}: ${data[i]}`).join(", ");
// }

// // Schedule the task to run every 30 second
// cron.schedule("*/30 * * * * *", () => {
//   console.log('running')
//     fetchAndProcessData();
// });
