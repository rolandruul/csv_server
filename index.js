const app = require('express')();
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
let results = [];

//app.use(cors());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage }).single('file');

app.get('/', (req, res) => {
    res.send('CSV Parser by Roland Ruul');
});

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {

    	if (err instanceof multer.MulterError) {
            return res.status(500).json(err);
        } else if (err) {
            return res.status(500).json(err);
        }

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {

                //  Delete file after it has been processed
                fs.unlink(req.file.path, (err) => console.error(err));

                return res.status(200).json(processData());
            
            });
    });
});

function processData() {

    let finalResult = [];

    //  Day object.. contains all info
    let Day = {
        new: true,
        start: {
            start: 0,
            end: 0,
            full: ''
        },
        end: {
            end: 0,
            full: ''
        }
    };

    //  Time between start and end date (in seconds/unix timestamp)
    let timeBetween = 0;

    results.map((row, index) => {

        let start = row.start_time.split(/\.|:| /);
        let end = row.end_time.split(/\.|:| /);

        //  Check if current row is in a new day
        Day.new = ( start[0] !== Day.end.end ) ? true : false;

        if ( Day.new || index === (results.length - 1) ) {

            //  Last row on this date
            if ( Day.end.end !== 0 ) {
                //  Days
                let days = Math.floor(timeBetween / 86400);
                timeBetween -= days;
                //  Hours
                let hours = Math.floor(timeBetween / 3600) % 24;
                timeBetween -= hours;
                //  Minutes
                let minutes = Math.floor(timeBetween / 60) % 60;

                //  Last row.. csv writing should take place in here
                //  days, hours, minutes
                console.log(Day.start.full, Day.end.full, hours + ' tundi ja ' + minutes + ' minutit', row.vehicle_registration);

                console.log('\nATTENTION! - ', row.end_time, '\n');

                let obj = {
                    start_time: Day.start.full,
                    end_time: Day.end.full,
                    vehicle: row.vehicle_registration,
                    worktime: { 
                        hh: hours,
                        mm: minutes,
                        text: hours + ' tundi ja ' + minutes + ' minutit'
                    }
                };

                finalResult.push(obj);

                timeBetween = 0;
            }

            //  First row in this date
            Day.new = true;
            Day.start.start = start;
            Day.start.end = end;
            Day.start.full = row.start_time;

            //  Log for testing
            console.log('Start date: ', row.start_time);

        } else {

            if ( timeBetween === 0 ) {
                let _start = moment(new Date(Date.UTC(Day.start.start[2], Day.start.start[1] - 1, Day.start.start[0], Day.start.start[3], Day.start.start[4]))).unix();
                let _end = moment(new Date(Date.UTC(Day.start.end[2], Day.start.end[1] - 1, Day.start.end[0], Day.start.end[3], Day.start.end[4]))).unix();
                timeBetween = _end - _start;
                console.log('Day between start and end: ', Day.start.full, Day.end.full, timeBetween);
            }

            let unix_start = moment(new Date(Date.UTC(start[2], start[1] - 1, start[0], start[3], start[4]))).unix();
            let unix_end = moment(new Date(Date.UTC(end[2], end[1] - 1, end[0], end[3], end[4]))).unix();

            timeBetween += unix_end - unix_start;

            //  Log for testing
            console.log('Day between start and end: ', row.start_time, row.end_time, timeBetween);

        }

        //  Set current day as previous
        Day.end.end = end[0];
        Day.end.full = row.end_time;

    });

    //  Empty results array
    results = [];

    return finalResult;

}

app.listen(3000, () => console.log('Server listening on port 3000'));