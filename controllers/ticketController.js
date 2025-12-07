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
        const userId = req.user.id; // assuming auth middleware sets req.user

        connection = await pool.getConnection();

        // Fetch uploaded tickets
        const [uploadedTickets] = await connection.query(
            `SELECT 
                id,
                boarding_station,
                destination_station,
                departure_date,
                travel_class,
                status,
                'uploaded' AS type
            FROM uploaded_ticket
            WHERE uploaded_by = ?
            ORDER BY id DESC`,
            [userId]
        );

        // Fetch get tickets
        const [getTickets] = await connection.query(
            `SELECT 
                id,
                boarding_station,
                destination_station,
                departure_date,
                travel_class,
                status,
                'get_ticket' AS type
            FROM get_ticket
            WHERE userId = ?
            ORDER BY id DESC`,
            [userId]
        );

        // Merge both arrays
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
        const id = req.user.id;
        const { boarding_station, destination_station, departure_date, travel_class } = req.body;

        if (!boarding_station || !destination_station || !departure_date || !travel_class) {
            return res.status(400).json({ message: "All fields are required" });
        }

        connection = await pool.getConnection();

        // Check if ticket exists in get_ticket table
        const [rows] = await connection.query(
            `SELECT id, boarding_station, destination_station, departure_date, travel_class, status 
             FROM get_ticket
             WHERE boarding_station = ? 
               AND destination_station = ? 
               AND departure_date = ? 
               AND travel_class = ?`,
            [boarding_station, destination_station, departure_date, travel_class]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Get Ticket not found" });
        }

        const ticket = rows[0];

        // Update status to 'found' if not already
        if (ticket.status !== "found") {
            await connection.query(
                `UPDATE get_ticket SET status = ? WHERE id = ?`,
                ["found", ticket.id]
            );
            ticket.status = "found"; // update local object
        }

        return res.status(200).json({
            message: "Ticket status updated successfully",
            ticket
        });

    } catch (error) {
        console.error("Update Get Ticket Status Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};

exports.updateUploadedTicketStatus = async (req, res) => {
    let connection;
    try {
        const { boarding_station, destination_station, departure_date, travel_class } = req.body;

        if (!boarding_station || !destination_station || !departure_date || !travel_class) {
            return res.status(400).json({ message: "All fields are required" });
        }

        connection = await pool.getConnection();

        // Check if ticket exists in uploaded_ticket table
        const [rows] = await connection.query(
            `SELECT t.id, t.boarding_station, t.destination_station, t.departure_date, t.travel_class, t.status, u.name, u.phone_number
             FROM uploaded_ticket t
             JOIN users u ON t.uploaded_by = u.id
             WHERE t.boarding_station = ? 
               AND t.destination_station = ? 
               AND t.departure_date = ? 
               AND t.travel_class = ?`,
            [boarding_station, destination_station, departure_date, travel_class]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Uploaded ticket not found" });
        }

        const ticket = rows[0];

        // Update status to 'found' if not already
        if (ticket.status !== "found") {
            await connection.query(
                `UPDATE uploaded_ticket SET status = ? WHERE id = ?`,
                ["found", ticket.id]
            );
            ticket.status = "found"; // update local object
        }

        // Return ticket info along with user details
        return res.status(200).json({
            message: "Uploaded ticket found and status updated",
            ticket: {
                id: ticket.id,
                boarding_station: ticket.boarding_station,
                destination_station: ticket.destination_station,
                departure_date: ticket.departure_date,
                travel_class: ticket.travel_class,
                status: ticket.status,
                user_name: ticket.name,
                user_phone: ticket.phone_number
            }
        });

    } catch (error) {
        console.error("Update Uploaded Ticket Status Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};
