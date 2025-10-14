const pool = require('../config/db');
const redisClient = require('../config/redis');
const { sendMail } = require('../utils/sendMail');

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
    const { id,email } = req.user;
    const { boarding_station,destination_station,departure_date,travel_class} = req.body;
    try {
        if(!boarding_station || !destination_station||!departure_date||!travel_class){
            return res.status(400).json({
                message:'All fields are required to upload ticket'
            })
        }
        //checking on cache is there any ticket has been requested
        const cachedTicket = await redisClient.get(`requestedTicket:${boarding_station}:${destination_station}:${departure_date}:${travel_class}`);
        if(cachedTicket){
            const userData = JSON.parse(cachedTicket);

            const url = `http://frontend_url/rediect to another page`;
            //send mail to users who requested for this ticket
            await sendMail(
                userData.email,
                "Your Ticket Request has been matched",
                "ticketFoundTemplate",
                {url}
            );

        }
        connection = await pool.getConnection();

        const [row] = await connection.query(
            "INSERT INTO uploaded_ticket (uploaded_by,boarding_station,destination_station,departure_date,travel_class)VALUES(?,?,?,?,?)",
            [id,boarding_station,destination_station,departure_date,travel_class]
        )

        //cache ticket onto redis
        const ticketKey = `ticket:${boarding_station}:${destination_station}:${departure_date}:${travel_class}`;
        await redisClient.setEx(ticketKey,86400,JSON.stringify({uploaded_by:id}));

        //checking if anyone requested this ticket before
        const [pendingRequests] = await connection.query(
            `SELECT 
                gt.id,
                gt.userId,
                gt.status,
                u.email AS ticket_request_userId
            FROM get_ticket gt
            JOIN users u ON gt.userId = u.id
            WHERE boarding_station = ?
            AND destination_station = ?
            AND departure_date = ?
            AND travel_class = ?`,
            [boarding_station,destination_station,departure_date,travel_class]
        )
        if(pendingRequests.length>0){
            
            //send mail notification to the user who requested for ticket
            
        }

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

exports.getTicket = async(req,res) =>{
    let connection
    const {id,email} = req.user;
    const {boarding_station,destination_station,departure_date,travel_class } = req.body;
    try {
         if(!boarding_station || !destination_station||!departure_date||!travel_class){
            return res.status(400).json({
                message:'All fields are required to upload ticket'
            })
        }
        //store requested ticket list on cache
        const ticketKey = `requestedTicket:${boarding_station}:${destination_station}:${departure_date}:${travel_class}`;
        await redisClient.setEx(ticketKey,900,JSON.stringify({userId:id.email}));
        //first checking in cache wether the ticket exists or not
       const cachedTicket = await redisClient.get(`ticket:${boarding_station}:${destination_station}:${departure_date}:${travel_class}`);
       if(cachedTicket){
        //send the notification to the user who raised the ticket req
        const url = `http://frontend_url/redirect-to-page`
        await sendMail(
            email,
            "Your Ticket Request has Matched",
            "ticketFoundTemplate",
            {url}
        );
        //save on database also(get_ticket table)
        connection = await pool.getConnection();

        await connection.query(
            "INSERT INTO get_ticket (userId,boarding_station,destination_station,departure_date,travel_class) VALUES(?,?,?,?,?)",
            [id,boarding_station,destination_station,departure_date,travel_class]
        );
        connection.release();
        return res.status(200).json({
            message:'Ticket matched successfully and also stored on database'
        });
       }
        connection = await pool.getConnection();

        const [result] = await connection.query(
            `INSERT INTO get_ticket(userId,boarding_station,destination_station,departure_date,travel_class) VALUES(?,?,?,?,?)`,
            [id,boarding_station,destination_station,departure_date,travel_class]
        )
        //check in the db(upload_ticket table)
        const [row] = await connection.query(
            `SELECT
                uploaded_by,
                status
            FROM uploaded_ticket
            WHERE 
            boarding_station = ?
            AND destination_station = ?
            AND departure_date = ?
            AND travel_class = ?`,
            [boarding_station,destination_station,departure_date,travel_class]
        );
        return res.status(200).json({
            message:'ticket found successfully',
            row
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error.message);
    }finally{
        if(connection)connection.release();
    }
}