import express from "express";
import { createClient } from "redis";
import fetch from "node-fetch";

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;
const client = createClient(REDIS_PORT);
client.on("error", (err) => console.log("Redis Client Error", err));
await client.connect();

// Set Response
function setResponse(username, repos) {
  return `<h2> ${username} has ${repos} Github  repos</h2>`;
}

async function getRepos(req, res, next) {
  console.log("I am in getRepos function");
  try {
    console.log("Fetching Data...");
    const { username } = req.params;
    console.log(username);
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;
    // set data to Redis
    client.set(username, repos, { EX: 3600, NX: true });
    res.send(setResponse(username, repos));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// cache middleware
async function cache(req, res, next) {
  console.log("I am in cache function");
  const { username } = req.params;
  client.get(username, (err, data) => {
    if (err) throw err;
    if (data !== null) {
      console.log(data);
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });

  const cacheData = await client.get(username);
  if (cacheData !== null) {
    res.send(setResponse(username, cacheData));
  } else {
    next();
  }
}

const app = express();
app.get("/repos/:username", cache, getRepos);

app.listen(5000, () => {
  console.log(`App listening on port ${PORT}`);
});
