// server.js
// Main entry point for MeetSpace backend
// Run with: node server.js

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
