# Spotify Tools

This repo contains a fullstack web application that reimplements the features of the original [SpotifyTools CLI](https://github.com/Rohpat419/SpotifyTools-CLI). 

**[Try the app here](https://spotify-tools-xi.vercel.app/)**

## Features
- **Duplicate song finder** for playlists
- **Duplicate song deleter** for playlists  
- **Explicit content filter** that allows you to automatically remove explicit songs from a playlist or create a new 'clean' playlist
- **Top N Tracks/Artists** for a time horizon of your choosing (last month, last 6 months, all time)

## Hosting
- **Frontend:** Hosted on Vercel → [Live App](https://spotify-tools-xi.vercel.app/)
- **Backend:** Hosted on Render → [Health Check](https://spotify-tools-eozl.onrender.com/api/debug/ping)

## Future Steps: 

### UX Improvements

Allow users to choose which duplicate songs to delete instead of deleting all duplicates. This would require an interactive frontend component. 

The Duplicate Deletion tab COULD be replaced by a Duplicate Checker tab with better UX. The user is shown the duplicates and is given a flow to delete the duplicates of their choosing. 

Give users the option to input their own "banned words" list to extend the functionality of the explicit content filter.

Light / dark mode toggle for the frontend. Every developer's favorite feature.

Handle edge cases better and give better responses to the user. Right now any error on the server side is returned as a 500 without context, which is bad UX. Sometimes the API call to Spotify fails, sometimes it's actually a backend logic error, sometimes the user just needs to refresh—they'll never know which.

Fetching a user's playlists and letting them choose which one to filter for explicit content or find duplicates in. Right now, the user has to input the playlist ID manually. This would display playlists on the frontend, then they would choose the playlist and what tool to apply. 



### New Features

Incorporate more user analytics (other than just Top N Tracks/Artists for a time horizon) but this would require the user to download and upload their data. Since the Spotify Web API does not give an endpoint for this data. 

Build an email notification system to alert users when followed artists release new music (Spotify’s own system is biased toward popular artists).

Multi-user support. Right now, the Backend only supports one user since the refresh token is stored in a file on the server. This would require a database to store per-user refresh tokens with some way to tie them to a user identity (email, username, browser session, etc).

Allow users to prompt an AI to suggest a song/playlist/artist that fits a certain vibe based on the music they already listen to. This would be very difficult since Spotify does not allow developers to send data returned by the Web API to any AI models for ingestion as they may be trained on that data ([Spotify Developer Terms, Section IV: Restrictions](https://developer.spotify.com/terms#section-iv-restrictions)).
The solution to this would be a local GPT model which is quite a bit of work to prepare, train, and host. 

### Misc

Conduct a security review of the entire system, patch accordingly. Testing different strings in the input boxes. Seeing if secrets or tokens get leaked at any point. 

Tackle transient server failures with the Spotify Web API, using retries after a review of the backend code. Once the backend code is bulletproof, I can narrow down that the issue is with the Spotify Web API. The first step is to crack down on the OAuth flow since that is the most fragile part of the system.

## Challenges and Lessons Learned: 
**Spotify OAuth:** The Spotify OAuth flow is a pain. On both the Backend and Frontend. Dealing with the success page on the frontend and the OAuth flow on the Backend was challenging. AI did not do the best here and it took multiple shots and debugging sessions to get this right (more on this later).

**Lack of staging server:** Without a staging server, testing the code was difficult and caused a lot of code pushes instead of local development. This was a bad idea for a project that kept getting iterated on. Having a staging server to see how my code would act in prod without waiting for a deploy would be faster and more aligned with industry practices.

**AI thoughts (and more OAuth):** AI is really good with code that is readily available on the internet, but can struggle with the finer details. This came up while deploying the backend to render, and getting the Spotify OAuth flow working just right. 
- Render issues: AI did not know how to structure the render.yaml to fit my project needs. From having the backend in the backend folder (GPT-5 really wanted everything in the repo root) to environment variable management on render.com to trying to set up Postgres. GPT-5 was fairly unhelpful here. 
- OAuth issues: The Spotify OAuth flow has been a thorn in my side ever since this project's first iteration a few years ago. From the redirect uri to the enforced success page, there were difficulties everywhere. Testing the POC was difficult, getting things right was difficult because of how strict Spotify is (like 127.0.0.1 is ok in dev but not localhost???) .
- More OAuth issues: Converting to prod was also difficult since now there needed to be a redirect to a page on a frontend on a successful authentication, I couldn't just take the token and continue normally. The auth flow is still finicky like you can't hit the auth flow from the same browser in succession (within like a minute) or else Spotify will throw an error. 
- All the while, AI (GPT-5) didn't know the fixes for what I was dealing with since the Spotify error messages could mean many different errors (for example: "Invalid URL" being returned after signing in to Spotify).  It comes down to training data and the Spotify OAuth flow specifically is fairly niche so it makes sense that GPT-5 struggled with it. 

**Logging:** Logging is a developer's best friend. I think the less logging I had when dealing with an OAuth issue, the longer it took to debug. Adding more logging statements and try/except blocks were extremely important in debugging the errors. Otherwise, the errors were ridiculously opaque. 
