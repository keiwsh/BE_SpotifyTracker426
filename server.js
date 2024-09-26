require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const querystring = require("querystring");

const app = express();
const port = process.env.PORT || 8888;

// Update this to your deployed Netlify app URL
const redirect_uri = "https://spotifytracker426.netlify.app/callback"; // Updated callback URL

// Enable CORS for all routes
app.use(
  cors({
    origin: "https://spotifytracker426.netlify.app", // Allow only your Netlify URL
  })
);

// Optional: Handle JSON bodies if needed
app.use(express.json());

// Spotify credentials
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Automatically redirect from the root URL to /login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Step 1: Authorization endpoint
app.get("/login", (req, res) => {
  const scope = "user-read-currently-playing user-read-playback-state";
  const auth_url =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
    });
  res.redirect(auth_url); // Redirect user to Spotify authorization
});

// Step 2: Token exchange
app.get("/callback", (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send("Authorization code missing");
  }

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    }),
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
    .then((response) => {
      const { access_token } = response.data;

      // Redirect to the frontend with the access token
      res.redirect(
        `https://spotifytracker426.netlify.app/?access_token=${access_token}`
      ); // Change to your Netlify URL
    })
    .catch((err) => {
      console.error("Error exchanging token:", err);
      res.status(500).send("Error exchanging token");
    });
});
// Step 3: Get currently playing track
app.get("/currently-playing", (req, res) => {
  const access_token = req.query.access_token;

  if (!access_token) {
    return res.status(400).send("Access token missing");
  }

  console.log(`Access token for currently playing: ${access_token}`);

  axios
    .get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    })
    .then((response) => {
      if (response.status === 204) {
        return res.status(204).send("No track currently playing");
      }

      console.log("Currently playing track:", response.data);
      res.json(response.data); // Send currently playing track info
    })
    .catch((err) => {
      console.error(
        "Error fetching currently playing track:",
        err.response ? err.response.data : err.message
      );
      res.status(500).send("Error fetching currently playing track");
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
