const pool = require('../config/db');
const redisClient = require('../config/redis');

exports.getUploadedTickets = async(req,res) =>{
    let connection
    const {id} = req.user;
    try {

        const cachedData = await redisClient.get(`uploadedTickets:${id}`);
        if(cachedData){
            const tickets = JSON.parse(cachedData);

            return res.status(200).json({
                message:'tickets fetched successfully',
                tickets
            })
        }
        connection = await pool.getConnection();

        const [results] = await connection.query(
            `SELECT
                boarding_station,
                destination_station,
                departure_date,
                class,
                status
            FROM uploaded_ticket
            WHERE uploaded_by = ? LIMIT 20 OFFSET 0`,
            [id]
        )
        console.log("ticket results:",results);

        await redisClient.setEx(`uploadedTickets:${id}`,900,JSON.stringify(results));

        return res.status(200).json({
            message:'successfully fetched the uploaded tickets',
            results
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error.message);
    }finally{
        if(connection)connection.release();
    }
}

exports.uploadTicket = async(req,res) =>{
    let connection;
    const { id } = req.user;
    const { boarding_station,destination_station,departure_date,travel_class} = req.body;
    try {
        if(!boarding_station || !destination_station||!departure_date||!travel_class){
            return res.status(400).json({
                message:'All fields are required to upload ticket'
            })
        }

        connection = await pool.getConnection();

        const [result] = await connection.query(
            "INSERT INTO uploaded_ticket (uploaded_by,boarding_station,destination_station,departure_date,travel_class)VALUES(?,?,?,?,?)",
            [id,boarding_station,destination_station,departure_date,travel_class]
        )
        connection.release();

        const uplodedData = {
            uploadedBy:id,
            boarding_station,
            destination_station,
            departure_date,
            travel_class
        }

        await redisClient.setEx(`uploadedTickets:${id}`,900,JSON.stringify(uplodedData));

        return res.status(200).json({
            message:'ticket uploaded successfully'
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error.message);
    }finally{
        if(connection)connection.release();
    }
}