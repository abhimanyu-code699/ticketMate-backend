// controllers/documentController.js
const cloudinary = require("../services/cloudinary");
const db = require("../config/db");

exports.uploadDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.log("🔴 User not found in req.user");
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    // Check if files exist
    if (!req.files || !req.files.profilePhoto || !req.files.aadhar) {
      return res
        .status(400)
        .json({ message: "Both Profile Photo & Aadhaar are required" });
    }

    const photoFile = req.files.profilePhoto[0];
    const aadharFile = req.files.aadhar[0];

    // Upload to Cloudinary
    const photoUpload = await cloudinary.uploader.upload(photoFile.path, {
      folder: "ticketmate/users",
    });
    const aadharUpload = await cloudinary.uploader.upload(aadharFile.path, {
      folder: "ticketmate/aadhar",
    });

    // Save into MySQL
    const sql = `
            INSERT INTO documents (userId, photo, aadhar)
            VALUES (?, ?, ?)
        `;
    await db.execute(sql, [
      userId,
      photoUpload.secure_url,
      aadharUpload.secure_url,
    ]);

    return res.status(200).json({
      message: "Documents uploaded successfully",
      photoUrl: photoUpload.secure_url,
      aadharUrl: aadharUpload.secure_url,
    });
  } catch (error) {
    console.log("Upload Error:", error);
    return res
      .status(500)
      .json({ message: "Document upload failed", error: error.message });
  }
};
