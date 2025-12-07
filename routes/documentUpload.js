// routes/documentRoute.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const upload = require("../middleware/multer"); 
const { uploadDocuments } = require("../controllers/uploadDocumentsController");

router.post(
  "/upload-documents",
  verifyToken,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },  // FIXED
    { name: "aadhar", maxCount: 1 }
  ]),
  uploadDocuments
);


module.exports = router;
