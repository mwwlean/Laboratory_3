import express from "express";
import mysql from "mysql2/promise";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// Needed to resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, "public")));

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
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Student Info + Weather</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>Simple Student Information System <small>— with Weather</small></h1>
              <p class="lead">Data from your local MySQL DB and Open-Meteo current weather.</p>
            </div>
            <div class="badge">Records: ${results.length}</div>
          </header>

          <div class="card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Course</th>
                    <th>City</th>
                    <th>Current Weather</th>
                  </tr>
                </thead>
                <tbody>
    `;

    results.forEach((s) => {
      html += `
        <tr>
          <td>${s.name ?? ""}</td>
          <td>${s.age ?? ""}</td>
          <td>${s.course ?? ""}</td>
          <td>${s.city ?? ""}</td>
          <td>${s.weather ?? "N/A"}</td>
        </tr>
      `;
    });

    html += `
                </tbody>
              </table>
            </div>
          </div>

          <footer>Built with Express • Open-Meteo • ${new Date().toLocaleDateString()}</footer>
        </div>
      </body>
      </html>
    `;
    res.send(html);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
