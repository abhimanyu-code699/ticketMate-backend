const pool = require('../config/db');
const { sendMail } = require('../utils/sendMail');
const cloudinary = require("../services/cloudinary");


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

exports.uploadTicket = async (req, res) => {
  let connection;

  try {
    const userId = req.user.id;

    const {
      boarding_station,
      destination_station,
      departure_date,
      travel_class
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Ticket image is required" });
    }

    // Upload ticket image to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "tickets",
      resource_type: "auto",
    });

    const ticket_url = cloudinaryResponse.secure_url;

    // Get MySQL connection
    connection = await pool.getConnection();

    const sql = `
      INSERT INTO uploaded_ticket 
      (uploaded_by, boarding_station, destination_station, departure_date, travel_class, ticket_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.query(sql, [
      userId,
      boarding_station,
      destination_station,
      departure_date,
      travel_class,
      ticket_url,
    ]);

    return res.status(201).json({
      message: "Ticket uploaded successfully",
      ticketId: result.insertId,
      ticket_url,
    });

  } catch (err) {
    console.error("Upload Ticket Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};


exports.getTicket = async (req, res) => {
    let connection;

    try {
        const userId = req.user.id;
        const {
            boarding_station,
            destination_station,
            departure_date,
            travel_class
        } = req.body;

        // Validate required fields
        if (!boarding_station || !destination_station || !departure_date || !travel_class) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        connection = await pool.getConnection();

        // ⭐ 1. SAVE USER REQUEST IN get_ticket TABLE
        await connection.query(
            "INSERT INTO get_ticket (userId, boarding_station, destination_station, departure_date, travel_class) VALUES (?, ?, ?, ?, ?)",
            [userId, boarding_station, destination_station, departure_date, travel_class]
        );

        // ⭐ 2. CHECK IN uploaded_ticket TABLE FOR MATCHING TICKET
        const [rows] = await connection.query(
            `SELECT 
                id,
                uploaded_by,
                boarding_station,
                destination_station,
                departure_date,
                travel_class,
                ticket_url,
                status
            FROM uploaded_ticket
            WHERE 
                boarding_station = ? AND
                destination_station = ? AND
                departure_date = ? AND
                travel_class = ?
            ORDER BY id DESC
            LIMIT 1`,
            [boarding_station, destination_station, departure_date, travel_class]
        );

        // ⭐ 3. If NOT FOUND → Return Not Found
        if (rows.length === 0) {
            return res.status(202).json({
                message: "Ticket Not Found. Please check History page regularly"
            });
        }

        // ⭐ 4. If FOUND → Return Ticket
        return res.status(200).json({
            message: "Ticket Found Successfully",
            ticket: rows[0]
        });

    } catch (error) {
        console.error("Get Ticket Error:", error);
        return res.status(500).json({
            error: "Internal Server Error"
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.ticketHistory = async (req, res) => {
    let connection;

    try {
        const userId = req.user.id;

        connection = await pool.getConnection();

        // Fetch uploaded tickets with formatted date (string)
        const [uploadedTickets] = await connection.query(
            `SELECT 
                id,
                boarding_station,
                destination_station,
                DATE_FORMAT(departure_date, '%Y-%m-%d') AS departure_date,
                travel_class,
                status,
                'uploaded' AS type
            FROM uploaded_ticket
            WHERE uploaded_by = ?
            ORDER BY id DESC`,
            [userId]
        );

        // Fetch get tickets with formatted date
        const [getTickets] = await connection.query(
            `SELECT 
                id,
                boarding_station,
                destination_station,
                DATE_FORMAT(departure_date, '%Y-%m-%d') AS departure_date,
                travel_class,
                status,
                'get_ticket' AS type
            FROM get_ticket
            WHERE userId = ?
            ORDER BY id DESC`,
            [userId]
        );

        // Merge arrays
        const history = [...uploadedTickets, ...getTickets];

        res.status(200).json({ history });

    } catch (error) {
        console.error("Ticket History Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};


exports.updateUploadedTicketStatus = async (req, res) => {
    let connection;
    try {
        const loggedInUserId = req.user.id; // logged-in user ID
        const { ticket_id, boarding_station, destination_station, departure_date, travel_class } = req.body;

        if (!ticket_id || !boarding_station || !destination_station || !departure_date || !travel_class) {
            return res.status(400).json({ message: "All fields are required" });
        }

        console.log("ticketid",ticket_id);
        // Convert "2025-12-08T18:30:00.000Z" → "2025-12-08"
        const date = departure_date.split("T")[0];

        connection = await pool.getConnection();

        // ---- 1️⃣ Find matching ticket in get_ticket ----
        const [rows] = await connection.query(
            `SELECT id, userId, boarding_station, destination_station, departure_date, travel_class, status 
             FROM get_ticket
             WHERE boarding_station = ? 
               AND destination_station = ? 
               AND departure_date = ? 
               AND travel_class = ?`,
            [boarding_station, destination_station, date, travel_class]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Get Ticket not found" });
        }

        const ticket = rows[0];

        const [user] = await connection.query(
            `SELECT name, phone FROM users WHERE id = ?`,
            [ticket.userId]
        );

        const userDetails = user.length > 0 ? user[0] : null;

        // ---- 3️⃣ Update status in both tables if not already 'found' ----
        if (ticket.status !== "found") {
            // Update get_ticket
            await connection.query(
                `UPDATE get_ticket SET status = 'found' WHERE id = ?`,
                [ticket.id]
            );

            // Update uploaded_ticket using ticket_id from frontend
            await connection.query(
                `UPDATE uploaded_ticket SET status = 'found' WHERE id = ?`,
                [ticket_id]
            );

            // Update local object for response
            ticket.status = "found";
        }

        // ---- 4️⃣ Fetch updated get_ticket for response ----
        const [updatedTicketRows] = await connection.query(
            `SELECT * FROM get_ticket WHERE id = ?`,
            [ticket.id]
        );

        const updatedTicket = updatedTicketRows[0];

        return res.status(200).json({
            message: "Ticket status updated successfully",
            ticket: updatedTicket,
            user: userDetails
        });

    } catch (error) {
        console.error("Update Uploaded Ticket Status Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};

exports.updateGetTicketStatus = async (req, res) => {
    let connection;

    try {
        const { ticket_id, boarding_station, destination_station, departure_date, travel_class } = req.body;

        // Validate fields
        if (!boarding_station || !destination_station || !departure_date || !travel_class) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Convert timestamp "2025-12-08T18:30:00.000Z" → "2025-12-08"
        const date = departure_date.split("T")[0];

        connection = await pool.getConnection();

        // 1️⃣ FIND MATCHING uploaded_ticket
        const [uploadedRows] = await connection.query(
            `SELECT 
                ut.id,
                ut.uploaded_by,
                ut.boarding_station,
                ut.destination_station,
                ut.departure_date,
                ut.travel_class,
                ut.status,
                u.name,
                u.phone
            FROM uploaded_ticket ut
            JOIN users u ON ut.uploaded_by = u.id
            WHERE 
                ut.boarding_station = ?
                AND ut.destination_station = ?
                AND ut.departure_date = ?
                AND ut.travel_class = ?`,
            [boarding_station, destination_station, date, travel_class]
        );

        if (uploadedRows.length === 0) {
            return res.status(404).json({ message: "Matching Uploaded Ticket Not Found" });
        }

        const uploadedTicket = uploadedRows[0];

        // 2️⃣ UPDATE uploaded_ticket STATUS → completed
        if (uploadedTicket.status !== "completed") {
            await connection.query(
                `UPDATE uploaded_ticket 
                 SET status = 'completed' 
                 WHERE id = ?`,
                [uploadedTicket.id]
            );
        }

        // 3️⃣ UPDATE get_ticket STATUS → found/completed
        // (ticket_id is passed from frontend)
        await connection.query(
            `UPDATE get_ticket 
             SET status = 'found' 
             WHERE id = ?`,
            [ticket_id]
        );

        // 4️⃣ FETCH UPDATED TICKET FOR RESPONSE
        const [updatedUploaded] = await connection.query(
            `SELECT 
                ut.id,
                ut.boarding_station,
                ut.destination_station,
                ut.departure_date,
                ut.travel_class,
                ut.status,
                u.name,
                u.phone
             FROM uploaded_ticket ut
             JOIN users u ON ut.uploaded_by = u.id
             WHERE ut.id = ?`,
            [uploadedTicket.id]
        );

        return res.status(200).json({
            message: "Ticket status updated in both tables successfully",
            ticket: updatedUploaded[0]
        });

    } catch (error) {
        console.error("Update Get Ticket Status Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};


