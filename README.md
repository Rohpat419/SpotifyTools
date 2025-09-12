# Spotify Tools

This repo contains a fullstack web application that reimplements the features of the original [SpotifyTools CLI](https://github.com/Rohpat419/SpotifyTools-CLI). 

It contains: 
- Duplicate song finder for playlists
- Duplicate song deleter for playlists
- Explicit content filter that allows you to automatically remove explicit songs from a playlist or create a new 'clean' playlist
- Top n tracks/artists for a time horizon of your choosing (last month, last 6 months, all time)

## Hosting
The frontend is hosted on Vercel [here](https://spotify-tools-xi.vercel.app/). 
And the backend is hosted on render.com [here for /ping api](https://spotify-tools-eozl.onrender.com/api/debug/ping).

## Future Steps: 

Conduct a security review of the entire system, patch accordingly. Testing different strings in the input boxes. Seeing if secrets or tokens get leaked ever. 

Incorporate more user analytics (other than just top n tracks/artists for a time horizon) but this would require the user to download and upload their data. Since the Spotify Web API does not give an endpoint for this data. 

Have an email notification system for users to be notified if an artist they follow has released new music or been featured in a song. Currently the Spotify notification system is a bit biased and does not reliably notify you if an artist you follow released music if that artist is not popular. 

Allow users to prompt an AI to suggest a song/playlist/artist that fits a certain vibe based on the music they already listen to. This would be very difficult since Spotify does not allow developers to send data returned by the Web API to any AI models for ingestion as they may be trained on that data ([Spotify Developer Terms, Section IV: Restrictions](https://developer.spotify.com/terms#section-iv-restrictions)).
The solution to this would be a local GPT model which is quite a bit of work to prepare, train, and host. 

&nbsp;
## Challenges and Lessons Learned: 
The spotify OAuth flow is a pain. On both the backend and frontend. Dealing with the success page on the frontend and dealing with the OAuth flow on the backend was a pain.  AI did not do the best here and it took multiple shots and debugging sessions to get this right (more on this later). 

Without a staging server, testing the code was difficult and caused a lot of code pushes instead of local development. This was a bad idea for a project that kept getting iterated on. 
Having a staging server to see how my code would act in prod without waiting for a production deploy would be faster and more aligned to industry practices. 

AI is really good with code that is readily available on the internet, but can struggle with the finer details. This came up while deploying the backend to render, and getting the Spotify OAuth flow working just right. 
- Render issues: AI did not know how to structure the render.yaml to fit my project exactly with the backend existing in the backend folder. Instead constantly
asking me if my render.yaml was in my backend/ folder (it was). 
- OAuth issues: The Spotify OAuth flow has been a thorn in my side ever since this project's first iteration a few years ago. From the redirect uri to the success page, there were difficulties everywhere. Testing the POC was difficult, getting things right was difficult because for some reason Spotify is ok with 127.0.0.1 but not localhost, remembering to update the Spotify developer dashboard whenever I wanted to try a different URL.
- More OAuth issues: Converting to prod was also difficult since now there needed to be a redirect to a page on a frontend on a successful authentication, I couldn't just take the token and give the user no feedback on what just happened. 
- All the while, AI (GPT-5) didn't know the fixes for what I was dealing with since the Spotify error messages could mean many different errors (for example: "Invalid URL" being returned after signing in to Spotify).  It comes down to training data and the Spotify OAuth flow specifically is fairly niche so it makes sense that GPT-5 struggled with it. 

Logging is a developer's best friend. I think the less logging I had when dealing with an OAuth issue, the longer it took to debug. Adding more logging statements and try/except blocks were extremely important in debugging the errors. Or else the errors would be ridiculously opaque. 

