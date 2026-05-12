const express = require('express');
const app = express();

// A standard string (Should NOT be flagged)
const welcomeMessage = "Hello, welcome to the server!";

// Hardcoded AWS Key (Should be flagged by Regex)
const s3Client = new S3({ accessKeyId: "AKIAIOSFODNN7EXAMPLE" });

// Custom randomized database password (Should be flagged by Entropy > 4.5)
const dbPassword = "x9F!kLp$z2@mQv8jWc5tYb4hN1rE99zzq"; 

app.listen(3000);