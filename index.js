import express from "express";
import mysql from "mysql2/promise";
import axios from "axios";

const app = express();
const PORT = 3000;

const db = await mysql.createConnection({
  host: "localhost",
  user: "root",       
  password: "",       
  database: "student" 
});

app.get("/", async (req, res) => {
  try {
    const [students] = await db.query("SELECT * FROM student");

    const results = await Promise.all(
      students.map(async (student) => {
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${student.lat}&longitude=${student.lon}&current_weather=true`;
          const { data } = await axios.get(weatherUrl);

          return {
            ...student,
            weather: `${data.current_weather.temperature}°C, Wind ${data.current_weather.windspeed} km/h`
          };
        } catch (err) {
          console.error(`Weather error for ${student.city}:`, err.message);
          return { ...student, weather: "N/A" }; 
        }
      })
    );

    let html = `
      <h1>Simple Student Information System and Integrate with Weather API</h1>
      <table border="1" cellpadding="8">
        <tr>
          <th>Name</th><th>Age</th><th>Course</th><th>City</th><th>Current Weather</th>
        </tr>
    `;

    results.forEach((s) => {
      html += `
        <tr>
          <td>${s.name}</td>
          <td>${s.age}</td>
          <td>${s.course}</td>
          <td>${s.city}</td>
          <td>${s.weather}</td>
        </tr>
      `;
    });

    html += "</table>";
    res.send(html);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
