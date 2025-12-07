const express = require('express');
const router = express.Router();
const stations = require('../stationCodes.json');

// GET /api/get-station-codes?q=<query>
router.get('/get-station-codes', (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || "";
    const filtered = stations.filter(
      station =>
        station.stationName.toLowerCase().includes(query) ||
        station.stationCode.toLowerCase().includes(query) ||
        station.state.toLowerCase().includes(query)
    );
    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
