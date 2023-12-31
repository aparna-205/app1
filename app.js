const { createPool } = require('mysql');
const express = require('express');
const bodyParser = require('body-parser'); // Import body-parser
const app = express();
const port = 5000;
const pool = createPool({
    host: 'ingo-flee.chcwfzqnq2ii.ap-south-2.rds.amazonaws.com',
    user: 'admin',
    password: 'ingo1234',
    database: 'ingoflee',
    connectionLimit: 10
});
const fs = require('fs');
const path = require('path');

const getTableNamesQuery = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE table_schema = 'ingoflee';";
// Configure body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/getTableNames', (req, res) => {
    pool.query(getTableNamesQuery, (err, results) => {
        if (err) {
            console.error('Error fetching table names:', err);
            return res.status(500).json({ error: 'Error fetching table names' });
        }
        const tableNames = results.map((row) => row.TABLE_NAME);
        res.json({ tableNames });
    });
});

app.post('/fetch-data', (req, res) => {
    const selectedTable = req.body.table;
    const dateTimeRange = req.body.dateTimeRange;
    const [fromDateTime, toDateTime] = dateTimeRange.split(' - ');
    const fromDateTimeObj = new Date(fromDateTime);
    const toDateTimeObj = new Date(toDateTime);
    const fromDateTimeSQL = fromDateTimeObj.toISOString().slice(0, 19).replace('T', ' ');
    const toDateTimeSQL = toDateTimeObj.toISOString().slice(0, 19).replace('T', ' ');

    const fetchDataQuery = `
        SELECT * FROM ${selectedTable}
        WHERE date_time BETWEEN STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') AND STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s');
    `;


    pool.query(fetchDataQuery, [fromDateTimeObj, toDateTimeObj], (err, results) => {
        if (err) {
            console.error(`Error fetching data from ${selectedTable}:`, err);
            return res.status(500).send(`Error fetching data from ${selectedTable}`);
        }
        // Check if there are rows in the results
        if (!results || results.length === 0) {
            // Handle the case when no data is found
            const noDataHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>No Data Found</title>
                </head>
                <body>
                </br>
                </br>
                    <p>No data found for the selected date range.</p>
                </body>
                </html>
            `;
            // Send the "noDataHtml" directly if no data is found
            return res.send(noDataHtml);
        }
       
    
        const data = results;
        let totalDistance = 0;
        let onCount = 0;
        let offCount = 0;
        data.forEach((row) => {
            if (row['IGN'] === 'ON') {
                onCount++;
            } else if (row['IGN'] === 'OFF') {
                offCount++;
            }
        
        });
        console.log(data);
        const avgKmByDate = {};
        data.forEach((row)=> {
            if (row['IGN'] !== 'OM') {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentavgkm = row['Last Distance (meters)'];
                const formattedDate = currentDate.toISOString().split('T')[0];
                if (!avgKmByDate[formattedDate]) {
                    avgKmByDate[formattedDate] = [];
                }
                avgKmByDate[formattedDate].push(currentavgkm);
            }
        });

        const avgKmData = Object.keys(avgKmByDate).map((date) =>{
        const kms       = avgKmByDate[date];
        const sumKms    = kms.reduce((acc, km) => acc + km, 0);
        const averageKm = (sumKms*0.001);

        return {
            date,
            averageKm,
        };
    });
    
    
    const sumOfAverageKms = avgKmData.reduce((acc, dataPoint) => acc + dataPoint.averageKm, 0);
    const numberOfDays = avgKmData.length;
    const averageKmPerDay = (sumOfAverageKms / numberOfDays).toFixed(2);

    console.log(`Sum of all averageKm: ${sumOfAverageKms}`);
    console.log(`Number of days: ${numberOfDays}`);
    console.log(`Average Km per day: ${averageKmPerDay}`);

        const maxSpeedByDate = {};
        data.forEach((row) => {
            if (row['IGN'] === 'ON' && row['Speed'] <= 35) {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentSpeed = row['Speed'];
                        const formattedDate = currentDate.toISOString().split('T')[0];
                    if (!maxSpeedByDate[formattedDate] || currentSpeed > maxSpeedByDate[formattedDate]) {
                    maxSpeedByDate[formattedDate] = currentSpeed;
                }
            }
        });
        const maxSpeedData = Object.keys(maxSpeedByDate).map((date) => ({
            date,
            speed: maxSpeedByDate[date],
        }));
        const maxSpeedData1 = maxSpeedData;
          const maxSpeedByDate1 = {};
          
          maxSpeedData1.forEach((entry) => {
            maxSpeedByDate1[entry.date] = entry.speed;
          });
          
          const maxSpeedDataJSON1 = JSON.stringify(maxSpeedByDate1);
          const maxSpeedDataJSON = JSON.stringify(maxSpeedData);
        const avgSpeedByDate ={};
        data.forEach((row) => {
            if (row['IGN'] === 'ON' && row['Speed'] !== 0) {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentSpeed = row['Speed'];
                        const formattedDate = currentDate.toISOString().split('T')[0];
                if (!avgSpeedByDate[formattedDate]) {
                    avgSpeedByDate[formattedDate] = [];
                }
        
                // Add the current speed to the array for the current date
                avgSpeedByDate[formattedDate].push(currentSpeed);
            }
        });
            const avgSpeedData = Object.keys(avgSpeedByDate).map((date) => {
            const speeds = avgSpeedByDate[date];
            const sumSpeed = speeds.reduce((acc, speed) => acc + speed, 0);
            const averageSpeed = (sumSpeed / speeds.length).toFixed(2); // Limit to 2 decimal places
            
            return {
                date,
                averageSpeed,
            };
        });
       
        const avgSpeedDataJSON = JSON.stringify(avgSpeedData);
        const avgSpeedDataJSON1 = avgSpeedDataJSON;

        const avgSpeedDataArray = JSON.parse(avgSpeedDataJSON1); // Parse the JSON string into an array
        const avgSpeedDataObject = {};

        avgSpeedDataArray.forEach((entry) => {
        avgSpeedDataObject[entry.date] = parseFloat(entry.averageSpeed);
        });

        const avgSpeedDataMergedJSON = JSON.stringify(avgSpeedDataObject);
        const htmlTemplatePath = path.join(__dirname, 'public', 'result.html');
        fs.readFile(htmlTemplatePath, 'utf8', (err, template) => {
            if (err) {
                console.error('Error reading template file:', err);
                return res.status(500).send('Error reading template file');
            }        
                const renderedHtml = template
                .replace('{{selectedTable}}', selectedTable)
                .replace('{{fromDateTimeObj}}', fromDateTimeObj)
                .replace('{{toDateTimeObj}}', toDateTimeObj)
                .replace('{{averageKmPerDay}}', averageKmPerDay)
                .replace('{{onCount}}', onCount)
                .replace('{{offCount}}', offCount)
                .replace('{{maxSpeedDataJSON1}}',maxSpeedDataJSON1)
                .replace('{{avgSpeedDataMergedJSON}}',avgSpeedDataMergedJSON);
                res.send(renderedHtml);
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
